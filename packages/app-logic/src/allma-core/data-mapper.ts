import { JSONPath } from 'jsonpath-plus';
import { 
  StepInputMapping, 
  StepOutputMapping, 
  isS3OutputPointerWrapper,
  MappingEvent,
  MappingEventType,
  MappingEventStatus
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
        const nextKey = keys[i+1];
        
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
    if(finalKey !== undefined) {
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
    correlationId?: string
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
            const replacementSegment = typeof dynamicKey === 'number' 
                ? `[${dynamicKey}]`
                : `['${String(dynamicKey)}']`;

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
    correlationId?: string
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
            details: { originalPath: path, resolvedPath }
        });
    }


    // Detect if the path uses complex JSONPath operators that the manual traversal cannot handle.
    // If so, use the full library evaluator. This assumes complex paths do not have intermediate S3 pointers.
    if (resolvedPath.includes('*') || resolvedPath.includes('..') || resolvedPath.includes('?(') || resolvedPath.includes('@.')) {
        log_debug(`Complex JSONPath detected. Using direct evaluation.`, { path: resolvedPath }, correlationId);
        try {
            let results = JSONPath({ path: resolvedPath, json: data, wrap: false });
            // The direct evaluation doesn't handle S3 pointers itself, but if the final result is a pointer, we can resolve it.
            if (isS3OutputPointerWrapper(results) && shouldHydrate) {
                log_debug(`Result of complex JSONPath is an S3 pointer. Resolving...`, { path: resolvedPath }, correlationId);
                const s3Pointer = results._s3_output_pointer;
                results = await resolveS3Pointer(s3Pointer, correlationId);
                events.push({
                    type: MappingEventType.S3_POINTER_RESOLVE,
                    timestamp: new Date().toISOString(),
                    status: MappingEventStatus.INFO,
                    message: `Resolved S3 pointer found at path '${resolvedPath}'.`,
                    details: { s3Pointer }
                });
            }
            return { value: results, events };
        } catch (e: any) {
            log_warn(`Direct evaluation of complex JSONPath failed.`, { path: resolvedPath, error: e.message }, correlationId);
            return { value: undefined, events };
        }
    }

    // For simple paths, proceed with manual traversal to handle intermediate S3 pointers.
    log_debug(`Simple JSONPath detected. Using manual traversal to support intermediate S3 pointers.`, { path: resolvedPath }, correlationId);
    const pathSegments = JSONPath.toPathArray(resolvedPath);
    if (pathSegments[0] !== '$') {
        log_warn(`JSONPath must start with root '$'. Path: ${resolvedPath}`, {}, correlationId);
        return { value: undefined, events };
    }

    let currentContext: any = data;

    // Traverse the path segment by segment starting from index 1 (after '$')
    for (let i = 1; i < pathSegments.length; i++) {
        const segment = pathSegments[i];

        if (currentContext === undefined || currentContext === null) {
            log_warn(`Path traversal failed at segment '${String(segment)}' because parent is null/undefined.`, { path: resolvedPath }, correlationId);
            return { value: undefined, events };
        }

        // Get the potential next value
        let nextValue = currentContext[segment];

        // Check if this next value is an S3 pointer and resolve it if so.
        if (isS3OutputPointerWrapper(nextValue) && shouldHydrate) {
            const traversedPath = JSONPath.toPathString(pathSegments.slice(0, i + 1));
            log_debug(`Encountered S3 pointer at segment '${String(segment)}'. Resolving...`, { path: traversedPath }, correlationId);
            const s3Pointer = nextValue._s3_output_pointer;
            // Resolve the pointer to get the actual data object
            nextValue = await resolveS3Pointer(s3Pointer, correlationId);
            events.push({
                type: MappingEventType.S3_POINTER_RESOLVE,
                timestamp: new Date().toISOString(),
                status: MappingEventStatus.INFO,
                message: `Resolved S3 pointer found at path '${traversedPath}'.`,
                details: { s3Pointer }
            });
        }
        
        // Move to the next segment in the path
        currentContext = nextValue;
    }
    //log_debug(`[getSmartValueByJsonPath] pathSegments: '${JSON.stringify(pathSegments)}'. currentContext: ${JSON.stringify(currentContext)}`, { path }, correlationId);
    // The loop has already resolved any pointers along the way.
    // The final value in currentContext is the result.
    return { value: currentContext, events };
}

/**
 * Helper function to safely set a value in a nested object using a JSONPath string.
 * This function manually traverses the path and creates nested objects/arrays if they don't exist.
 * @param obj The object to modify.
 * @param path The JSONPath string (e.g., '$.a.b[0].c').
 * @param value The value to set.
 * @param correlationId Optional correlation ID for logging.
 */
function setValueByJsonPath(
    obj: Record<string, any>,
    path: string,
    value: any,
    correlationId?: string
  ): void {
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
  correlationId?: string
): Promise<{ preparedInput: Record<string, any>, events: MappingEvent[] }> {
    const preparedInput: Record<string, any> = {};
    const events: MappingEvent[] = [];

    // Sort keys to ensure parent objects are created before nested properties are set.
    // e.g., 'initialContextData' is processed before 'initialContextData._flow_resume_key'.
    const sortedTargetKeys = Object.keys(mappings).sort();

    for (const targetKey of sortedTargetKeys) {
        const sourceJsonPath = mappings[targetKey];
        try {
            const { value: rawValue, events: resolutionEvents } = await getSmartValueByJsonPath(sourceJsonPath, contextData, shouldHydrate, correlationId);
            events.push(...resolutionEvents);

            const event: MappingEvent = {
                type: MappingEventType.INPUT_MAPPING,
                timestamp: new Date().toISOString(),
                status: MappingEventStatus.SUCCESS,
                message: `Mapped '${sourceJsonPath}' to input path '${targetKey}'.`,
                details: {
                    sourceJsonPath,
                    targetKey,
                    resolvedValuePreview: JSON.stringify(rawValue)?.substring(0, 200)
                }
            };
            
            if (rawValue !== undefined) {
                // Use setByDotNotation to allow deep setting.
                setByDotNotation(preparedInput, targetKey, 
                    (typeof rawValue === 'object' && rawValue !== null)
                        ? structuredClone(rawValue)
                        : rawValue
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
                details: { sourceJsonPath, targetKey, error: e.message }
            };
            events.push(event);
            log_warn(event.message, { error: e.message }, correlationId);
        }
    }
    log_debug('Prepared step input from mappings', { mappings: mappings, inputKeys: Object.keys(preparedInput) }, correlationId);
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
  correlationId?: string
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
                details: { sourceJsonPath, targetContextJsonPath, s3Pointer: clonedPointer._s3_output_pointer }
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
                details: { sourceJsonPath, targetContextJsonPath, reason: 'Source data is in S3' }
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
            details: { sourceJsonPath, targetContextJsonPath }
        };

        try {
            const valueToApply = JSONPath({ path: sourceJsonPath, json: stepOutputData, wrap: false });
            if (valueToApply !== undefined) {
                const clonedValueToApply = (typeof valueToApply === 'object' && valueToApply !== null)
                    ? structuredClone(valueToApply)
                    : valueToApply;
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