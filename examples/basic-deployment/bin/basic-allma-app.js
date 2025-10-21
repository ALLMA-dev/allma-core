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
const allma_config_1 = require("../config/allma.config");
const path = __importStar(require("path"));
const app = new cdk.App();
const stageName = allma_config_1.devConfig.stage ? `${allma_config_1.devConfig.stage.charAt(0).toUpperCase()}${allma_config_1.devConfig.stage.slice(1)}` : 'Dev';
new core_cdk_1.AllmaStack(app, `AllmaPlatformStack-${stageName}`, {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    /* Uncomment the next line if you know exactly what Account and Region you
     * want to deploy the stack to. */
    env: { account: allma_config_1.devConfig.awsAccountId, region: allma_config_1.devConfig.awsRegion },
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
    stageConfig: allma_config_1.devConfig,
    adminShell: {
        assetPath: path.join(__dirname, '../src/admin-app/dist'),
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzaWMtYWxsbWEtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmFzaWMtYWxsbWEtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsOENBQTZDO0FBQzdDLHlEQUFtRDtBQUNuRCwyQ0FBNkI7QUFFN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsTUFBTSxTQUFTLEdBQUcsd0JBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsd0JBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLHdCQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFFcEgsSUFBSSxxQkFBVSxDQUFDLEdBQUcsRUFBRSxzQkFBc0IsU0FBUyxFQUFFLEVBQUU7SUFDckQ7O3FFQUVpRTtJQUVqRTt1RUFDbUU7SUFDbkUsNkZBQTZGO0lBRTdGO3NDQUNrQztJQUNqQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsd0JBQVMsQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLHdCQUFTLENBQUMsU0FBUyxFQUFFO0lBRXRFLDhGQUE4RjtJQUM5RixXQUFXLEVBQUUsd0JBQVM7SUFFcEIsVUFBVSxFQUFFO1FBQ1YsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDO0tBQzNEO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IEFsbG1hU3RhY2sgfSBmcm9tICdAYWxsbWEvY29yZS1jZGsnO1xyXG5pbXBvcnQgeyBkZXZDb25maWcgfSBmcm9tICcuLi9jb25maWcvYWxsbWEuY29uZmlnJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XHJcblxyXG5jb25zdCBzdGFnZU5hbWUgPSBkZXZDb25maWcuc3RhZ2UgPyBgJHtkZXZDb25maWcuc3RhZ2UuY2hhckF0KDApLnRvVXBwZXJDYXNlKCl9JHtkZXZDb25maWcuc3RhZ2Uuc2xpY2UoMSl9YCA6ICdEZXYnO1xyXG5cclxubmV3IEFsbG1hU3RhY2soYXBwLCBgQWxsbWFQbGF0Zm9ybVN0YWNrLSR7c3RhZ2VOYW1lfWAsIHtcclxuICAvKiBJZiB5b3UgZG9uJ3Qgc3BlY2lmeSAnZW52JywgdGhpcyBzdGFjayB3aWxsIGJlIGVudmlyb25tZW50LWFnbm9zdGljLlxyXG4gICAqIEFjY291bnQvUmVnaW9uLWRlcGVuZGVudCBmZWF0dXJlcyBhbmQgY29udGV4dCBsb29rdXBzIHdpbGwgbm90IHdvcmssXHJcbiAgICogYnV0IGEgc2luZ2xlIHN5bnRoZXNpemVkIHRlbXBsYXRlIGNhbiBiZSBkZXBsb3llZCBhbnl3aGVyZS4gKi9cclxuXHJcbiAgLyogVW5jb21tZW50IHRoZSBuZXh0IGxpbmUgdG8gc3BlY2lhbGl6ZSB0aGlzIHN0YWNrIGZvciB0aGUgQVdTIEFjY291bnRcclxuICAgKiBhbmQgUmVnaW9uIHRoYXQgYXJlIGltcGxpZWQgYnkgdGhlIGN1cnJlbnQgQ0xJIGNvbmZpZ3VyYXRpb24uICovXHJcbiAgLy8gZW52OiB7IGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIH0sXHJcblxyXG4gIC8qIFVuY29tbWVudCB0aGUgbmV4dCBsaW5lIGlmIHlvdSBrbm93IGV4YWN0bHkgd2hhdCBBY2NvdW50IGFuZCBSZWdpb24geW91XHJcbiAgICogd2FudCB0byBkZXBsb3kgdGhlIHN0YWNrIHRvLiAqL1xyXG4gICBlbnY6IHsgYWNjb3VudDogZGV2Q29uZmlnLmF3c0FjY291bnRJZCwgcmVnaW9uOiBkZXZDb25maWcuYXdzUmVnaW9uIH0sXHJcblxyXG4gIC8qIEZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Nkay9sYXRlc3QvZ3VpZGUvZW52aXJvbm1lbnRzLmh0bWwgKi9cclxuICBzdGFnZUNvbmZpZzogZGV2Q29uZmlnLFxyXG5cclxuICAgIGFkbWluU2hlbGw6IHtcclxuICAgICAgYXNzZXRQYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vc3JjL2FkbWluLWFwcC9kaXN0JyksXHJcbiAgfSxcclxufSk7XHJcbiJdfQ==