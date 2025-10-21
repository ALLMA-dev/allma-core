"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devConfig = void 0;
const core_types_1 = require("@allma/core-types");
/**
 * Example configuration for a 'dev' stage deployment.
 *
 * This configuration demonstrates how to override the default settings.
 * Only the properties that differ from the defaults need to be specified.
 *
 * IMPORTANT:
 * - You MUST provide `awsAccountId` and `awsRegion`.
 * - S3 bucket names (`allmaExecutionTracesBucketName`) must be globally unique.
 */
exports.devConfig = {
    // --- Core AWS Environment (Required) ---
    awsAccountId: '[set your aws account id here]',
    awsRegion: '[set your aws account region here]', // e.g. us-east-1
    stage: core_types_1.Stage.DEV,
    // --- Logging (Override of default value) ---
    logging: {
        logLevel: core_types_1.LogLevel.DEBUG,
    },
    // --- Secrets (Required to store AI LLM API keys) ---
    aiApiKeySecretArn: '',
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsbWEuY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWxsbWEuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtEQUFvRDtBQUdwRDs7Ozs7Ozs7O0dBU0c7QUFDVSxRQUFBLFNBQVMsR0FBNkI7SUFDakQsMENBQTBDO0lBQzFDLFlBQVksRUFBRSxnQ0FBZ0M7SUFDOUMsU0FBUyxFQUFFLG9DQUFvQyxFQUFFLGlCQUFpQjtJQUNsRSxLQUFLLEVBQUUsa0JBQUssQ0FBQyxHQUFHO0lBRWhCLDhDQUE4QztJQUM5QyxPQUFPLEVBQUU7UUFDUCxRQUFRLEVBQUUscUJBQVEsQ0FBQyxLQUFLO0tBQ3pCO0lBRUQsc0RBQXNEO0lBQ3RELGlCQUFpQixFQUFFLEVBQUU7Q0FDdEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWdlLCBMb2dMZXZlbCB9IGZyb20gJ0BhbGxtYS9jb3JlLXR5cGVzJztcclxuaW1wb3J0IHsgRGVlcFBhcnRpYWwsIFN0YWdlQ29uZmlnIH0gZnJvbSAnQGFsbG1hL2NvcmUtY2RrJztcclxuXHJcbi8qKlxyXG4gKiBFeGFtcGxlIGNvbmZpZ3VyYXRpb24gZm9yIGEgJ2Rldicgc3RhZ2UgZGVwbG95bWVudC5cclxuICpcclxuICogVGhpcyBjb25maWd1cmF0aW9uIGRlbW9uc3RyYXRlcyBob3cgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgc2V0dGluZ3MuXHJcbiAqIE9ubHkgdGhlIHByb3BlcnRpZXMgdGhhdCBkaWZmZXIgZnJvbSB0aGUgZGVmYXVsdHMgbmVlZCB0byBiZSBzcGVjaWZpZWQuXHJcbiAqXHJcbiAqIElNUE9SVEFOVDpcclxuICogLSBZb3UgTVVTVCBwcm92aWRlIGBhd3NBY2NvdW50SWRgIGFuZCBgYXdzUmVnaW9uYC5cclxuICogLSBTMyBidWNrZXQgbmFtZXMgKGBhbGxtYUV4ZWN1dGlvblRyYWNlc0J1Y2tldE5hbWVgKSBtdXN0IGJlIGdsb2JhbGx5IHVuaXF1ZS5cclxuICovXHJcbmV4cG9ydCBjb25zdCBkZXZDb25maWc6IERlZXBQYXJ0aWFsPFN0YWdlQ29uZmlnPiA9IHtcclxuICAvLyAtLS0gQ29yZSBBV1MgRW52aXJvbm1lbnQgKFJlcXVpcmVkKSAtLS1cclxuICBhd3NBY2NvdW50SWQ6ICdbc2V0IHlvdXIgYXdzIGFjY291bnQgaWQgaGVyZV0nLFxyXG4gIGF3c1JlZ2lvbjogJ1tzZXQgeW91ciBhd3MgYWNjb3VudCByZWdpb24gaGVyZV0nLCAvLyBlLmcuIHVzLWVhc3QtMVxyXG4gIHN0YWdlOiBTdGFnZS5ERVYsXHJcblxyXG4gIC8vIC0tLSBMb2dnaW5nIChPdmVycmlkZSBvZiBkZWZhdWx0IHZhbHVlKSAtLS1cclxuICBsb2dnaW5nOiB7XHJcbiAgICBsb2dMZXZlbDogTG9nTGV2ZWwuREVCVUcsXHJcbiAgfSxcclxuXHJcbiAgLy8gLS0tIFNlY3JldHMgKFJlcXVpcmVkIHRvIHN0b3JlIEFJIExMTSBBUEkga2V5cykgLS0tXHJcbiAgYWlBcGlLZXlTZWNyZXRBcm46ICcnLFxyXG59O1xyXG4iXX0=