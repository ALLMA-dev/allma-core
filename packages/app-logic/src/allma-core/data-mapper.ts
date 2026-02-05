import { JSONPath } from 'jsonpath-plus';
import {
  StepInputMapping,
  StepOutputMapping,
  isS3OutputPointerWrapper,
  MappingEvent,
  MappingEventType,
  MappingEventStatus,
} from '@allma/core-types';
import { log_debug, log_warn, log_info, log_error, resolveS3Pointer } from '@allma/core-sdk';

/**
 * Sets a value on a nested object using a dot-notation or bracket-notation path.
 * Mutates the target object and creates nested objects/arrays as needed.
 * e.g., setByDotNotation(obj, 'a.b[0].c', 123) results in obj.a.b[0].c = 123
 */
export function setByDotNotation(obj: Record<string, any>, path: string, value: any): void {
  // This regex is a simple but effective way to handle both dot and bracket notation.
  // It converts bracket notation to dot notation (e.g., 'a[0]' -> 'a.0') and then splits by dots.
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');

  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];

    // Determine if the next segment in the path is an array index.
    const nextKeyIsIndex = /^\d+$/.test(nextKey);

    if (current[key] === undefined || current[key] === null) {
      // If the current path segment doesn't exist, create it.
      // Create an array if the next segment is numeric, otherwise an object.
      current[key] = nextKeyIsIndex ? [] : {};
    }
    current = current[key];
  }

  const finalKey = keys[keys.length - 1];
  if (finalKey !== undefined) {
    current[finalKey] = value;
  }
}

/**
 * Pre-processes a JSONPath string to resolve any dynamic segments.
 * A dynamic segment is a part of the path that is itself a JSONPath, e.g., `[$.path.to.key]`.
 * This function is called recursively by `getSmartValueByJsonPath` to handle nested dynamic paths.
 * @param path The potentially dynamic JSONPath string.
 * @param data The root object to traverse for resolving the inner paths.
 * @param shouldHydrate Controls whether S3 pointers encountered during path resolution should be resolved.
 * @param correlationId Optional correlation ID for logging.
 * @returns A promise that resolves to a simple, non-dynamic JSONPath string.
 */
async function resolveDynamicJsonPathString(
  path: string,
  data: Record<string, any>,
  shouldHydrate: boolean,
  correlationId?: string,
): Promise<string> {
  // Regex to find segments like [$.path.to.value]
  const dynamicSegmentRegex = /\[(\$\..*?)\]/g;

  // If the path doesn't contain the pattern, return it immediately to avoid unnecessary processing.
  if (!dynamicSegmentRegex.test(path)) {
    return path;
  }

  // Reset regex state for execution since we used .test()
  dynamicSegmentRegex.lastIndex = 0;

  let resolvedPath = path;
  const replacements = [];

  // First pass: find all dynamic parts and resolve their values.
  // This avoids issues with string replacement affecting subsequent regex matches on the same line.
  let match;
  while ((match = dynamicSegmentRegex.exec(path)) !== null) {
    const fullMatch = match[0]; // e.g., [$.steps_output.secretary_llm.relevantTemplateId]
    const innerPath = match[1]; // e.g., $.steps_output.secretary_llm.relevantTemplateId

    try {
      // Recursively call the main resolver to get the value of the inner path.
      // This allows the inner path to also be dynamic or resolve S3 pointers.
      const { value: dynamicKey } = await getSmartValueByJsonPath(innerPath, data, shouldHydrate, correlationId);

      if (dynamicKey === undefined || dynamicKey === null) {
        throw new Error(`Dynamic path segment '${innerPath}' in path '${path}' resolved to null or undefined.`);
      }

      // Construct the replacement segment. If the key is a string, it must be quoted.
      // If it's a number, it's a direct array index.
      const replacementSegment =
        typeof dynamicKey === 'number' ? `[${dynamicKey}]` : `['${String(dynamicKey)}']`;

      replacements.push({ find: fullMatch, replace: replacementSegment });
    } catch (e: any) {
      log_error(`Failed to resolve inner dynamic JSONPath '${innerPath}'`, { originalPath: path, error: e.message }, correlationId);
      throw new Error(`Resolution of dynamic path segment failed: ${e.message}`);
    }
  }

  // Second pass: apply all replacements to the original path string.
  for (const rep of replacements) {
    resolvedPath = resolvedPath.replace(rep.find, rep.replace);
  }

  if (resolvedPath !== path) {
    log_debug('Resolved dynamic JSONPath', { original: path, resolved: resolvedPath }, correlationId);
  }

  return resolvedPath;
}

/**
 * A private helper that traverses a simple (non-complex) JSONPath, resolving
 * any intermediate S3 pointers it encounters.
 * @param path The simple JSONPath string to evaluate.
 * @param data The root object to traverse.
 * @param shouldHydrate If true, S3 pointers will be resolved.
 * @param correlationId Optional correlation ID for logging.
 * @returns An object containing the resolved `value` and an array of `events`.
 */
async function traverseSimplePath(
  path: string,
  data: Record<string, any>,
  shouldHydrate: boolean,
  correlationId?: string,
): Promise<{ value: any; events: MappingEvent[] }> {
  const events: MappingEvent[] = [];
  log_debug(`Traversing simple path for S3-aware resolution.`, { path }, correlationId);

  const pathSegments = JSONPath.toPathArray(path);
  if (pathSegments[0] !== '$') {
    log_warn(`JSONPath must start with root '$'. Path: ${path}`, {}, correlationId);
    return { value: undefined, events };
  }

  let currentContext: any = data;

  // Traverse the path segment by segment starting from index 1 (after '$')
  for (let i = 1; i < pathSegments.length; i++) {
    const segment = pathSegments[i];

    if (currentContext === undefined || currentContext === null) {
      log_warn(
        `Path traversal failed at segment '${String(segment)}' because parent is null/undefined.`,
        { path },
        correlationId,
      );
      return { value: undefined, events };
    }

    // Move to the next value in the path
    currentContext = currentContext[segment];

    // After moving, check if the NEW current context is an S3 pointer that needs resolving
    if (isS3OutputPointerWrapper(currentContext) && shouldHydrate) {
      const traversedPath = JSONPath.toPathString(pathSegments.slice(0, i + 1));
      log_debug(`Encountered S3 pointer at path segment '${String(segment)}'. Resolving...`, { path: traversedPath }, correlationId);
      const s3Pointer = currentContext._s3_output_pointer;

      currentContext = await resolveS3Pointer(s3Pointer, correlationId);

      events.push({
        type: MappingEventType.S3_POINTER_RESOLVE,
        timestamp: new Date().toISOString(),
        status: MappingEventStatus.INFO,
        message: `Resolved S3 pointer found at path '${traversedPath}'.`,
        details: { s3Pointer },
      });
    }
  }
  // After the loop, currentContext holds the final resolved value.
  return { value: currentContext, events };
}

/**
 * A "smart" JSONPath resolver that can handle complex paths (like wildcards) and also
 * transparently fetch data from S3 if it encounters a pointer during traversal on simple paths.
 * It now returns the resolved value along with any debug events that occurred during resolution.
 *
 * @param path The JSONPath string to evaluate (e.g., '$.steps_output.llm1.relevantTagIds' or '$.config.tags.*').
 * @param data The root object to traverse (e.g., runtimeState.currentContextData).
 * @param shouldHydrate If true, S3 pointers will be resolved. If false, the pointer object is returned.
 * @param correlationId Optional correlation ID for logging.
 * @returns An object containing the resolved `value` and an array of `events`.
 */
export async function getSmartValueByJsonPath(
  path: string,
  data: Record<string, any>,
  shouldHydrate: boolean,
  correlationId?: string,
): Promise<{ value: any; events: MappingEvent[] }> {
  const events: MappingEvent[] = [];

  // Resolve dynamic parts of the path first.
  const resolvedPath = await resolveDynamicJsonPathString(path, data, shouldHydrate, correlationId);
  if (path !== resolvedPath) {
    events.push({
      type: MappingEventType.DYNAMIC_PATH_RESOLVE,
      timestamp: new Date().toISOString(),
      status: MappingEventStatus.SUCCESS,
      message: `Dynamically resolved path from '${path}' to '${resolvedPath}'.`,
      details: { originalPath: path, resolvedPath },
    });
  }

  // Regex to find the first occurrence of a complex JSONPath operator.
  // This includes wildcards, deep scans, filters (`[?(@...)]`), script expressions (`@.`), slices (`[start:end]`),
  // and common shorthand filters (e.g., `[key=value]`).
  const complexRegex = /(\*|\.\.|\[\?|@\.|\[.*:.*\]|\[.*[=><!].*\])/;
  const complexMatch = resolvedPath.match(complexRegex);

  if (complexMatch && complexMatch.index !== undefined) {
    const splitIndex = complexMatch.index;
    const basePathStr = resolvedPath.substring(0, splitIndex);
    const suffix = resolvedPath.substring(splitIndex);

    log_debug(`Complex JSONPath detected. Splitting for S3-aware resolution.`, { path: resolvedPath, base: basePathStr, suffix }, correlationId);

    // Step 1: Resolve the base path using the S3-aware simple traversal.
    const { value: resolvedBaseData, events: baseEvents } = await traverseSimplePath(
      basePathStr,
      data,
      shouldHydrate,
      correlationId,
    );
    events.push(...baseEvents);

    if (resolvedBaseData === undefined || resolvedBaseData === null) {
      log_warn(
        `Base path '${basePathStr}' of complex path resolved to null/undefined. Final result is undefined.`,
        { originalPath: resolvedPath },
        correlationId,
      );
      return { value: undefined, events };
    }

    // Step 2: Apply the complex suffix to the now-hydrated base data.
    const suffixPath = '$' + suffix;

    try {
      let finalResults = JSONPath({ path: suffixPath, json: resolvedBaseData, wrap: false });

      // Step 3: Check if the final result of the complex operation is itself a pointer.
      if (isS3OutputPointerWrapper(finalResults) && shouldHydrate) {
        log_debug(`Result of complex suffix is an S3 pointer. Resolving...`, { suffixPath }, correlationId);
        const s3Pointer = finalResults._s3_output_pointer;
        finalResults = await resolveS3Pointer(s3Pointer, correlationId);
        events.push({
          type: MappingEventType.S3_POINTER_RESOLVE,
          timestamp: new Date().toISOString(),
          status: MappingEventStatus.INFO,
          message: `Resolved S3 pointer found at end of complex path '${resolvedPath}'.`,
          details: { s3Pointer },
        });
      }

      return { value: finalResults, events };
    } catch (e: any) {
      log_warn(`Evaluation of complex suffix '${suffix}' failed on resolved base data.`, { path: resolvedPath, suffix, error: e.message }, correlationId);
      return { value: undefined, events };
    }
  } else {
    // No complex operators found, use the simple traversal for the entire path.
    const { value, events: traversalEvents } = await traverseSimplePath(resolvedPath, data, shouldHydrate, correlationId);
    events.push(...traversalEvents);
    return { value, events };
  }
}

/**
 * Helper function to safely set a value in a nested object using a JSONPath string.
 * This function manually traverses the path and creates nested objects/arrays if they don't exist.
 * @param obj The object to modify.
 * @param path The JSONPath string (e.g., '$.a.b[0].c').
 * @param value The value to set.
 * @param correlationId Optional correlation ID for logging.
 */
function setValueByJsonPath(obj: Record<string, any>, path: string, value: any, correlationId?: string): void {
  // Use the library's utility to correctly parse the path string into segments.
  // e.g., "$['a']['b'][0]['c']" -> ['$', 'a', 'b', 0, 'c']
  const pathSegments = JSONPath.toPathArray(path);

  if (pathSegments[0] !== '$') {
    log_warn(`JSONPath for output mapping must start with root '$'. Path: ${path}`, {}, correlationId);
    return;
  }

  let currentContext = obj;

  // Traverse the path segments to find the parent object of the target key.
  // We loop until the second-to-last segment.
  for (let i = 1; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i];
    const nextSegment = pathSegments[i + 1];

    // Autovivification: If a segment in the path doesn't exist, create it.
    if (currentContext[segment] === undefined || currentContext[segment] === null) {
      // If the next segment is a number, we need to create an array. Otherwise, create an object.
      if (typeof nextSegment === 'number') {
        currentContext[segment] = [];
      } else {
        currentContext[segment] = {};
      }
      log_debug(`Autovivified path segment '${String(segment)}'`, { path }, correlationId);
    }
    currentContext = currentContext[segment];
  }

  // Get the final segment (the key or index to set the value on).
  const finalKey = pathSegments[pathSegments.length - 1];
  if (finalKey !== undefined) {
    currentContext[finalKey] = value;
  } else {
    log_warn(`Could not determine final key for path: ${path}. Assignment skipped.`, {}, correlationId);
  }
}

/**
 * Prepares the input object for a step by applying input mappings.
 * @param mappings The StepInputMapping object.
 * @param contextData The currentContextData from FlowRuntimeState.
 * @param shouldHydrate Controls whether S3 pointers are resolved during mapping.
 * @param correlationId Optional correlation ID for logging.
 * @returns An object with the prepared input and an array of mapping events.
 */
export async function prepareStepInput(
  mappings: StepInputMapping,
  contextData: Record<string, any>,
  shouldHydrate: boolean,
  correlationId?: string,
): Promise<{ preparedInput: Record<string, any>; events: MappingEvent[] }> {
  const preparedInput: Record<string, any> = {};
  const events: MappingEvent[] = [];

  // Sort keys to ensure parent objects are created before nested properties are set.
  // e.g., 'initialContextData' is processed before 'initialContextData._flow_resume_key'.
  const sortedTargetKeys = Object.keys(mappings).sort();

  for (const targetKey of sortedTargetKeys) {
    const sourceJsonPath = mappings[targetKey];
    try {
      const { value: rawValue, events: resolutionEvents } = await getSmartValueByJsonPath(
        sourceJsonPath,
        contextData,
        shouldHydrate,
        correlationId,
      );
      events.push(...resolutionEvents);

      const event: MappingEvent = {
        type: MappingEventType.INPUT_MAPPING,
        timestamp: new Date().toISOString(),
        status: MappingEventStatus.SUCCESS,
        message: `Mapped '${sourceJsonPath}' to input path '${targetKey}'.`,
        details: {
          sourceJsonPath,
          targetKey,
          resolvedValuePreview: JSON.stringify(rawValue)?.substring(0, 200),
        },
      };

      if (rawValue !== undefined) {
        // Use setByDotNotation to allow deep setting.
        setByDotNotation(
          preparedInput,
          targetKey,
          typeof rawValue === 'object' && rawValue !== null ? structuredClone(rawValue) : rawValue,
        );
      } else {
        event.status = MappingEventStatus.WARN;
        event.message = `Source path '${sourceJsonPath}' resolved to undefined. Path '${targetKey}' was not set in step input.`;
        log_warn(event.message, {}, correlationId);
      }
      events.push(event);
    } catch (e: any) {
      const event: MappingEvent = {
        type: MappingEventType.INPUT_MAPPING,
        timestamp: new Date().toISOString(),
        status: MappingEventStatus.ERROR,
        message: `Error evaluating JSONPath '${sourceJsonPath}' for input path '${targetKey}'.`,
        details: { sourceJsonPath, targetKey, error: e.message },
      };
      events.push(event);
      log_warn(event.message, { error: e.message }, correlationId);
    }
  }
  log_debug(
    'Prepared step input from mappings',
    { mappings: mappings, inputKeys: Object.keys(preparedInput) },
    correlationId,
  );
  return { preparedInput, events };
}

/**
 * Merges the output of a step back into the flow's context data using output mappings.
 * This function mutates the provided contextData object.
 * It is "S3-aware" and handles offloaded payloads gracefully.
 * @param mappings The StepOutputMapping object.
 * @param stepOutputData The data returned from the step execution.
 * @param contextData The currentContextData from FlowRuntimeState to be mutated.
 * @param correlationId Optional correlation ID for logging.
 * @returns An array of mapping events generated during the process.
 */
export function processStepOutput(
  mappings: StepOutputMapping,
  stepOutputData: Record<string, any>,
  contextData: Record<string, any>,
  correlationId?: string,
): MappingEvent[] {
  const events: MappingEvent[] = [];

  if (isS3OutputPointerWrapper(stepOutputData)) {
    log_info('Step output is an S3 pointer. Mappings will be handled accordingly.', {}, correlationId);
    for (const [targetContextJsonPath, sourceJsonPath] of Object.entries(mappings)) {
      // Check if the mapping intends to get the entire object.
      if (sourceJsonPath === '$' || sourceJsonPath === '$.') {
        // This mapping intends to map the entire offloaded object. Map the pointer.
        const clonedPointer = structuredClone(stepOutputData);
        setValueByJsonPath(contextData, targetContextJsonPath, clonedPointer, correlationId);
        events.push({
          type: MappingEventType.OUTPUT_MAPPING,
          timestamp: new Date().toISOString(),
          status: MappingEventStatus.INFO,
          message: `Mapped entire S3 output pointer to context path '${targetContextJsonPath}'.`,
          details: { sourceJsonPath, targetContextJsonPath, s3Pointer: clonedPointer._s3_output_pointer },
        });
      } else {
        // This mapping attempts to access a sub-property of the offloaded object.
        // This is not possible without rehydrating the data. We will map 'undefined' (i.e., do nothing) and warn.
        const message = `Output mapping from '${sourceJsonPath}' cannot be resolved because the step output was offloaded to S3. Path '${targetContextJsonPath}' will not be set. To map the entire offloaded object, use '$' as the source path.`;
        log_warn(message, {}, correlationId);
        events.push({
          type: MappingEventType.OUTPUT_MAPPING,
          timestamp: new Date().toISOString(),
          status: MappingEventStatus.WARN,
          message,
          details: { sourceJsonPath, targetContextJsonPath, reason: 'Source data is in S3' },
        });
        // We explicitly do not set a value, which results in 'undefined' for the target path.
      }
    }
    return events;
  }

  // Original logic for non-offloaded (or partially offloaded) payloads.
  for (const [targetContextJsonPath, sourceJsonPath] of Object.entries(mappings)) {
    const event: MappingEvent = {
      type: MappingEventType.OUTPUT_MAPPING,
      timestamp: new Date().toISOString(),
      status: MappingEventStatus.SUCCESS,
      message: `Mapped step output '${sourceJsonPath}' to context path '${targetContextJsonPath}'.`,
      details: { sourceJsonPath, targetContextJsonPath },
    };

    try {
      const valueToApply = JSONPath({ path: sourceJsonPath, json: stepOutputData, wrap: false });
      if (valueToApply !== undefined) {
        const clonedValueToApply =
          typeof valueToApply === 'object' && valueToApply !== null ? structuredClone(valueToApply) : valueToApply;
        setValueByJsonPath(contextData, targetContextJsonPath, clonedValueToApply, correlationId);
        event.details.resolvedValuePreview = JSON.stringify(clonedValueToApply)?.substring(0, 200);
      } else {
        event.status = MappingEventStatus.WARN;
        event.message = `Source path '${sourceJsonPath}' from step output resolved to undefined. No value applied to context path '${targetContextJsonPath}'.`;
        log_warn(event.message, {}, correlationId);
      }
    } catch (e: any) {
      event.status = MappingEventStatus.ERROR;
      event.message = `Error applying output mapping from '${sourceJsonPath}' to '${targetContextJsonPath}'.`;
      event.details.error = e.message;
      log_warn(event.message, { error: e.message }, correlationId);
    }
    events.push(event);
  }
  log_debug('Processed step output into contextData', { mappingCount: Object.keys(mappings).length }, correlationId);
  return events;
}