import { MasterField } from './entity-types.js';
import { z } from 'zod';

/**
 * Dynamically builds a Zod schema from an array of MasterField objects.
 * This function reads the `validationRules` from the master field configuration
 * and chains the appropriate Zod methods, passing the configured `messageKey`.
 *
 * @param fields An array of MasterField objects from master-fields.json.
 * @returns A ZodObject schema ready to be used.
 */
export function buildZodSchema(fields: MasterField[]): z.ZodObject<any> {
  const schemaShape: { [key: string]: z.ZodType<any, any> } = {};

  fields.forEach(field => {
    let fieldSchema: z.ZodType<any, any>;
    let isRequired = false;
    let requiredMessageKey: string | undefined;

    // 1. Determine base type.
    switch (field.fieldType) {
      case 'number':
        fieldSchema = z.coerce.number();
        break;
      case 'currency':
      case 'weight':
      case 'length':
      case 'volume':
        fieldSchema = z.object({
          value: z.coerce.number({ invalid_type_error: 'validation:errors.invalid_number' }).nullable(),
          unit: z.string({ invalid_type_error: 'validation:errors.required' }).nullable(),
        });
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.coerce.date();
        break;
      default:
        fieldSchema = z.string();
    }

    // 2. Chain validation rules from configuration
    if (field.validationRules && Array.isArray(field.validationRules)) {
      field.validationRules.forEach(rule => {
        if (rule.type === 'required') {
          isRequired = true;
          requiredMessageKey = rule.messageKey;
          // 'required' is handled last, so we continue
          return;
        }

        const message = { message: rule.messageKey };

        switch (rule.type) {
          case 'min':
            // Apply min validation to the 'value' property of convertible objects
            if (fieldSchema instanceof z.ZodObject && typeof rule.value === 'number') {
              fieldSchema = fieldSchema.refine(data => data === null || data.value === null || data.value >= rule.value!, message);
            } else if (typeof rule.value === 'number' && (fieldSchema instanceof z.ZodString || fieldSchema instanceof z.ZodNumber)) {
              fieldSchema = fieldSchema.min(rule.value, message);
            }
            break;
          case 'max':
             if (fieldSchema instanceof z.ZodObject && typeof rule.value === 'number') {
              fieldSchema = fieldSchema.refine(data => data === null || data.value === null || data.value <= rule.value!, message);
            } else if (typeof rule.value === 'number' && (fieldSchema instanceof z.ZodString || fieldSchema instanceof z.ZodNumber)) {
              fieldSchema = fieldSchema.max(rule.value, message);
            }
            break;
          case 'integer':
            if (fieldSchema instanceof z.ZodObject) {
              fieldSchema = fieldSchema.refine(data => data === null || data.value === null || Number.isInteger(data.value), message);
            } else if (fieldSchema instanceof z.ZodNumber) {
              fieldSchema = fieldSchema.int(message);
            }
            break;
        }
      });
    }

    // 3. Apply the final 'required' rule and nullability
    if (isRequired) {
      if (['currency', 'weight', 'length', 'volume'].includes(field.fieldType)) {
        fieldSchema = fieldSchema.refine(val => val && val.value != null && val.unit, {
          message: requiredMessageKey || 'validation:errors.required',
        });
      } else {
        fieldSchema = fieldSchema.refine((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'string' && val.trim() === '') return false;
          if (typeof val === 'number' && isNaN(val)) return false;
          return true;
        }, {
          message: requiredMessageKey || 'validation:errors.required',
        });
      }
    } else {
      fieldSchema = fieldSchema.optional().nullable();
    }

    schemaShape[field.key] = fieldSchema;
  });

  return z.object(schemaShape);
}