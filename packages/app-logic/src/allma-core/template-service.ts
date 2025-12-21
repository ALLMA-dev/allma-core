import Handlebars from 'handlebars';
import { JSONPath } from 'jsonpath-plus';
import { MappingEvent, MappingEventStatus, MappingEventType, TemplateContextMappingItem, isS3OutputPointerWrapper } from '@allma/core-types';
import { log_debug, log_warn, resolveS3Pointer } from '@allma/core-sdk';
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
   *
   * @param template The Handlebars template string.
   * @param context A pre-built context object with data for the template.
   * @returns The rendered string.
   */
    public render(
        template: string,
        context: Record<string, any>,
    ): string {
        const compiledTemplate = this.handlebars.compile(template, {
            noEscape: true, // We are not generating HTML, so we don't need escaping.
            strict: false,  // Be lenient with missing properties, they'll just be empty.
        });
        return compiledTemplate(context);
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
                      // ** S3-AWARE HYDRATION LOGIC **
                      // Before rendering, inspect the item for S3 pointers and resolve them.
                      let contextForItem = item;
                      if (typeof item === 'object' && item !== null) {
                          const hydratedItem = { ...item };
                          for (const prop in hydratedItem) {
                              if (Object.prototype.hasOwnProperty.call(hydratedItem, prop) && isS3OutputPointerWrapper(hydratedItem[prop])) {
                                  log_debug(`Hydrating S3 pointer for item property '${prop}' in CUSTOM_STRING template`, { key }, correlationId);
                                  hydratedItem[prop] = await resolveS3Pointer(hydratedItem[prop]._s3_output_pointer, correlationId);
                                  log_debug(`hydratedItem[prop] is ${ JSON.stringify(hydratedItem[prop]) }`, {}, correlationId);
                              }
                          }
                          contextForItem = hydratedItem;
                          log_debug(`contextForItem ${ JSON.stringify(contextForItem) }`, {}, correlationId);
                      }
                      const renderedPart = this.render(mapping.itemTemplate!, contextForItem);

                      // ** Intelligently stringify if the template resolved to an object **
                      if (typeof renderedPart === 'object' && renderedPart !== null) {
                          return JSON.stringify(renderedPart);
                      }
                      return String(renderedPart);
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