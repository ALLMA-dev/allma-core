#!/usr/bin/env node
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const core_cdk_1 = require("@allma/core-cdk");
const allma_config_js_1 = require("../config/allma.config.js");
const path = __importStar(require("path"));
const optiroq_module_stack_js_1 = require("../lib/optiroq-module.stack.js");
const core_sdk_1 = require("@allma/core-sdk");
const app = new cdk.App();
// Create a complete stage configuration by merging the user-provided overrides
// with the default configuration. This ensures that all required properties are present.
console.log(JSON.stringify(core_cdk_1.defaultConfig));
console.log(JSON.stringify(allma_config_js_1.devConfig));
const stageConfig = (0, core_sdk_1.deepMerge)(core_cdk_1.defaultConfig, allma_config_js_1.devConfig);
console.log(JSON.stringify(stageConfig));
// It's crucial to validate that the AWS account and region are explicitly set.
// The default values are placeholders and must be overridden by the user.
if (!stageConfig.awsAccountId || stageConfig.awsAccountId === 'YOUR_ACCOUNT_ID' || !stageConfig.awsRegion) {
    throw new Error('The `awsAccountId` and `awsRegion` must be set in your `allma.config.ts` file.');
}
const stageName = stageConfig.stage ? `${stageConfig.stage.charAt(0).toUpperCase()}${stageConfig.stage.slice(1)}` : 'Dev';
const stackEnv = { account: stageConfig.awsAccountId, region: stageConfig.awsRegion };
const stackPrefix = `Optiroq-${stageName}`;
new core_cdk_1.AllmaStack(app, `AllmaPlatformStack-${stageName}`, {
    env: stackEnv,
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
    stageConfig,
    adminShell: {
        assetPath: path.join(__dirname, '../src/admin-app/dist'),
        domainName: 'allma-admin-beta.optiroq.com',
        certificateArn: 'arn:aws:acm:us-east-1:871610744338:certificate/54df458a-2b05-454f-a490-ac035b76381f',
    },
});
// Import the ARN of the Allma execution role exported by the AllmaStack
// This is the secure way to grant cross-stack permissions.
const coreStackExportPrefix = `AllmaPlatform-${allma_config_js_1.devConfig.stage}`;
const allmaOrchestrationRoleArn = cdk.Fn.importValue(`${coreStackExportPrefix}-OrchestrationLambdaRoleArn`);
let optiroqStageConfig = stageConfig;
optiroqStageConfig.optiroqApi = {
    domainName: 'api-beta.optiroq.com',
    certificateArn: 'arn:aws:acm:us-west-2:871610744338:certificate/035a55be-44b1-470d-a579-87d8e938b466',
    allowedOrigins: [
        'http://localhost:3000',
        'https://portal-beta.optiroq.com', // Placeholder for beta UI
        'https://portal.optiroq.com', // Placeholder for prod UI
    ]
};
optiroqStageConfig.optiroqPortal = {
    domainName: "portal-beta.optiroq.com",
    certificateArn: "arn:aws:acm:us-east-1:871610744338:certificate/74ed3a77-d696-4f02-84b3-145e1401481c"
};
// Deploy the Optiroq Application Module Stack
new optiroq_module_stack_js_1.OptiroqModuleStack(app, `${stackPrefix}-ModuleStack`, {
    env: stackEnv,
    stageConfig: optiroqStageConfig,
    stageName,
    allmaOrchestrationRoleArn,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aXJvcS1hcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvcHRpcm9xLWFwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBcUM7QUFDckMsaURBQW1DO0FBQ25DLDhDQUF5RTtBQUN6RSwrREFBc0Q7QUFDdEQsMkNBQTZCO0FBQzdCLDRFQUF3RjtBQUN4Riw4Q0FBNEM7QUFFNUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsK0VBQStFO0FBQy9FLHlGQUF5RjtBQUN6RixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQWEsQ0FBQyxDQUFDLENBQUM7QUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDJCQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sV0FBVyxHQUFnQixJQUFBLG9CQUFTLEVBQUMsd0JBQWEsRUFBRSwyQkFBUyxDQUFDLENBQUM7QUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFFekMsK0VBQStFO0FBQy9FLDBFQUEwRTtBQUMxRSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksSUFBSSxXQUFXLENBQUMsWUFBWSxLQUFLLGlCQUFpQixJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzFHLE1BQU0sSUFBSSxLQUFLLENBQ2IsZ0ZBQWdGLENBQ2pGLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDMUgsTUFBTSxRQUFRLEdBQUcsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3RGLE1BQU0sV0FBVyxHQUFHLFdBQVcsU0FBUyxFQUFFLENBQUM7QUFFM0MsSUFBSSxxQkFBVSxDQUFDLEdBQUcsRUFBRSxzQkFBc0IsU0FBUyxFQUFFLEVBQUU7SUFDckQsR0FBRyxFQUFFLFFBQVE7SUFDYiw4RkFBOEY7SUFDOUYsV0FBVztJQUNYLFVBQVUsRUFBRTtRQUNWLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQztRQUN4RCxVQUFVLEVBQUUsOEJBQThCO1FBQzFDLGNBQWMsRUFBRSxxRkFBcUY7S0FDdEc7Q0FDRixDQUFDLENBQUM7QUFFSCx3RUFBd0U7QUFDeEUsMkRBQTJEO0FBQzNELE1BQU0scUJBQXFCLEdBQUcsaUJBQWlCLDJCQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDakUsTUFBTSx5QkFBeUIsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLHFCQUFxQiw2QkFBNkIsQ0FBQyxDQUFDO0FBRTVHLElBQUksa0JBQWtCLEdBQUcsV0FBaUMsQ0FBQztBQUMzRCxrQkFBa0IsQ0FBQyxVQUFVLEdBQUc7SUFDOUIsVUFBVSxFQUFFLHNCQUFzQjtJQUNsQyxjQUFjLEVBQUUscUZBQXFGO0lBQ3JHLGNBQWMsRUFBRTtRQUNkLHVCQUF1QjtRQUN2QixpQ0FBaUMsRUFBRSwwQkFBMEI7UUFDN0QsNEJBQTRCLEVBQU0sMEJBQTBCO0tBQzdEO0NBQ0YsQ0FBQztBQUVGLGtCQUFrQixDQUFDLGFBQWEsR0FBRztJQUNqQyxVQUFVLEVBQUUseUJBQXlCO0lBQ3JDLGNBQWMsRUFBRSxxRkFBcUY7Q0FDdEcsQ0FBQTtBQUdELDhDQUE4QztBQUM5QyxJQUFJLDRDQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsY0FBYyxFQUFFO0lBQ3hELEdBQUcsRUFBRSxRQUFRO0lBQ2IsV0FBVyxFQUFFLGtCQUFrQjtJQUMvQixTQUFTO0lBQ1QseUJBQXlCO0NBQzFCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBBbGxtYVN0YWNrLCBkZWZhdWx0Q29uZmlnLCBTdGFnZUNvbmZpZyB9IGZyb20gJ0BhbGxtYS9jb3JlLWNkayc7XHJcbmltcG9ydCB7IGRldkNvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9hbGxtYS5jb25maWcuanMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBPcHRpcm9xTW9kdWxlU3RhY2ssIE9wdGlyb3FTdGFnZUNvbmZpZyB9IGZyb20gJy4uL2xpYi9vcHRpcm9xLW1vZHVsZS5zdGFjay5qcyc7XHJcbmltcG9ydCB7IGRlZXBNZXJnZSB9IGZyb20gJ0BhbGxtYS9jb3JlLXNkayc7XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xyXG5cclxuLy8gQ3JlYXRlIGEgY29tcGxldGUgc3RhZ2UgY29uZmlndXJhdGlvbiBieSBtZXJnaW5nIHRoZSB1c2VyLXByb3ZpZGVkIG92ZXJyaWRlc1xyXG4vLyB3aXRoIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uIFRoaXMgZW5zdXJlcyB0aGF0IGFsbCByZXF1aXJlZCBwcm9wZXJ0aWVzIGFyZSBwcmVzZW50LlxyXG5jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShkZWZhdWx0Q29uZmlnKSk7XHJcbmNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGRldkNvbmZpZykpO1xyXG5jb25zdCBzdGFnZUNvbmZpZzogU3RhZ2VDb25maWcgPSBkZWVwTWVyZ2UoZGVmYXVsdENvbmZpZywgZGV2Q29uZmlnKTtcclxuY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoc3RhZ2VDb25maWcpKTtcclxuXHJcbi8vIEl0J3MgY3J1Y2lhbCB0byB2YWxpZGF0ZSB0aGF0IHRoZSBBV1MgYWNjb3VudCBhbmQgcmVnaW9uIGFyZSBleHBsaWNpdGx5IHNldC5cclxuLy8gVGhlIGRlZmF1bHQgdmFsdWVzIGFyZSBwbGFjZWhvbGRlcnMgYW5kIG11c3QgYmUgb3ZlcnJpZGRlbiBieSB0aGUgdXNlci5cclxuaWYgKCFzdGFnZUNvbmZpZy5hd3NBY2NvdW50SWQgfHwgc3RhZ2VDb25maWcuYXdzQWNjb3VudElkID09PSAnWU9VUl9BQ0NPVU5UX0lEJyB8fCAhc3RhZ2VDb25maWcuYXdzUmVnaW9uKSB7XHJcbiAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgJ1RoZSBgYXdzQWNjb3VudElkYCBhbmQgYGF3c1JlZ2lvbmAgbXVzdCBiZSBzZXQgaW4geW91ciBgYWxsbWEuY29uZmlnLnRzYCBmaWxlLicsXHJcbiAgKTtcclxufVxyXG5cclxuY29uc3Qgc3RhZ2VOYW1lID0gc3RhZ2VDb25maWcuc3RhZ2UgPyBgJHtzdGFnZUNvbmZpZy5zdGFnZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKX0ke3N0YWdlQ29uZmlnLnN0YWdlLnNsaWNlKDEpfWAgOiAnRGV2JztcclxuY29uc3Qgc3RhY2tFbnYgPSB7IGFjY291bnQ6IHN0YWdlQ29uZmlnLmF3c0FjY291bnRJZCwgcmVnaW9uOiBzdGFnZUNvbmZpZy5hd3NSZWdpb24gfTtcclxuY29uc3Qgc3RhY2tQcmVmaXggPSBgT3B0aXJvcS0ke3N0YWdlTmFtZX1gO1xyXG5cclxubmV3IEFsbG1hU3RhY2soYXBwLCBgQWxsbWFQbGF0Zm9ybVN0YWNrLSR7c3RhZ2VOYW1lfWAsIHtcclxuICBlbnY6IHN0YWNrRW52LFxyXG4gIC8qIEZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Nkay9sYXRlc3QvZ3VpZGUvZW52aXJvbm1lbnRzLmh0bWwgKi9cclxuICBzdGFnZUNvbmZpZyxcclxuICBhZG1pblNoZWxsOiB7XHJcbiAgICBhc3NldFBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9zcmMvYWRtaW4tYXBwL2Rpc3QnKSxcclxuICAgIGRvbWFpbk5hbWU6ICdhbGxtYS1hZG1pbi1iZXRhLm9wdGlyb3EuY29tJyxcclxuICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czphY206dXMtZWFzdC0xOjg3MTYxMDc0NDMzODpjZXJ0aWZpY2F0ZS81NGRmNDU4YS0yYjA1LTQ1NGYtYTQ5MC1hYzAzNWI3NjM4MWYnLFxyXG4gIH0sXHJcbn0pO1xyXG5cclxuLy8gSW1wb3J0IHRoZSBBUk4gb2YgdGhlIEFsbG1hIGV4ZWN1dGlvbiByb2xlIGV4cG9ydGVkIGJ5IHRoZSBBbGxtYVN0YWNrXHJcbi8vIFRoaXMgaXMgdGhlIHNlY3VyZSB3YXkgdG8gZ3JhbnQgY3Jvc3Mtc3RhY2sgcGVybWlzc2lvbnMuXHJcbmNvbnN0IGNvcmVTdGFja0V4cG9ydFByZWZpeCA9IGBBbGxtYVBsYXRmb3JtLSR7ZGV2Q29uZmlnLnN0YWdlfWA7XHJcbmNvbnN0IGFsbG1hT3JjaGVzdHJhdGlvblJvbGVBcm4gPSBjZGsuRm4uaW1wb3J0VmFsdWUoYCR7Y29yZVN0YWNrRXhwb3J0UHJlZml4fS1PcmNoZXN0cmF0aW9uTGFtYmRhUm9sZUFybmApO1xyXG5cclxubGV0IG9wdGlyb3FTdGFnZUNvbmZpZyA9IHN0YWdlQ29uZmlnIGFzIE9wdGlyb3FTdGFnZUNvbmZpZztcclxub3B0aXJvcVN0YWdlQ29uZmlnLm9wdGlyb3FBcGkgPSB7XHJcbiAgZG9tYWluTmFtZTogJ2FwaS1iZXRhLm9wdGlyb3EuY29tJyxcclxuICBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOnVzLXdlc3QtMjo4NzE2MTA3NDQzMzg6Y2VydGlmaWNhdGUvMDM1YTU1YmUtNDRiMS00NzBkLWE1NzktODdkOGU5MzhiNDY2JyxcclxuICBhbGxvd2VkT3JpZ2luczogW1xyXG4gICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXHJcbiAgICAnaHR0cHM6Ly9wb3J0YWwtYmV0YS5vcHRpcm9xLmNvbScsIC8vIFBsYWNlaG9sZGVyIGZvciBiZXRhIFVJXHJcbiAgICAnaHR0cHM6Ly9wb3J0YWwub3B0aXJvcS5jb20nLCAgICAgLy8gUGxhY2Vob2xkZXIgZm9yIHByb2QgVUlcclxuICBdXHJcbn07XHJcblxyXG5vcHRpcm9xU3RhZ2VDb25maWcub3B0aXJvcVBvcnRhbCA9IHtcclxuICBkb21haW5OYW1lOiBcInBvcnRhbC1iZXRhLm9wdGlyb3EuY29tXCIsXHJcbiAgY2VydGlmaWNhdGVBcm46IFwiYXJuOmF3czphY206dXMtZWFzdC0xOjg3MTYxMDc0NDMzODpjZXJ0aWZpY2F0ZS83NGVkM2E3Ny1kNjk2LTRmMDItODRiMy0xNDVlMTQwMTQ4MWNcIlxyXG59XHJcblxyXG5cclxuLy8gRGVwbG95IHRoZSBPcHRpcm9xIEFwcGxpY2F0aW9uIE1vZHVsZSBTdGFja1xyXG5uZXcgT3B0aXJvcU1vZHVsZVN0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LU1vZHVsZVN0YWNrYCwge1xyXG4gIGVudjogc3RhY2tFbnYsXHJcbiAgc3RhZ2VDb25maWc6IG9wdGlyb3FTdGFnZUNvbmZpZyxcclxuICBzdGFnZU5hbWUsXHJcbiAgYWxsbWFPcmNoZXN0cmF0aW9uUm9sZUFybixcclxufSk7XHJcbiJdfQ==