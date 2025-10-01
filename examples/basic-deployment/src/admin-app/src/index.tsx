import { createAllmaAdminApp, AllmaPlugin } from '@allma/admin-shell';
import { IconDashboard } from '@tabler/icons-react';

// In a real-world scenario, a user would install plugin packages via npm,
// for example: `npm install @some-vendor/allma-reporting-plugin`
// and then import them here.

// For this basic example, we will define a simple "Dashboard" plugin directly.
const DashboardPlugin: AllmaPlugin = {
  id: 'com.allma.example.dashboard',
  name: 'Dashboard',
  getRoutes: () => [
    {
      path: '/dashboard',
      element: (
        <div style={{ padding: '1rem' }}>
          <h2>Welcome to your Allma Dashboard</h2>
          <p>This application is dynamically composed from plugins.</p>
        </div>
      ),
    },
  ],
  getNavItems: () => [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: IconDashboard,
    },
  ],
};

// The consumer of the Allma platform calls `createAllmaAdminApp` once,
// passing in the array of all the plugins they want to include in their
// customized admin panel.
createAllmaAdminApp({
  plugins: [
    DashboardPlugin,
    // Other plugins would be added here
  ],
});
