/**
 * A utility to check if an item is a non-array, non-null object.
 */
export function isObject(item: any): item is Record<string, any> {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deeply merges two objects. The source object's properties overwrite the target's.
 * Properties with `undefined` values in the source are ignored to prevent accidental overwrites.
 * @param target The target object.
 * @param source The source object.
 * @returns A new object with the merged properties.
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        for (const key of Object.keys(source)) {
            const sourceValue = source[key];

            // Do not merge if the source value is undefined. This prevents
            // optional properties in override objects (like from branch definitions)
            // from overwriting existing defined values with 'undefined'.
            if (sourceValue === undefined) {
                continue;
            }

            const targetValue = target[key];

            if (isObject(targetValue) && isObject(sourceValue)) {
                // If both values are objects, recurse
                (output as any)[key] = deepMerge(targetValue, sourceValue);
            } else {
                // Otherwise, the source value (which is not undefined) overwrites the target value
                (output as any)[key] = sourceValue;
            }
        }
    }
    return output;
}

export function unwrapConfidenceTrackedValues(payload: Record<string, any>): Record<string, any> {
  const newPayload: Record<string, any> = {};
  for (const key in payload) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const value = payload[key];
      if (value && typeof value === 'object' && 'value' in value) {
        newPayload[key] = value.value;
      } else {
        newPayload[key] = value;
      }
    }
  }
  return newPayload;
}
