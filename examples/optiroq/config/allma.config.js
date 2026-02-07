"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devConfig = void 0;
const core_types_1 = require("@allma/core-types");
/**
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
    awsAccountId: '871610744338',
    awsRegion: 'us-west-2', // e.g. us-east-1
    stage: core_types_1.Stage.BETA,
    // --- Logging (Override of default value) ---
    logging: {
        logLevel: core_types_1.LogLevel.DEBUG,
    },
    // --- Secrets (Required to store AI LLM API keys) ---
    aiApiKeySecretArn: 'arn:aws:secretsmanager:us-west-2:871610744338:secret:GeminiApiKey-hYr6CY',
    adminApi: {
        domainName: 'allma-api-beta.optiroq.com',
        certificateArn: 'arn:aws:acm:us-west-2:871610744338:certificate/abd60f5e-3018-4e3e-bf2e-d047bd0d7349',
    },
    ses: {
        verifiedDomain: "mail-beta.optiroq.com",
        fromEmailAddress: "agent@mail-beta.optiroq.com"
    },
    initialAllmaConfigPath: "./config/flows",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsbWEuY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWxsbWEuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtEQUFvRDtBQUdwRDs7Ozs7Ozs7R0FRRztBQUNVLFFBQUEsU0FBUyxHQUE2QjtJQUNqRCwwQ0FBMEM7SUFDMUMsWUFBWSxFQUFFLGNBQWM7SUFDNUIsU0FBUyxFQUFFLFdBQVcsRUFBRSxpQkFBaUI7SUFDekMsS0FBSyxFQUFFLGtCQUFLLENBQUMsSUFBSTtJQUVqQiw4Q0FBOEM7SUFDOUMsT0FBTyxFQUFFO1FBQ1AsUUFBUSxFQUFFLHFCQUFRLENBQUMsS0FBSztLQUN6QjtJQUVELHNEQUFzRDtJQUN0RCxpQkFBaUIsRUFBRSwwRUFBMEU7SUFFN0YsUUFBUSxFQUFFO1FBQ1IsVUFBVSxFQUFFLDRCQUE0QjtRQUN4QyxjQUFjLEVBQUUscUZBQXFGO0tBQ3RHO0lBRUQsR0FBRyxFQUFFO1FBQ0gsY0FBYyxFQUFFLHVCQUF1QjtRQUN2QyxnQkFBZ0IsRUFBRSw2QkFBNkI7S0FDaEQ7SUFFRCxzQkFBc0IsRUFBRSxnQkFBZ0I7Q0FDekMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWdlLCBMb2dMZXZlbCB9IGZyb20gJ0BhbGxtYS9jb3JlLXR5cGVzJztcclxuaW1wb3J0IHsgRGVlcFBhcnRpYWwsIFN0YWdlQ29uZmlnIH0gZnJvbSAnQGFsbG1hL2NvcmUtY2RrJztcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBUaGlzIGNvbmZpZ3VyYXRpb24gZGVtb25zdHJhdGVzIGhvdyB0byBvdmVycmlkZSB0aGUgZGVmYXVsdCBzZXR0aW5ncy5cclxuICogT25seSB0aGUgcHJvcGVydGllcyB0aGF0IGRpZmZlciBmcm9tIHRoZSBkZWZhdWx0cyBuZWVkIHRvIGJlIHNwZWNpZmllZC5cclxuICpcclxuICogSU1QT1JUQU5UOlxyXG4gKiAtIFlvdSBNVVNUIHByb3ZpZGUgYGF3c0FjY291bnRJZGAgYW5kIGBhd3NSZWdpb25gLlxyXG4gKiAtIFMzIGJ1Y2tldCBuYW1lcyAoYGFsbG1hRXhlY3V0aW9uVHJhY2VzQnVja2V0TmFtZWApIG11c3QgYmUgZ2xvYmFsbHkgdW5pcXVlLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGRldkNvbmZpZzogRGVlcFBhcnRpYWw8U3RhZ2VDb25maWc+ID0ge1xyXG4gIC8vIC0tLSBDb3JlIEFXUyBFbnZpcm9ubWVudCAoUmVxdWlyZWQpIC0tLVxyXG4gIGF3c0FjY291bnRJZDogJzg3MTYxMDc0NDMzOCcsXHJcbiAgYXdzUmVnaW9uOiAndXMtd2VzdC0yJywgLy8gZS5nLiB1cy1lYXN0LTFcclxuICBzdGFnZTogU3RhZ2UuQkVUQSxcclxuXHJcbiAgLy8gLS0tIExvZ2dpbmcgKE92ZXJyaWRlIG9mIGRlZmF1bHQgdmFsdWUpIC0tLVxyXG4gIGxvZ2dpbmc6IHtcclxuICAgIGxvZ0xldmVsOiBMb2dMZXZlbC5ERUJVRyxcclxuICB9LFxyXG5cclxuICAvLyAtLS0gU2VjcmV0cyAoUmVxdWlyZWQgdG8gc3RvcmUgQUkgTExNIEFQSSBrZXlzKSAtLS1cclxuICBhaUFwaUtleVNlY3JldEFybjogJ2Fybjphd3M6c2VjcmV0c21hbmFnZXI6dXMtd2VzdC0yOjg3MTYxMDc0NDMzODpzZWNyZXQ6R2VtaW5pQXBpS2V5LWhZcjZDWScsXHJcblxyXG4gIGFkbWluQXBpOiB7XHJcbiAgICBkb21haW5OYW1lOiAnYWxsbWEtYXBpLWJldGEub3B0aXJvcS5jb20nLFxyXG4gICAgY2VydGlmaWNhdGVBcm46ICdhcm46YXdzOmFjbTp1cy13ZXN0LTI6ODcxNjEwNzQ0MzM4OmNlcnRpZmljYXRlL2FiZDYwZjVlLTMwMTgtNGUzZS1iZjJlLWQwNDdiZDBkNzM0OScsXHJcbiAgfSxcclxuXHJcbiAgc2VzOiB7XHJcbiAgICB2ZXJpZmllZERvbWFpbjogXCJtYWlsLWJldGEub3B0aXJvcS5jb21cIixcclxuICAgIGZyb21FbWFpbEFkZHJlc3M6IFwiYWdlbnRAbWFpbC1iZXRhLm9wdGlyb3EuY29tXCJcclxuICB9LFxyXG5cclxuICBpbml0aWFsQWxsbWFDb25maWdQYXRoOiBcIi4vY29uZmlnL2Zsb3dzXCIsXHJcbn07XHJcbiJdfQ==