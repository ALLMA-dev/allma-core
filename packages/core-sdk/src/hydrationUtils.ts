import { resolveS3Pointer } from './s3Utils.js';
import { isS3OutputPointerWrapper } from '@allma/core-types';

/**
 * Recursively traverses an object or array and resolves any S3 pointers it finds.
 */
export async function hydrateInputFromS3Pointers(data: any, correlationId?: string): Promise<any> {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => hydrateInputFromS3Pointers(item, correlationId)));
    }
    if (isS3OutputPointerWrapper(data)) {
      return resolveS3Pointer(data._s3_output_pointer, correlationId);
    }
    if (data && typeof data === 'object') {
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