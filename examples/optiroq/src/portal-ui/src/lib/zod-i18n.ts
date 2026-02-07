import { type ZodErrorMap, ZodIssueCode } from 'zod';
import i18n from '../i18n';

/**
 * A simplified custom Zod error map for i18next.
 * It checks if the message from Zod is a translation key (our convention is that it contains '.').
 * If so, it translates it. Otherwise, it uses Zod's default message.
 */
export const zodI18nMap: ZodErrorMap = (issue, ctx) => {
  // If the validation rule in the schema builder provided a messageKey, it will be in `issue.message`.
  // Our convention is that all message keys will contain a dot (e.g., 'errors.required').
  if (issue.message && issue.message.includes('.')) {
    const { message, ...params } = issue;
    
    // The `params` for `too_small` and `too_big` issues include `minimum` and `maximum`
    // which i18next can use for interpolation (e.g., {{minimum}}).
    const interpolationParams = 'minimum' in params ? { minimum: params.minimum } : 'maximum' in params ? { maximum: params.maximum } : {};

    return {
      message: i18n.t(message, { ns: 'validation', ...interpolationParams, defaultValue: ctx.defaultError }),
    };
  }
  
  // This handles cases where a rule might not have a messageKey or for default Zod errors.
  // For 'required' fields that are empty, Zod often throws `invalid_type` before our refine hits.
  if (issue.code === ZodIssueCode.invalid_type && (issue.received === 'undefined' || issue.received === 'null')) {
    return { message: i18n.t('validation:errors.required') };
  }

  // Fallback to Zod's default error message.
  return { message: ctx.defaultError };
};