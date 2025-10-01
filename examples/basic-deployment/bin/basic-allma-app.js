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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzaWMtYWxsbWEtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmFzaWMtYWxsbWEtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsOENBQTZDO0FBQzdDLHlEQUFtRDtBQUVuRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixNQUFNLFNBQVMsR0FBRyx3QkFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyx3QkFBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsd0JBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUVwSCxJQUFJLHFCQUFVLENBQUMsR0FBRyxFQUFFLHNCQUFzQixTQUFTLEVBQUUsRUFBRTtJQUNyRDs7cUVBRWlFO0lBRWpFO3VFQUNtRTtJQUNuRSw2RkFBNkY7SUFFN0Y7c0NBQ2tDO0lBQ2pDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSx3QkFBUyxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsd0JBQVMsQ0FBQyxTQUFTLEVBQUU7SUFFdEUsOEZBQThGO0lBQzlGLFdBQVcsRUFBRSx3QkFBUztDQUN2QixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQWxsbWFTdGFjayB9IGZyb20gJ0BhbGxtYS9jb3JlLWNkayc7XHJcbmltcG9ydCB7IGRldkNvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9hbGxtYS5jb25maWcnO1xyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxuXHJcbmNvbnN0IHN0YWdlTmFtZSA9IGRldkNvbmZpZy5zdGFnZSA/IGAke2RldkNvbmZpZy5zdGFnZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKX0ke2RldkNvbmZpZy5zdGFnZS5zbGljZSgxKX1gIDogJ0Rldic7XHJcblxyXG5uZXcgQWxsbWFTdGFjayhhcHAsIGBBbGxtYVBsYXRmb3JtU3RhY2stJHtzdGFnZU5hbWV9YCwge1xyXG4gIC8qIElmIHlvdSBkb24ndCBzcGVjaWZ5ICdlbnYnLCB0aGlzIHN0YWNrIHdpbGwgYmUgZW52aXJvbm1lbnQtYWdub3N0aWMuXHJcbiAgICogQWNjb3VudC9SZWdpb24tZGVwZW5kZW50IGZlYXR1cmVzIGFuZCBjb250ZXh0IGxvb2t1cHMgd2lsbCBub3Qgd29yayxcclxuICAgKiBidXQgYSBzaW5nbGUgc3ludGhlc2l6ZWQgdGVtcGxhdGUgY2FuIGJlIGRlcGxveWVkIGFueXdoZXJlLiAqL1xyXG5cclxuICAvKiBVbmNvbW1lbnQgdGhlIG5leHQgbGluZSB0byBzcGVjaWFsaXplIHRoaXMgc3RhY2sgZm9yIHRoZSBBV1MgQWNjb3VudFxyXG4gICAqIGFuZCBSZWdpb24gdGhhdCBhcmUgaW1wbGllZCBieSB0aGUgY3VycmVudCBDTEkgY29uZmlndXJhdGlvbi4gKi9cclxuICAvLyBlbnY6IHsgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCwgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfSxcclxuXHJcbiAgLyogVW5jb21tZW50IHRoZSBuZXh0IGxpbmUgaWYgeW91IGtub3cgZXhhY3RseSB3aGF0IEFjY291bnQgYW5kIFJlZ2lvbiB5b3VcclxuICAgKiB3YW50IHRvIGRlcGxveSB0aGUgc3RhY2sgdG8uICovXHJcbiAgIGVudjogeyBhY2NvdW50OiBkZXZDb25maWcuYXdzQWNjb3VudElkLCByZWdpb246IGRldkNvbmZpZy5hd3NSZWdpb24gfSxcclxuXHJcbiAgLyogRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vY2RrL2xhdGVzdC9ndWlkZS9lbnZpcm9ubWVudHMuaHRtbCAqL1xyXG4gIHN0YWdlQ29uZmlnOiBkZXZDb25maWcsXHJcbn0pO1xyXG4iXX0=