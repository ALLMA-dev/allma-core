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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const websites_stack_1 = require("../lib/websites-stack");
const app = new cdk.App();
const stage = app.node.tryGetContext('stage');
const account = app.node.tryGetContext('account');
const region = app.node.tryGetContext('region');
const domainName = app.node.tryGetContext('domainName');
const certificateArn = app.node.tryGetContext('certificateArn');
if (!stage || !account || !region) {
    throw new Error('CDK context variables "stage", "account", and "region" must be provided. Example: cdk deploy -c stage=prod -c account=123456789012 -c region=us-east-1');
}
new websites_stack_1.WebsitesStack(app, `AllmaWebsitesStack-${stage}`, {
    env: {
        account,
        region,
    },
    stage,
    domainName,
    certificateArn,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsbWEtd2Vic2l0ZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbGxtYS13ZWJzaXRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsMERBQXNEO0FBRXRELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3hELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFaEUsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0pBQXdKLENBQUMsQ0FBQztBQUM1SyxDQUFDO0FBRUQsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSxzQkFBc0IsS0FBSyxFQUFFLEVBQUU7SUFDcEQsR0FBRyxFQUFFO1FBQ0gsT0FBTztRQUNQLE1BQU07S0FDUDtJQUNELEtBQUs7SUFDTCxVQUFVO0lBQ1YsY0FBYztDQUNmLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBXZWJzaXRlc1N0YWNrIH0gZnJvbSAnLi4vbGliL3dlYnNpdGVzLXN0YWNrJztcclxuXHJcbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XHJcblxyXG5jb25zdCBzdGFnZSA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ3N0YWdlJyk7XHJcbmNvbnN0IGFjY291bnQgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdhY2NvdW50Jyk7XHJcbmNvbnN0IHJlZ2lvbiA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ3JlZ2lvbicpO1xyXG5jb25zdCBkb21haW5OYW1lID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZG9tYWluTmFtZScpO1xyXG5jb25zdCBjZXJ0aWZpY2F0ZUFybiA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2NlcnRpZmljYXRlQXJuJyk7XHJcblxyXG5pZiAoIXN0YWdlIHx8ICFhY2NvdW50IHx8ICFyZWdpb24pIHtcclxuICB0aHJvdyBuZXcgRXJyb3IoJ0NESyBjb250ZXh0IHZhcmlhYmxlcyBcInN0YWdlXCIsIFwiYWNjb3VudFwiLCBhbmQgXCJyZWdpb25cIiBtdXN0IGJlIHByb3ZpZGVkLiBFeGFtcGxlOiBjZGsgZGVwbG95IC1jIHN0YWdlPXByb2QgLWMgYWNjb3VudD0xMjM0NTY3ODkwMTIgLWMgcmVnaW9uPXVzLWVhc3QtMScpO1xyXG59XHJcblxyXG5uZXcgV2Vic2l0ZXNTdGFjayhhcHAsIGBBbGxtYVdlYnNpdGVzU3RhY2stJHtzdGFnZX1gLCB7XHJcbiAgZW52OiB7XHJcbiAgICBhY2NvdW50LFxyXG4gICAgcmVnaW9uLFxyXG4gIH0sXHJcbiAgc3RhZ2UsXHJcbiAgZG9tYWluTmFtZSxcclxuICBjZXJ0aWZpY2F0ZUFybixcclxufSk7XHJcbiJdfQ==