"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const https = __importStar(require("https"));
const url_1 = require("url");
const s3Client = new client_s3_1.S3Client({});
/**
 * Sends a response signal to the CloudFormation pre-signed URL.
 * This is a mandatory step for all Lambda-backed custom resources.
 */
async function sendCfnResponse(event, status, data, reason) {
    const responseBody = JSON.stringify({
        Status: status,
        Reason: reason || `See the details in CloudWatch Log Stream: ${process.env.AWS_LAMBDA_LOG_STREAM_NAME}`,
        PhysicalResourceId: event.PhysicalResourceId || `${event.LogicalResourceId}-${event.RequestId}`,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: data,
    });
    console.log('Sending CloudFormation response:', responseBody);
    const parsedUrl = new url_1.URL(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'PUT',
        headers: {
            'content-type': '', // Must be empty
            'content-length': responseBody.length,
        },
    };
    return new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
            console.log(`CloudFormation response status: ${response.statusCode}`);
            response.on('data', () => { }); // Consume response data
            response.on('end', () => resolve());
        });
        request.on('error', (error) => {
            console.error('Failed to send CloudFormation response:', error);
            reject(error);
        });
        request.write(responseBody);
        request.end();
    });
}
/**
 * This Lambda handler is invoked by a CDK CustomResource. Its job is to:
 * 1. Receive the raw content of the web app's index.html file.
 * 2. Receive a runtime configuration object (with resolved CDK token values).
 * 3. Inject the configuration into the HTML.
 * 4. Upload the modified index.html to the destination S3 bucket.
 * 5. **Crucially, send a SUCCESS or FAILED signal back to CloudFormation.**
 */
const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    try {
        // On stack deletion, we just need to send a SUCCESS signal.
        if (event.RequestType === 'Delete') {
            console.log('RequestType is Delete. Sending SUCCESS signal.');
            await sendCfnResponse(event, 'SUCCESS');
            return;
        }
        const { DestinationBucketName, IndexHtmlContent, RuntimeConfig } = event.ResourceProperties;
        if (!DestinationBucketName || !IndexHtmlContent || !RuntimeConfig) {
            throw new Error('Missing required properties: DestinationBucketName, IndexHtmlContent, or RuntimeConfig.');
        }
        // 1. Create the script tag with the stringified runtime configuration.
        const configScript = `<script>window.runtimeConfig = ${JSON.stringify(RuntimeConfig)};</script>`;
        // 2. Inject the script tag right before the closing </head> tag.
        const modifiedIndexHtml = IndexHtmlContent.replace('</head>', `${configScript}</head>`);
        // 3. Upload the modified file to the S3 bucket.
        const putCommand = new client_s3_1.PutObjectCommand({
            Bucket: DestinationBucketName,
            Key: 'index.html',
            Body: modifiedIndexHtml,
            ContentType: 'text/html; charset=utf-8',
        });
        console.log(`Uploading modified index.html to bucket: ${DestinationBucketName}`);
        await s3Client.send(putCommand);
        console.log('Successfully injected runtime config and uploaded index.html.');
        // 4. Send the SUCCESS signal back to CloudFormation.
        await sendCfnResponse(event, 'SUCCESS');
    }
    catch (error) {
        console.error('Failed to inject runtime config:', error);
        // 5. If anything fails, send the FAILED signal back to CloudFormation.
        await sendCfnResponse(event, 'FAILED', undefined, `Failed to process and upload index.html: ${error.message}`);
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWluamVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29uZmlnLWluamVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQWdFO0FBRWhFLDZDQUErQjtBQUMvQiw2QkFBMEI7QUFFMUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRWxDOzs7R0FHRztBQUNILEtBQUssVUFBVSxlQUFlLENBQzVCLEtBQXdDLEVBQ3hDLE1BQTRCLEVBQzVCLElBQTBCLEVBQzFCLE1BQWU7SUFFZixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ2xDLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLE1BQU0sSUFBSSw2Q0FBNkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRTtRQUN2RyxrQkFBa0IsRUFBRyxLQUFhLENBQUMsa0JBQWtCLElBQUksR0FBRyxLQUFLLENBQUMsaUJBQWlCLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRTtRQUN4RyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87UUFDdEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1FBQzFCLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxpQkFBaUI7UUFDMUMsSUFBSSxFQUFFLElBQUk7S0FDWCxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBRTlELE1BQU0sU0FBUyxHQUFHLElBQUksU0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3QyxNQUFNLE9BQU8sR0FBRztRQUNkLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtRQUM1QixJQUFJLEVBQUUsR0FBRztRQUNULElBQUksRUFBRSxTQUFTLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQyxNQUFNO1FBQzNDLE1BQU0sRUFBRSxLQUFLO1FBQ2IsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLEVBQUUsRUFBRSxnQkFBZ0I7WUFDcEMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLE1BQU07U0FDdEM7S0FDRixDQUFDO0lBRUYsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQ3RFLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCO1lBQ3ZELFFBQVEsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMseUNBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM1QixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7Ozs7R0FPRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUF3QyxFQUFpQixFQUFFO0lBQ3ZGLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFL0QsSUFBSSxDQUFDO1FBQ0gsNERBQTREO1FBQzVELElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7WUFDOUQsTUFBTSxlQUFlLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxHQUFHLEtBQUssQ0FBQyxrQkFBeUIsQ0FBQztRQUVuRyxJQUFJLENBQUMscUJBQXFCLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2xFLE1BQU0sSUFBSSxLQUFLLENBQUMseUZBQXlGLENBQUMsQ0FBQztRQUM3RyxDQUFDO1FBRUQsdUVBQXVFO1FBQ3ZFLE1BQU0sWUFBWSxHQUFHLGtDQUFrQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUM7UUFFakcsaUVBQWlFO1FBQ2pFLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLFlBQVksU0FBUyxDQUFDLENBQUM7UUFFeEYsZ0RBQWdEO1FBQ2hELE1BQU0sVUFBVSxHQUFHLElBQUksNEJBQWdCLENBQUM7WUFDdEMsTUFBTSxFQUFFLHFCQUFxQjtZQUM3QixHQUFHLEVBQUUsWUFBWTtZQUNqQixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLFdBQVcsRUFBRSwwQkFBMEI7U0FDeEMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLCtEQUErRCxDQUFDLENBQUM7UUFFN0UscURBQXFEO1FBQ3JELE1BQU0sZUFBZSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztJQUUxQyxDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pELHVFQUF1RTtRQUN2RSxNQUFNLGVBQWUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSw0Q0FBNEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDakgsQ0FBQztBQUNILENBQUMsQ0FBQztBQTNDVyxRQUFBLE9BQU8sV0EyQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUzNDbGllbnQsIFB1dE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgdHlwZSB7IENsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XHJcbmltcG9ydCB7IFVSTCB9IGZyb20gJ3VybCc7XHJcblxyXG5jb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7fSk7XHJcblxyXG4vKipcclxuICogU2VuZHMgYSByZXNwb25zZSBzaWduYWwgdG8gdGhlIENsb3VkRm9ybWF0aW9uIHByZS1zaWduZWQgVVJMLlxyXG4gKiBUaGlzIGlzIGEgbWFuZGF0b3J5IHN0ZXAgZm9yIGFsbCBMYW1iZGEtYmFja2VkIGN1c3RvbSByZXNvdXJjZXMuXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzZW5kQ2ZuUmVzcG9uc2UoXHJcbiAgZXZlbnQ6IENsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VFdmVudCxcclxuICBzdGF0dXM6ICdTVUNDRVNTJyB8ICdGQUlMRUQnLFxyXG4gIGRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG4gIHJlYXNvbj86IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICBTdGF0dXM6IHN0YXR1cyxcclxuICAgIFJlYXNvbjogcmVhc29uIHx8IGBTZWUgdGhlIGRldGFpbHMgaW4gQ2xvdWRXYXRjaCBMb2cgU3RyZWFtOiAke3Byb2Nlc3MuZW52LkFXU19MQU1CREFfTE9HX1NUUkVBTV9OQU1FfWAsXHJcbiAgICBQaHlzaWNhbFJlc291cmNlSWQ6IChldmVudCBhcyBhbnkpLlBoeXNpY2FsUmVzb3VyY2VJZCB8fCBgJHtldmVudC5Mb2dpY2FsUmVzb3VyY2VJZH0tJHtldmVudC5SZXF1ZXN0SWR9YCxcclxuICAgIFN0YWNrSWQ6IGV2ZW50LlN0YWNrSWQsXHJcbiAgICBSZXF1ZXN0SWQ6IGV2ZW50LlJlcXVlc3RJZCxcclxuICAgIExvZ2ljYWxSZXNvdXJjZUlkOiBldmVudC5Mb2dpY2FsUmVzb3VyY2VJZCxcclxuICAgIERhdGE6IGRhdGEsXHJcbiAgfSk7XHJcblxyXG4gIGNvbnNvbGUubG9nKCdTZW5kaW5nIENsb3VkRm9ybWF0aW9uIHJlc3BvbnNlOicsIHJlc3BvbnNlQm9keSk7XHJcblxyXG4gIGNvbnN0IHBhcnNlZFVybCA9IG5ldyBVUkwoZXZlbnQuUmVzcG9uc2VVUkwpO1xyXG4gIGNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICBob3N0bmFtZTogcGFyc2VkVXJsLmhvc3RuYW1lLFxyXG4gICAgcG9ydDogNDQzLFxyXG4gICAgcGF0aDogcGFyc2VkVXJsLnBhdGhuYW1lICsgcGFyc2VkVXJsLnNlYXJjaCxcclxuICAgIG1ldGhvZDogJ1BVVCcsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdjb250ZW50LXR5cGUnOiAnJywgLy8gTXVzdCBiZSBlbXB0eVxyXG4gICAgICAnY29udGVudC1sZW5ndGgnOiByZXNwb25zZUJvZHkubGVuZ3RoLFxyXG4gICAgfSxcclxuICB9O1xyXG5cclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgY29uc3QgcmVxdWVzdCA9IGh0dHBzLnJlcXVlc3Qob3B0aW9ucywgKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBDbG91ZEZvcm1hdGlvbiByZXNwb25zZSBzdGF0dXM6ICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1gKTtcclxuICAgICAgcmVzcG9uc2Uub24oJ2RhdGEnLCAoKSA9PiB7fSk7IC8vIENvbnN1bWUgcmVzcG9uc2UgZGF0YVxyXG4gICAgICByZXNwb25zZS5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJlcXVlc3Qub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzZW5kIENsb3VkRm9ybWF0aW9uIHJlc3BvbnNlOicsIGVycm9yKTtcclxuICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJlcXVlc3Qud3JpdGUocmVzcG9uc2VCb2R5KTtcclxuICAgIHJlcXVlc3QuZW5kKCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIExhbWJkYSBoYW5kbGVyIGlzIGludm9rZWQgYnkgYSBDREsgQ3VzdG9tUmVzb3VyY2UuIEl0cyBqb2IgaXMgdG86XHJcbiAqIDEuIFJlY2VpdmUgdGhlIHJhdyBjb250ZW50IG9mIHRoZSB3ZWIgYXBwJ3MgaW5kZXguaHRtbCBmaWxlLlxyXG4gKiAyLiBSZWNlaXZlIGEgcnVudGltZSBjb25maWd1cmF0aW9uIG9iamVjdCAod2l0aCByZXNvbHZlZCBDREsgdG9rZW4gdmFsdWVzKS5cclxuICogMy4gSW5qZWN0IHRoZSBjb25maWd1cmF0aW9uIGludG8gdGhlIEhUTUwuXHJcbiAqIDQuIFVwbG9hZCB0aGUgbW9kaWZpZWQgaW5kZXguaHRtbCB0byB0aGUgZGVzdGluYXRpb24gUzMgYnVja2V0LlxyXG4gKiA1LiAqKkNydWNpYWxseSwgc2VuZCBhIFNVQ0NFU1Mgb3IgRkFJTEVEIHNpZ25hbCBiYWNrIHRvIENsb3VkRm9ybWF0aW9uLioqXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQ2xvdWRGb3JtYXRpb25DdXN0b21SZXNvdXJjZUV2ZW50KTogUHJvbWlzZTx2b2lkPiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1JlY2VpdmVkIGV2ZW50OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBPbiBzdGFjayBkZWxldGlvbiwgd2UganVzdCBuZWVkIHRvIHNlbmQgYSBTVUNDRVNTIHNpZ25hbC5cclxuICAgIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ0RlbGV0ZScpIHtcclxuICAgICAgY29uc29sZS5sb2coJ1JlcXVlc3RUeXBlIGlzIERlbGV0ZS4gU2VuZGluZyBTVUNDRVNTIHNpZ25hbC4nKTtcclxuICAgICAgYXdhaXQgc2VuZENmblJlc3BvbnNlKGV2ZW50LCAnU1VDQ0VTUycpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgeyBEZXN0aW5hdGlvbkJ1Y2tldE5hbWUsIEluZGV4SHRtbENvbnRlbnQsIFJ1bnRpbWVDb25maWcgfSA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcyBhcyBhbnk7XHJcblxyXG4gICAgaWYgKCFEZXN0aW5hdGlvbkJ1Y2tldE5hbWUgfHwgIUluZGV4SHRtbENvbnRlbnQgfHwgIVJ1bnRpbWVDb25maWcpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIHByb3BlcnRpZXM6IERlc3RpbmF0aW9uQnVja2V0TmFtZSwgSW5kZXhIdG1sQ29udGVudCwgb3IgUnVudGltZUNvbmZpZy4nKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyAxLiBDcmVhdGUgdGhlIHNjcmlwdCB0YWcgd2l0aCB0aGUgc3RyaW5naWZpZWQgcnVudGltZSBjb25maWd1cmF0aW9uLlxyXG4gICAgY29uc3QgY29uZmlnU2NyaXB0ID0gYDxzY3JpcHQ+d2luZG93LnJ1bnRpbWVDb25maWcgPSAke0pTT04uc3RyaW5naWZ5KFJ1bnRpbWVDb25maWcpfTs8L3NjcmlwdD5gO1xyXG5cclxuICAgIC8vIDIuIEluamVjdCB0aGUgc2NyaXB0IHRhZyByaWdodCBiZWZvcmUgdGhlIGNsb3NpbmcgPC9oZWFkPiB0YWcuXHJcbiAgICBjb25zdCBtb2RpZmllZEluZGV4SHRtbCA9IEluZGV4SHRtbENvbnRlbnQucmVwbGFjZSgnPC9oZWFkPicsIGAke2NvbmZpZ1NjcmlwdH08L2hlYWQ+YCk7XHJcblxyXG4gICAgLy8gMy4gVXBsb2FkIHRoZSBtb2RpZmllZCBmaWxlIHRvIHRoZSBTMyBidWNrZXQuXHJcbiAgICBjb25zdCBwdXRDb21tYW5kID0gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICBCdWNrZXQ6IERlc3RpbmF0aW9uQnVja2V0TmFtZSxcclxuICAgICAgS2V5OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIEJvZHk6IG1vZGlmaWVkSW5kZXhIdG1sLFxyXG4gICAgICBDb250ZW50VHlwZTogJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgVXBsb2FkaW5nIG1vZGlmaWVkIGluZGV4Lmh0bWwgdG8gYnVja2V0OiAke0Rlc3RpbmF0aW9uQnVja2V0TmFtZX1gKTtcclxuICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQocHV0Q29tbWFuZCk7XHJcbiAgICBjb25zb2xlLmxvZygnU3VjY2Vzc2Z1bGx5IGluamVjdGVkIHJ1bnRpbWUgY29uZmlnIGFuZCB1cGxvYWRlZCBpbmRleC5odG1sLicpO1xyXG5cclxuICAgIC8vIDQuIFNlbmQgdGhlIFNVQ0NFU1Mgc2lnbmFsIGJhY2sgdG8gQ2xvdWRGb3JtYXRpb24uXHJcbiAgICBhd2FpdCBzZW5kQ2ZuUmVzcG9uc2UoZXZlbnQsICdTVUNDRVNTJyk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbmplY3QgcnVudGltZSBjb25maWc6JywgZXJyb3IpO1xyXG4gICAgLy8gNS4gSWYgYW55dGhpbmcgZmFpbHMsIHNlbmQgdGhlIEZBSUxFRCBzaWduYWwgYmFjayB0byBDbG91ZEZvcm1hdGlvbi5cclxuICAgIGF3YWl0IHNlbmRDZm5SZXNwb25zZShldmVudCwgJ0ZBSUxFRCcsIHVuZGVmaW5lZCwgYEZhaWxlZCB0byBwcm9jZXNzIGFuZCB1cGxvYWQgaW5kZXguaHRtbDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gIH1cclxufTtcclxuIl19