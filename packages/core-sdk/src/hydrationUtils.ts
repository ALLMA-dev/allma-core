import { resolveS3Pointer } from './s3Utils.js';
import { isS3OutputPointerWrapper } from '@allma/core-types';
import { deepMerge, isObject } from './objectUtils.js';

/**
 * Recursively traverses an object or array and resolves any S3 pointers it finds.
 */
export async function hydrateInputFromS3Pointers(data: any, correlationId?: string): Promise<any> {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => hydrateInputFromS3Pointers(item, correlationId)));
    }
    if (isS3OutputPointerWrapper(data)) {
      // Core engine operations using hydration inherently need full data without size limits 
      const resolvedData = await resolveS3Pointer(data._s3_output_pointer, correlationId);
      const { _s3_output_pointer, ...otherKeys } = data;
      
      let mergedData = resolvedData;
      if (Object.keys(otherKeys).length > 0) {
          // Hydrate the other keys just in case they contain nested pointers, 
          // but AVOID recursing into the potentially massive resolved S3 data.
          const hydratedOtherKeys = await hydrateInputFromS3Pointers(otherKeys, correlationId);
          
          // Use deepMerge to prevent shallow overwriting of nested objects like 'triggeringEmail'
          if (isObject(resolvedData)) {
              mergedData = deepMerge(resolvedData, hydratedOtherKeys);
          } else {
              mergedData = { content: resolvedData, ...hydratedOtherKeys };
          }
      }
      
      return mergedData;
    }
    if (isObject(data)) {
      const hydratedObject: Record<string, any> = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          hydratedObject[key] = await hydrateInputFromS3Pointers(data[key], correlationId);
        }
      }
      return hydratedObject;
    }
    return data;
}