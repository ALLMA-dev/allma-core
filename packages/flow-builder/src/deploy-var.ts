/**
 * Deploy-time placeholder support.
 *
 * The CDK config-importer's `renderTemplates` only substitutes a fixed set of
 * tokens — `{{stage}}`, `{{accountId}}`, `{{region}}` — and only inside a flow's
 * `flowVariables`. A `{{...}}` token anywhere else (a step payload, a module
 * `customConfig`) is never rendered and ships to runtime literally, silently
 * broken. `deployVar` models this constraint at author time, and the build-time
 * {@link scanForMisplacedTokens} pass enforces it.
 */

/** The only template tokens the importer renders. Keep in sync with the importer. */
export const ALLOWED_DEPLOY_TOKENS = ['stage', 'accountId', 'region'] as const;
export type AllowedDeployToken = (typeof ALLOWED_DEPLOY_TOKENS)[number];

const TOKEN_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** A string carrying one or more deploy placeholders, destined for `flowVariables`. */
export type DeployVar = string & { readonly __allmaDeployVar: unique symbol };

/**
 * Declares a deploy-time placeholder string for use in a flow's `variables`
 * (which become `flowVariables`). Steps then reference `$.flowVariables.<name>`.
 *
 * Validates eagerly that every `{{token}}` it contains is one the importer can
 * actually render, so a typo like `{{stagee}}` fails at author time rather than
 * shipping unrendered.
 *
 * @example deployVar('orders-table-{{stage}}')
 */
export function deployVar(template: string): DeployVar {
  const unknown = extractTokens(template).filter(
    (t) => !(ALLOWED_DEPLOY_TOKENS as readonly string[]).includes(t),
  );
  if (unknown.length > 0) {
    throw new Error(
      `deployVar('${template}') uses unknown deploy token(s): ${unknown
        .map((t) => `{{${t}}}`)
        .join(', ')}. Only ${ALLOWED_DEPLOY_TOKENS.map((t) => `{{${t}}}`).join(', ')} are rendered by the importer.`,
    );
  }
  return template as DeployVar;
}

/** Returns every distinct token name found inside `{{...}}` in `value`. */
export function extractTokens(value: string): string[] {
  const found = new Set<string>();
  for (const match of value.matchAll(TOKEN_REGEX)) {
    found.add(match[1]);
  }
  return [...found];
}

/** A single misplaced-token finding, with a dotted path into the emitted flow. */
export interface TokenIssue {
  path: string;
  message: string;
}

/**
 * Walks an emitted flow object and reports every **deploy** token
 * ({@link ALLOWED_DEPLOY_TOKENS}) that appears OUTSIDE `flowVariables`.
 *
 * Why only the deploy tokens, and not every `{{...}}`? The RFC's first phrasing
 * said to flag any `{{...}}` outside `flowVariables`, but that is wrong against
 * the code: at execution time the engine renders string fields with Handlebars
 * (`template-service.ts`), so `{{steps_output.x}}`, `{{flow_variables.y}}`,
 * `{{config.z}}`, `{{aws_region}}` etc. are all legitimate runtime templates and
 * must be allowed. The genuine hazard is narrower: the deploy importer only
 * substitutes `{{stage}}`/`{{accountId}}`/`{{region}}`, and only inside
 * `flowVariables`. One of those three placed anywhere else is never rendered by
 * the importer AND has no matching key in the runtime context, so it silently
 * renders to empty. Those — and only those — are build errors here.
 */
export function scanForMisplacedTokens(flow: Record<string, unknown>): TokenIssue[] {
  const issues: TokenIssue[] = [];
  const deployTokens = new Set<string>(ALLOWED_DEPLOY_TOKENS);

  const visit = (value: unknown, path: string, insideFlowVariables: boolean): void => {
    if (typeof value === 'string') {
      if (insideFlowVariables) return; // deploy tokens belong here; the importer renders them
      for (const token of extractTokens(value)) {
        if (deployTokens.has(token)) {
          issues.push({
            path,
            message: `Deploy token {{${token}}} appears outside flowVariables at '${path}'. The importer only renders {{stage}}/{{accountId}}/{{region}} inside flowVariables, and the runtime context has no '${token}' key — it would render empty. Declare it as a flow variable (deployVar) and reference {{flow_variables.<name>}}.`,
          });
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}[${i}]`, insideFlowVariables));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const childPath = path ? `${path}.${key}` : key;
        const childInsideFv = insideFlowVariables || (path === '' && key === 'flowVariables');
        visit(child, childPath, childInsideFv);
      }
    }
  };

  visit(flow, '', false);
  return issues;
}
