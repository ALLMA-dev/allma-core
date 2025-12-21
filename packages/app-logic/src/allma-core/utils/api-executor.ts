import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { JSONPath } from 'jsonpath-plus';
import { 
    ApiCallDefinition,
    FlowRuntimeState,
    TransientStepError 
} from '@allma/core-types';
import { log_error, log_info } from '@allma/core-sdk';
import { TemplateService } from '../template-service';


/**
 * Executes a configured API call using the provided runtime state for data mapping and templating.
 * This is a centralized utility to be used by both the API_CALL step handler and the API_POLLING lambda.
 *
 * @param apiCallDefinition The configuration for the API call.
 * @param runtimeState The current flow runtime state.
 * @param correlationId A unique ID for logging and tracing.
 * @param templateSourceData Optional override for the data context used in template rendering. Defaults to the full runtime state.
 * @returns A promise that resolves to the AxiosResponse.
 * @throws {TransientStepError} for 5xx server errors.
 * @throws {Error} for other axios or configuration errors.
 */
export const executeConfiguredApiCall = async (
    apiCallDefinition: ApiCallDefinition,
    runtimeState: FlowRuntimeState,
    correlationId: string,
    templateSourceData?: Record<string, any>
): Promise<AxiosResponse> => {
    
    const templateService = TemplateService.getInstance();
    const sourceData = templateSourceData || { ...runtimeState.currentContextData, ...runtimeState };

    // 1. Render the API URL
    const { context: urlContext } = await templateService.buildContextFromMappings(
        apiCallDefinition.apiUrlTemplate.contextMappings,
        sourceData,
        correlationId
    );
    
    // Render URL with the built context
    const apiUrl = templateService.render(
        apiCallDefinition.apiUrlTemplate.template,
        urlContext
    );

    log_info(`Preparing API call to ${apiUrl}`, { method: apiCallDefinition.apiHttpMethod }, correlationId);

    // 2. Build dynamic headers
    const dynamicHeaders: Record<string, string> = {};
    if (apiCallDefinition.apiHeadersTemplate) {
        for (const [header, jsonPath] of Object.entries(apiCallDefinition.apiHeadersTemplate)) {
            const value = JSONPath({ path: jsonPath, json: sourceData, wrap: false });
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                dynamicHeaders[header] = String(value);
            }
        }
    }

    // Combine static and dynamic headers, with dynamic headers taking precedence
    const finalHeaders = { ...apiCallDefinition.apiStaticHeaders, ...dynamicHeaders };

    // 3. Construct request body using the complex mapping logic
    let requestBody: any;
    if (apiCallDefinition.requestBodyTemplate && Object.keys(apiCallDefinition.requestBodyTemplate).length > 0) {
        const { context } = await templateService.buildContextFromMappings(
            apiCallDefinition.requestBodyTemplate,
            sourceData,
            correlationId
        );
        requestBody = context;
    } else if (apiCallDefinition.customConfig?.requestBodyPath) {
        requestBody = JSONPath({ path: apiCallDefinition.customConfig.requestBodyPath, json: sourceData, wrap: false });
    }

    // 4. Configure and execute the request
    const config: AxiosRequestConfig = {
        method: apiCallDefinition.apiHttpMethod,
        url: apiUrl,
        headers: finalHeaders,
        data: requestBody, // Axios handles undefined data correctly
        timeout: apiCallDefinition.customConfig?.timeoutMs || 10000,
    };

    try {
        const response = await axios(config);
        log_info(`API call to ${apiUrl} succeeded with status ${response.status}`, {}, correlationId);
        return response;
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            log_error(`API call failed`, {
                url: apiUrl,
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            }, correlationId);

            // Make transient server errors retryable by the orchestrator
            if (error.response && error.response.status >= 500) {
                throw new TransientStepError(
                    `API call failed with server error: ${error.response.status}`
                );
            }
        } else {
            log_error(`API call failed with a non-network error.`, { error: error.message }, correlationId);
        }
        // Re-throw for the caller to handle
        throw error;
    }
};

/**
 * An utility for making a direct POST request with a JSON payload.
 * Used for internal system-level calls like flow resumption where a full ApiCallDefinition is overkill.
 * @param url The URL to post to.
 * @param payload The data to send.
 * @param timeout Milliseconds before the request times out.
 * @returns A promise that resolves to the AxiosResponse.
 */
export const postSimpleJson = async (
    url: string,
    payload: Record<string, any>,
    timeout: number = 5000,
): Promise<AxiosResponse> => {
    // This function centralizes the direct axios.post call.
    return axios.post(url, payload, { timeout });
};