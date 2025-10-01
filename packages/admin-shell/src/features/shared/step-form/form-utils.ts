import { z } from 'zod';

/**
 * Generates a default object from a Zod schema's shape.
 * This ensures that every field has a non-undefined default value.
 * @param shape The shape from a ZodObject.
 * @returns An object with default values for each key.
 */
export function getDefaultsFromShape(shape: z.ZodRawShape): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const key in shape) {
        const fieldSchema = shape[key];
        const def = fieldSchema._def;

        if (def.typeName === z.ZodFirstPartyTypeKind.ZodDefault) {
            defaults[key] = def.defaultValue();
        } else if (def.typeName === z.ZodFirstPartyTypeKind.ZodString || def.typeName === z.ZodFirstPartyTypeKind.ZodEffects) {
            defaults[key] = '';
        } else if (def.typeName === z.ZodFirstPartyTypeKind.ZodObject || def.typeName === z.ZodFirstPartyTypeKind.ZodRecord) {
            defaults[key] = {};
        } else if (def.typeName === z.ZodFirstPartyTypeKind.ZodArray) {
            defaults[key] = [];
        } else {
            // For enums, numbers, booleans, etc., `null` is a safe default for controlled components.
            defaults[key] = null;
        }
    }
    return defaults;
}