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
exports.WebsitesStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const path = __importStar(require("path"));
const web_app_deployment_1 = require("./constructs/web-app-deployment");
class WebsitesStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        new web_app_deployment_1.WebAppDeployment(this, `DocsDeployment-${props.stage}`, {
            deploymentId: `AllmaDocs-${props.stage}`,
            assetPath: path.join(__dirname, '../../docs.allma.dev/build'),
            runtimeConfig: {
            // Docs site may not need runtime config, but the prop is required.
            },
            domainName: props.domainName,
            certificateArn: props.certificateArn,
        });
    }
}
exports.WebsitesStack = WebsitesStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic2l0ZXMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJzaXRlcy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQywyQ0FBNkI7QUFDN0Isd0VBQW1FO0FBUW5FLE1BQWEsYUFBYyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxxQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMxRCxZQUFZLEVBQUUsYUFBYSxLQUFLLENBQUMsS0FBSyxFQUFFO1lBQ3hDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSw0QkFBNEIsQ0FBQztZQUM3RCxhQUFhLEVBQUU7WUFDYixtRUFBbUU7YUFDcEU7WUFDRCxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVU7WUFDNUIsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFjO1NBQ3JDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWRELHNDQWNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFdlYkFwcERlcGxveW1lbnQgfSBmcm9tICcuL2NvbnN0cnVjdHMvd2ViLWFwcC1kZXBsb3ltZW50JztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2Vic2l0ZXNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIHN0YWdlOiBzdHJpbmc7XHJcbiAgZG9tYWluTmFtZT86IHN0cmluZztcclxuICBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdlYnNpdGVzU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBXZWJzaXRlc1N0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIG5ldyBXZWJBcHBEZXBsb3ltZW50KHRoaXMsIGBEb2NzRGVwbG95bWVudC0ke3Byb3BzLnN0YWdlfWAsIHtcclxuICAgICAgZGVwbG95bWVudElkOiBgQWxsbWFEb2NzLSR7cHJvcHMuc3RhZ2V9YCxcclxuICAgICAgYXNzZXRQYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vZG9jcy5hbGxtYS5kZXYvYnVpbGQnKSxcclxuICAgICAgcnVudGltZUNvbmZpZzoge1xyXG4gICAgICAgIC8vIERvY3Mgc2l0ZSBtYXkgbm90IG5lZWQgcnVudGltZSBjb25maWcsIGJ1dCB0aGUgcHJvcCBpcyByZXF1aXJlZC5cclxuICAgICAgfSxcclxuICAgICAgZG9tYWluTmFtZTogcHJvcHMuZG9tYWluTmFtZSxcclxuICAgICAgY2VydGlmaWNhdGVBcm46IHByb3BzLmNlcnRpZmljYXRlQXJuLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==