import { createAllmaAdminApp } from '../createAllmaAdminApp';
import { IconDashboard, IconBug } from '@tabler/icons-react';
import type { AllmaPlugin } from '../types/plugin.ts';

// This is a mock dashboard component for testing purposes.
const MockDashboard = () => <div style={{ padding: '1rem' }}><h2>Mock Dashboard</h2><p>This is a test component from the harness.</p></div>;

// This is a mock bug reporting component for testing purposes.
const MockBugReport = () => <div style={{ padding: '1rem' }}><h2>Mock Bug Report</h2><p>Report a bug here.</p></div>;


// --- Mock Plugin Definitions ---
// In a real scenario, a developer would `npm link` their own plugin package
// and import it here instead of defining it inline.

const dashboardPlugin: AllmaPlugin = {
  id: 'com.allma.harness.dashboard',
  name: 'Dashboard',
  getRoutes: () => [
    { path: '/dashboard', element: <MockDashboard /> },
  ],
  getNavItems: () => [
    { label: 'Dashboard', path: '/dashboard', icon: IconDashboard },
  ],
};

const bugReportPlugin: AllmaPlugin = {
  id: 'com.allma.harness.bug-report',
  name: 'Bug Reporter',
  getRoutes: () => [
    { path: '/bugs', element: <MockBugReport /> },
  ],
  getNavItems: () => [
    { label: 'Report a Bug', path: '/bugs', icon: IconBug },
  ],
  // Example of a Header Widget
  HeaderWidget: () => <button onClick={() => alert('Widget clicked!')}>Report</button>,
};


// Create the application using the mock plugins
createAllmaAdminApp({
  plugins: [
    dashboardPlugin,
    bugReportPlugin,
    // A developer would add their linked plugin here, e.g.,
    // myAwesomePlugin
  ],
});
