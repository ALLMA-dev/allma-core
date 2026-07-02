import { resolveS3Pointer } from './s3Utils.js';
import { isS3OutputPointerWrapper } from '@allma/core-types';
import type { S3Pointer } from '@allma/core-types';
import { deepMerge, isObject } from './objectUtils.js';

/**
 * A short-lived memoization cache for S3 pointer resolutions, keyed by bucket/key/version.
 * Sharing one cache across a single logical operation (e.g. rendering every field of a step's
 * config) ensures a pointer referenced by many fields is downloaded once instead of N times —
 * which is what turns a modestly-sized offloaded payload into a `Runtime.OutOfMemory` when it is
 * re-hydrated concurrently per field. Values are the in-flight/resolved promises so concurrent
 * callers coalesce onto a single request.
 */
export type S3HydrationCache = Map<string, Promise<any>>;

const pointerCacheKey = (pointer: S3Pointer): string =>
  `${pointer.bucket}#${pointer.key}#${pointer.versionId ?? ''}`;

/**
 * Resolves an S3 pointer, coalescing duplicate/concurrent resolutions through the provided cache.
 * When no cache is supplied it behaves exactly like {@link resolveS3Pointer}.
 */
export async function resolveS3PointerCached(
  pointer: S3Pointer,
  correlationId?: string,
  cache?: S3HydrationCache,
): Promise<any> {
  if (!cache) {
    return resolveS3Pointer(pointer, correlationId);
  }
  const key = pointerCacheKey(pointer);
  let pending = cache.get(key);
  if (!pending) {
    pending = resolveS3Pointer(pointer, correlationId);
    cache.set(key, pending);
  }
  return pending;
}

/**
 * Recursively traverses an object or array and resolves any S3 pointers it finds.
 *
 * Pass a {@link S3HydrationCache} to deduplicate repeated pointers within a single hydration pass
 * (and across sibling passes that share the same cache).
 */
export async function hydrateInputFromS3Pointers(data: any, correlationId?: string, cache?: S3HydrationCache): Promise<any> {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => hydrateInputFromS3Pointers(item, correlationId, cache)));
    }
    if (isS3OutputPointerWrapper(data)) {
      // Core engine operations using hydration inherently need full data without size limits
      const resolvedData = await resolveS3PointerCached(data._s3_output_pointer, correlationId, cache);
      const { _s3_output_pointer, ...otherKeys } = data;

      let mergedData = resolvedData;
      if (Object.keys(otherKeys).length > 0) {
          // Hydrate the other keys just in case they contain nested pointers,
          // but AVOID recursing into the potentially massive resolved S3 data.
          const hydratedOtherKeys = await hydrateInputFromS3Pointers(otherKeys, correlationId, cache);

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
          hydratedObject[key] = await hydrateInputFromS3Pointers(data[key], correlationId, cache);
        }
      }
      return hydratedObject;
    }
    return data;
}
