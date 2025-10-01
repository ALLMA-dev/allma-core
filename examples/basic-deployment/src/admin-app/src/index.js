"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const admin_shell_1 = require("@allma/admin-shell");
const icons_react_1 = require("@tabler/icons-react");
// In a real-world scenario, a user would install plugin packages via npm,
// for example: `npm install @some-vendor/allma-reporting-plugin`
// and then import them here.
// For this basic example, we will define a simple "Dashboard" plugin directly.
const DashboardPlugin = {
    id: 'com.allma.example.dashboard',
    name: 'Dashboard',
    getRoutes: () => [
        {
            path: '/dashboard',
            element: (react_1.default.createElement("div", { style: { padding: '1rem' } },
                react_1.default.createElement("h2", null, "Welcome to your Allma Dashboard"),
                react_1.default.createElement("p", null, "This application is dynamically composed from plugins."))),
        },
    ],
    getNavItems: () => [
        {
            label: 'Dashboard',
            path: '/dashboard',
            icon: icons_react_1.IconDashboard,
        },
    ],
};
// The consumer of the Allma platform calls `createAllmaAdminApp` once,
// passing in the array of all the plugins they want to include in their
// customized admin panel.
(0, admin_shell_1.createAllmaAdminApp)({
    plugins: [
        DashboardPlugin,
        // Other plugins would be added here
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxrREFBMEI7QUFDMUIsb0RBQXNFO0FBQ3RFLHFEQUFvRDtBQUVwRCwwRUFBMEU7QUFDMUUsaUVBQWlFO0FBQ2pFLDZCQUE2QjtBQUU3QiwrRUFBK0U7QUFDL0UsTUFBTSxlQUFlLEdBQWdCO0lBQ25DLEVBQUUsRUFBRSw2QkFBNkI7SUFDakMsSUFBSSxFQUFFLFdBQVc7SUFDakIsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2Y7WUFDRSxJQUFJLEVBQUUsWUFBWTtZQUNsQixPQUFPLEVBQUUsQ0FDUCx1Q0FBSyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO2dCQUM3Qiw0RUFBd0M7Z0JBQ3hDLGtHQUE2RCxDQUN6RCxDQUNQO1NBQ0Y7S0FDRjtJQUNELFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNqQjtZQUNFLEtBQUssRUFBRSxXQUFXO1lBQ2xCLElBQUksRUFBRSxZQUFZO1lBQ2xCLElBQUksRUFBRSwyQkFBYTtTQUNwQjtLQUNGO0NBQ0YsQ0FBQztBQUVGLHVFQUF1RTtBQUN2RSx3RUFBd0U7QUFDeEUsMEJBQTBCO0FBQzFCLElBQUEsaUNBQW1CLEVBQUM7SUFDbEIsT0FBTyxFQUFFO1FBQ1AsZUFBZTtRQUNmLG9DQUFvQztLQUNyQztDQUNGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7IGNyZWF0ZUFsbG1hQWRtaW5BcHAsIEFsbG1hUGx1Z2luIH0gZnJvbSAnQGFsbG1hL2FkbWluLXNoZWxsJztcclxuaW1wb3J0IHsgSWNvbkRhc2hib2FyZCB9IGZyb20gJ0B0YWJsZXIvaWNvbnMtcmVhY3QnO1xyXG5cclxuLy8gSW4gYSByZWFsLXdvcmxkIHNjZW5hcmlvLCBhIHVzZXIgd291bGQgaW5zdGFsbCBwbHVnaW4gcGFja2FnZXMgdmlhIG5wbSxcclxuLy8gZm9yIGV4YW1wbGU6IGBucG0gaW5zdGFsbCBAc29tZS12ZW5kb3IvYWxsbWEtcmVwb3J0aW5nLXBsdWdpbmBcclxuLy8gYW5kIHRoZW4gaW1wb3J0IHRoZW0gaGVyZS5cclxuXHJcbi8vIEZvciB0aGlzIGJhc2ljIGV4YW1wbGUsIHdlIHdpbGwgZGVmaW5lIGEgc2ltcGxlIFwiRGFzaGJvYXJkXCIgcGx1Z2luIGRpcmVjdGx5LlxyXG5jb25zdCBEYXNoYm9hcmRQbHVnaW46IEFsbG1hUGx1Z2luID0ge1xyXG4gIGlkOiAnY29tLmFsbG1hLmV4YW1wbGUuZGFzaGJvYXJkJyxcclxuICBuYW1lOiAnRGFzaGJvYXJkJyxcclxuICBnZXRSb3V0ZXM6ICgpID0+IFtcclxuICAgIHtcclxuICAgICAgcGF0aDogJy9kYXNoYm9hcmQnLFxyXG4gICAgICBlbGVtZW50OiAoXHJcbiAgICAgICAgPGRpdiBzdHlsZT17eyBwYWRkaW5nOiAnMXJlbScgfX0+XHJcbiAgICAgICAgICA8aDI+V2VsY29tZSB0byB5b3VyIEFsbG1hIERhc2hib2FyZDwvaDI+XHJcbiAgICAgICAgICA8cD5UaGlzIGFwcGxpY2F0aW9uIGlzIGR5bmFtaWNhbGx5IGNvbXBvc2VkIGZyb20gcGx1Z2lucy48L3A+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICksXHJcbiAgICB9LFxyXG4gIF0sXHJcbiAgZ2V0TmF2SXRlbXM6ICgpID0+IFtcclxuICAgIHtcclxuICAgICAgbGFiZWw6ICdEYXNoYm9hcmQnLFxyXG4gICAgICBwYXRoOiAnL2Rhc2hib2FyZCcsXHJcbiAgICAgIGljb246IEljb25EYXNoYm9hcmQsXHJcbiAgICB9LFxyXG4gIF0sXHJcbn07XHJcblxyXG4vLyBUaGUgY29uc3VtZXIgb2YgdGhlIEFsbG1hIHBsYXRmb3JtIGNhbGxzIGBjcmVhdGVBbGxtYUFkbWluQXBwYCBvbmNlLFxyXG4vLyBwYXNzaW5nIGluIHRoZSBhcnJheSBvZiBhbGwgdGhlIHBsdWdpbnMgdGhleSB3YW50IHRvIGluY2x1ZGUgaW4gdGhlaXJcclxuLy8gY3VzdG9taXplZCBhZG1pbiBwYW5lbC5cclxuY3JlYXRlQWxsbWFBZG1pbkFwcCh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgRGFzaGJvYXJkUGx1Z2luLFxyXG4gICAgLy8gT3RoZXIgcGx1Z2lucyB3b3VsZCBiZSBhZGRlZCBoZXJlXHJcbiAgXSxcclxufSk7XHJcbiJdfQ==