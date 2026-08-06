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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsbWEuY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWxsbWEuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtEQUFvRDtBQUdwRDs7Ozs7Ozs7O0dBU0c7QUFDVSxRQUFBLFNBQVMsR0FBNkI7SUFDakQsMENBQTBDO0lBQzFDLFlBQVksRUFBRSxnQ0FBZ0M7SUFDOUMsU0FBUyxFQUFFLG9DQUFvQyxFQUFFLGlCQUFpQjtJQUNsRSxLQUFLLEVBQUUsa0JBQUssQ0FBQyxHQUFHO0lBRWhCLDhDQUE4QztJQUM5QyxPQUFPLEVBQUU7UUFDUCxRQUFRLEVBQUUscUJBQVEsQ0FBQyxLQUFLO0tBQ3pCO0lBRUQsc0RBQXNEO0lBQ3RELGlCQUFpQixFQUFFLEVBQUU7Q0FDdEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWdlLCBMb2dMZXZlbCB9IGZyb20gJ0BhbGxtYS9jb3JlLXR5cGVzJztcbmltcG9ydCB7IERlZXBQYXJ0aWFsLCBTdGFnZUNvbmZpZyB9IGZyb20gJ0BhbGxtYS9jb3JlLWNkayc7XG5cbi8qKlxuICogRXhhbXBsZSBjb25maWd1cmF0aW9uIGZvciBhICdkZXYnIHN0YWdlIGRlcGxveW1lbnQuXG4gKlxuICogVGhpcyBjb25maWd1cmF0aW9uIGRlbW9uc3RyYXRlcyBob3cgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgc2V0dGluZ3MuXG4gKiBPbmx5IHRoZSBwcm9wZXJ0aWVzIHRoYXQgZGlmZmVyIGZyb20gdGhlIGRlZmF1bHRzIG5lZWQgdG8gYmUgc3BlY2lmaWVkLlxuICpcbiAqIElNUE9SVEFOVDpcbiAqIC0gWW91IE1VU1QgcHJvdmlkZSBgYXdzQWNjb3VudElkYCBhbmQgYGF3c1JlZ2lvbmAuXG4gKiAtIFMzIGJ1Y2tldCBuYW1lcyAoYGFsbG1hRXhlY3V0aW9uVHJhY2VzQnVja2V0TmFtZWApIG11c3QgYmUgZ2xvYmFsbHkgdW5pcXVlLlxuICovXG5leHBvcnQgY29uc3QgZGV2Q29uZmlnOiBEZWVwUGFydGlhbDxTdGFnZUNvbmZpZz4gPSB7XG4gIC8vIC0tLSBDb3JlIEFXUyBFbnZpcm9ubWVudCAoUmVxdWlyZWQpIC0tLVxuICBhd3NBY2NvdW50SWQ6ICdbc2V0IHlvdXIgYXdzIGFjY291bnQgaWQgaGVyZV0nLFxuICBhd3NSZWdpb246ICdbc2V0IHlvdXIgYXdzIGFjY291bnQgcmVnaW9uIGhlcmVdJywgLy8gZS5nLiB1cy1lYXN0LTFcbiAgc3RhZ2U6IFN0YWdlLkRFVixcblxuICAvLyAtLS0gTG9nZ2luZyAoT3ZlcnJpZGUgb2YgZGVmYXVsdCB2YWx1ZSkgLS0tXG4gIGxvZ2dpbmc6IHtcbiAgICBsb2dMZXZlbDogTG9nTGV2ZWwuREVCVUcsXG4gIH0sXG5cbiAgLy8gLS0tIFNlY3JldHMgKFJlcXVpcmVkIHRvIHN0b3JlIEFJIExMTSBBUEkga2V5cykgLS0tXG4gIGFpQXBpS2V5U2VjcmV0QXJuOiAnJyxcbn07XG4iXX0=