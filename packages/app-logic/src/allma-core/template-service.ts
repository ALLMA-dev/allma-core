import Handlebars from 'handlebars';
import { JSONPath } from 'jsonpath-plus';
import { MappingEvent, MappingEventStatus, MappingEventType, TemplateContextMappingItem, isS3OutputPointerWrapper } from '@allma/core-types';
import {
  log_debug,
  log_warn,
  hydrateInputFromS3Pointers,
  resolveS3PointerCached,
  deepMerge,
  isObject,
  type S3HydrationCache,
} from '@allma/core-sdk';
import { getSmartValueByJsonPath } from './data-mapper.js'; // Import the smart resolver

/**
 * A secure, sandboxed templating service for the ALLMA platform.
 * It's a pure renderer; context must be built by the caller.
 */
export class TemplateService {
  private static instance: TemplateService;
  private handlebars: typeof Handlebars;

  private constructor() {
    this.handlebars = Handlebars.create(); // Create an isolated instance
    this.registerHelpers();
  }

  /**
   * Get the singleton instance of the TemplateService.
   */
  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Renders a template string with the provided context.
   * This method is now S3-aware, automatically resolving S3 pointers in the context
   * before passing it to the Handlebars engine. It always returns a string.
   *
   * @param template The Handlebars template string.
   * @param context A pre-built context object with data for the template.
   * @param correlationId Optional correlation ID for logging during hydration.
   * @returns A promise that resolves to the rendered string.
   */
    public async render(
        template: string,
        context: Record<string, any>,
        correlationId?: string,
        cache?: S3HydrationCache,
    ): Promise<string> {
        // Handlebars is synchronous, so any S3 pointers referenced by the template must be resolved
        // up front. The naive approach — hydrating the *entire* context — is catastrophic when the
        // context carries offloaded payloads it doesn't reference (e.g. a sub-flow return whose
        // fields were offloaded to S3): rendering a one-token template like an ARN would pull every
        // offloaded blob back into memory at once, defeating the offloading and risking OutOfMemory.
        //
        // Instead we statically inspect the template and hydrate only the pointers it actually
        // references, leaving unreferenced offloaded branches as pointers. We fall back to full
        // hydration only for constructs whose data dependencies can't be resolved statically.
        const hydrationCache: S3HydrationCache = cache ?? new Map();
        const { paths, needsFullContext } = this.analyzeTemplatePaths(template);
        const hydratedContext = needsFullContext
            ? await hydrateInputFromS3Pointers(context, correlationId, hydrationCache)
            : await this.hydrateReferencedPaths(context, paths, hydrationCache, correlationId);

        const compiledTemplate = this.handlebars.compile(template, {
            noEscape: true, // We are not generating HTML, so we don't need escaping.
            strict: false,  // Be lenient with missing properties, they'll just be empty.
        });

        const result = compiledTemplate(hydratedContext);

        // Ensure the final output is always a string. If Handlebars returns an object
        // (e.g., from a template like `{{myObject}}`), stringify it.
        if (typeof result === 'object' && result !== null) {
            return JSON.stringify(result);
        }
        
        // Coerce other types (number, boolean) to string, which is the expected behavior.
        return String(result ?? '');
    }

    /**
     * Statically inspects a Handlebars template to determine which context paths it references.
     *
     * Returns the concrete top-level paths the template reads (so the caller can hydrate only those
     * S3 pointers) and a `needsFullContext` flag. The flag is set — meaning the caller must fall
     * back to hydrating the whole context — whenever the template uses a construct whose data
     * dependencies can't be resolved statically: block helpers (`#each`/`#with`/…) that rebind the
     * inner scope, parent-context references (`../`), `@root`, a bare `this`/`.`, partials, or any
     * node type we don't explicitly understand. This keeps the optimization strictly correctness-
     * preserving: in the worst case we hydrate exactly as much as the previous implementation did.
     */
    private analyzeTemplatePaths(template: string): { paths: string[][]; needsFullContext: boolean } {
        const paths: string[][] = [];
        const state = { needsFullContext: false };

        let ast: hbs.AST.Program;
        try {
            ast = this.handlebars.parse(template);
        } catch {
            // Malformed template: compile() will surface the error. Hydrate fully to be safe.
            return { paths: [], needsFullContext: true };
        }

        const recordPath = (path: hbs.AST.PathExpression): void => {
            if (path.data) {
                // `@`-variable. Only `@root` reaches the whole context; loop metadata (`@index`,
                // `@key`, `@first`, …) carries no context data dependency.
                if (path.parts[0] === 'root') state.needsFullContext = true;
                return;
            }
            if ((path.depth ?? 0) > 0) {
                // `../` parent-scope reference — not statically resolvable to an absolute path.
                state.needsFullContext = true;
                return;
            }
            if (!path.parts || path.parts.length === 0) {
                // Bare `this` / `.` — references the entire current scope.
                state.needsFullContext = true;
                return;
            }
            paths.push(path.parts);
        };

        const walkExpression = (expr: hbs.AST.Expression | undefined): void => {
            if (!expr) return;
            if (expr.type === 'PathExpression') {
                recordPath(expr as hbs.AST.PathExpression);
            } else if (expr.type === 'SubExpression') {
                walkCall(expr as hbs.AST.SubExpression);
            }
            // Literals carry no data dependency.
        };

        const walkCall = (node: hbs.AST.MustacheStatement | hbs.AST.SubExpression): void => {
            const hasArgs =
                (node.params && node.params.length > 0) ||
                (node.hash && node.hash.pairs && node.hash.pairs.length > 0);
            if (hasArgs) {
                // A helper invocation: `node.path` is the helper *name*, not a data path. Its data
                // dependencies live in the params and hash values.
                for (const param of node.params) walkExpression(param);
                if (node.hash) for (const pair of node.hash.pairs) walkExpression(pair.value);
            } else {
                // Plain interpolation `{{a.b.c}}`: `node.path` is the data path itself.
                walkExpression(node.path);
            }
        };

        const walkStatement = (node: hbs.AST.Statement | hbs.AST.Program): void => {
            switch (node.type) {
                case 'Program':
                    for (const stmt of (node as hbs.AST.Program).body) walkStatement(stmt);
                    break;
                case 'ContentStatement':
                case 'CommentStatement':
                    break;
                case 'MustacheStatement':
                    walkCall(node as hbs.AST.MustacheStatement);
                    break;
                case 'BlockStatement':
                    // Block helpers rebind the inner scope, so references inside the block body
                    // can't be mapped back to absolute context paths. Be conservative.
                    state.needsFullContext = true;
                    break;
                default:
                    // Partials, decorators, and anything unrecognized: hydrate fully.
                    state.needsFullContext = true;
            }
        };

        walkStatement(ast);
        return { paths, needsFullContext: state.needsFullContext };
    }

    /**
     * Produces a context in which S3 pointers along/under the given referenced paths are resolved,
     * while every unreferenced branch is passed through untouched (its pointers are never
     * downloaded). Intermediate objects are shallow-cloned so the caller's context is never mutated.
     */
    private async hydrateReferencedPaths(
        context: Record<string, any>,
        paths: string[][],
        cache: S3HydrationCache,
        correlationId?: string,
    ): Promise<Record<string, any>> {
        // Each pass returns a fresh top-level clone with one referenced path hydrated, carrying the
        // previously-hydrated branches forward by reference. Shared path prefixes are simply
        // re-cloned (cheap) and the pointer cache guarantees no blob is fetched twice.
        let result: any = context;
        for (const parts of paths) {
            result = await this.hydrateNodeAtPath(result, parts, cache, correlationId);
        }
        return result;
    }

    /**
     * Walks `node` along `parts`, resolving S3 pointers encountered en route, and fully hydrates the
     * subtree at the target. Returns a shallow-cloned copy along the traversed path; sibling branches
     * are preserved by reference so their pointers stay unresolved.
     */
    private async hydrateNodeAtPath(
        node: any,
        parts: string[],
        cache: S3HydrationCache,
        correlationId?: string,
    ): Promise<any> {
        // A pointer at this level must be resolved before we can descend (or to become the target).
        if (isS3OutputPointerWrapper(node)) {
            const resolved = await resolveS3PointerCached(node._s3_output_pointer, correlationId, cache);
            const { _s3_output_pointer, ...otherKeys } = node;
            if (Object.keys(otherKeys).length === 0) {
                node = resolved;
            } else {
                const hydratedOther = await hydrateInputFromS3Pointers(otherKeys, correlationId, cache);
                node = isObject(resolved) ? deepMerge(resolved, hydratedOther) : { content: resolved, ...hydratedOther };
            }
        }

        if (parts.length === 0) {
            // Target reached: hydrate everything beneath it (the template may read the whole subtree).
            return hydrateInputFromS3Pointers(node, correlationId, cache);
        }

        const [head, ...rest] = parts;

        if (Array.isArray(node)) {
            const index = Number(head);
            if (Number.isInteger(index) && index >= 0 && index < node.length) {
                const clone = [...node];
                clone[index] = await this.hydrateNodeAtPath(node[index], rest, cache, correlationId);
                return clone;
            }
            // A non-numeric segment against an array (e.g. `items.name` used loosely): the referenced
            // property may exist on any element, so descend into each.
            return Promise.all(node.map(item => this.hydrateNodeAtPath(item, parts, cache, correlationId)));
        }

        if (isObject(node) && Object.prototype.hasOwnProperty.call(node, head)) {
            const clone = { ...node };
            clone[head] = await this.hydrateNodeAtPath(node[head], rest, cache, correlationId);
            return clone;
        }

        // Referenced key is absent (or node is a primitive): nothing to hydrate.
        return node;
    }

  /**
   * Registers all custom ALLMA helpers to make Handlebars more powerful.
   */
  private registerHelpers(): void {
    // Helper to stringify an object/array into a JSON string.
    // Usage: {{json my_object}}
    this.handlebars.registerHelper('json', (context: any) => {
        if (context === undefined || context === null) return 'null';
        if (typeof context === 'string') return context;
        // Using 0 for compact JSON in prompts, 2 for readable logs
        return JSON.stringify(context, null, 0); 
    });

    // Helper to slice an array.
    // Usage: {{#each (slice messages -5)}} -> gets last 5 messages
    this.handlebars.registerHelper('slice', (array: any[], start: number, end?: number) => {
        if (!Array.isArray(array)) return [];
        return array.slice(start, end);
    });

    // Helper for basic conditional logic.
    // Usage: {{#if (eq status 'COMPLETED')}}...{{/if}}
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('neq', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);

    // Helper to provide a default value if a variable is undefined or null.
    // Usage: {{default name "Guest"}}
    this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return (value !== null && value !== undefined) ? value : defaultValue;
    });

    // Helper to encode a string in Base64
    // Usage: {{base64 "user:pass"}}
    this.handlebars.registerHelper('base64', (str: string) => {
        return Buffer.from(str || '').toString('base64');
    });

    // Advanced: A block helper to expose a JSONPath result to a nested context.
    // Usage: {{#with_json_path "$.results.documents[*].content" as |doc_contents|}} {{#each doc_contents}}...{{/each}} {{/with_json_path}}
    this.handlebars.registerHelper('with_json_path', function(this: any, jsonPath: string, options: any) {
        const value = JSONPath({ path: jsonPath, json: this, wrap: false });
        return options.fn(this, { data: options.data, blockParams: [value] });
    });
  }

  /**
   * A helper utility to build a context object for templating by evaluating declarative JSONPath mappings
   * against the flow's runtime state. This is used by step handlers before calling render().
   * This method supports the advanced `TemplateContextMappingItem` structure and S3-aware data fetching.
   *
   * @param mappings A record mapping context variable names to `TemplateContextMappingItem` objects.
   * @param contextData The data context to source data from.
   * @returns An object with the built context and an array of mapping events.
   */
  public async buildContextFromMappings(
    mappings: Record<string, TemplateContextMappingItem> | undefined,
    contextData: Record<string, any>,
    correlationId: string,
  ): Promise<{ context: Record<string, any>, events: MappingEvent[] }> {
    const context: Record<string, any> = {};
    const events: MappingEvent[] = [];

    if (!mappings) {
        return { context, events };
    }

    for (const [key, mapping] of Object.entries(mappings)) {
      let value: any;
      let resolutionEvents: MappingEvent[] = [];
      try {
        // Use the smart, S3-aware path resolver. Hydration must be true for templating.
        const result = await getSmartValueByJsonPath(mapping.sourceJsonPath, contextData, true, correlationId);
        value = result.value;
        resolutionEvents = result.events;
        events.push(...resolutionEvents);
      } catch (e: any) {
        log_warn(`Error evaluating JSONPath for template key '${key}'`, { jsonPath: mapping.sourceJsonPath, error: e.message }, correlationId);
        events.push({
            type: MappingEventType.TEMPLATE_CONTEXT_MAPPING,
            timestamp: new Date().toISOString(),
            status: MappingEventStatus.ERROR,
            message: `Error evaluating JSONPath for template key '${key}'.`,
            details: { sourceJsonPath: mapping.sourceJsonPath, targetKey: key, error: e.message }
        });
        continue; // Skip this key
      }

      const baseEvent: Omit<MappingEvent, 'status' | 'message'> = {
        type: MappingEventType.TEMPLATE_CONTEXT_MAPPING,
        timestamp: new Date().toISOString(),
        details: { sourceJsonPath: mapping.sourceJsonPath, targetKey: key }
      };

      if (value === undefined) {
        log_debug(`JSONPath for key '${key}' resulted in 'undefined'. It will be omitted from context.`, { path: mapping.sourceJsonPath }, correlationId);
        events.push({
            ...baseEvent,
            status: MappingEventStatus.WARN,
            message: `Source path resolved to undefined. Key '${key}' was omitted from template context.`,
        });
        continue;
      }

      // 1. Field Selection Logic
      let processedValue = value;
      if (mapping.selectFields && mapping.selectFields.length > 0) {
        let valueToProcess = processedValue;
        if (typeof valueToProcess === 'string') {
            const trimmed = valueToProcess.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                    valueToProcess = JSON.parse(valueToProcess);
                } catch (e) {
                    log_warn(`Value for key '${key}' could not be parsed as JSON for selectFields. Proceeding with raw string.`, { path: mapping.sourceJsonPath }, correlationId);
                }
            }
        }
        
        const fieldsToSelect = new Set(mapping.selectFields);
        if (Array.isArray(valueToProcess)) {
            processedValue = valueToProcess.map(item => {
                if (typeof item === 'object' && item !== null) {
                    const newItem: Record<string, any> = {};
                    for (const field of fieldsToSelect) {
                        if (item[field] !== undefined) {
                            newItem[field] = item[field];
                        }
                    }
                    return newItem;
                }
                return item;
            });
        } else if (typeof valueToProcess === 'object' && valueToProcess !== null) {
            const newItem: Record<string, any> = {};
            for (const field of fieldsToSelect) {
                if (valueToProcess[field] !== undefined) {
                    newItem[field] = valueToProcess[field];
                }
            }
            processedValue = newItem;
        }
      }

      // 2. Formatting Logic
      switch (mapping.formatAs) {
        case 'JSON':
          context[key] = JSON.stringify(processedValue, null, 0);
          break;
        case 'CUSTOM_STRING':
          if (Array.isArray(processedValue)) {
              if (mapping.itemTemplate) {
                  const formattedItems = await Promise.all(processedValue.map(async (item) => {
                      // The `render` method is now fully S3-aware and handles hydration internally.
                      // We can simply pass the item (which might contain pointers) as the context.
                      return this.render(mapping.itemTemplate!, item, correlationId);
                  }));
                  context[key] = formattedItems.join(mapping.joinSeparator);
              } else {
                   log_warn(`formatAs is 'CUSTOM_STRING' for key '${key}' but itemTemplate is missing. Using raw value.`, { path: mapping.sourceJsonPath }, correlationId);
                   context[key] = processedValue;
              }
          } else {
            log_warn(`formatAs is 'CUSTOM_STRING' but the data for key '${key}' is not an array. Using raw value.`, { path: mapping.sourceJsonPath, type: typeof processedValue }, correlationId);
            context[key] = processedValue;
          }
          break;
        case 'RAW':
        default:
          context[key] = processedValue;
          break;
      }
      events.push({
        ...baseEvent,
        status: MappingEventStatus.SUCCESS,
        message: `Mapped '${mapping.sourceJsonPath}' to template key '${key}' with format '${mapping.formatAs || 'RAW'}'.`,
        details: { ...baseEvent.details, resolvedValuePreview: JSON.stringify(context[key])?.substring(0, 200) }
      });
    }
    return { context, events };
  }
}