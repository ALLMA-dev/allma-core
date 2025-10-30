
# @allma/admin-shell

[![npm version](https://img.shields.io/npm/v/%40allma%2Fadmin-shell)](https://www.npmjs.com/package/@allma/admin-shell)
[![License](https://img.shields.io/npm/l/%40allma%2Fadmin-shell)](https://github.com/ALLMA-dev/allma-core/blob/main/LICENSE)

This package is a React framework for building a custom administration panel for the Allma platform. It provides the core application shell, including authentication handling (via AWS Amplify/Cognito), a standard layout, and a powerful plugin system for adding features.

## What is Allma?

**Allma is a serverless, event-driven platform designed to build, execute, and manage complex, AI-powered automated workflows, known as `Flows`.** It acts as a "digital factory" for orchestrating sophisticated business processes, combining data integration, conditional logic, and advanced AI capabilities in a robust, scalable, and observable environment built on AWS.

## Key Concept: The Plugin Architecture

The Allma Admin Shell is not a monolithic application; it's a host for plugins. You compose your final user interface by passing an array of plugins to the `createAllmaAdminApp` function.

An `AllmaPlugin` (defined in `@allma/core-types`) is an object that can provide:
-   **`routes`**: An array of React Router elements to add new pages.
-   **`navItems`**: An array of objects to add links to the main sidebar navigation.
-   **`appWrapper`**: A React component to wrap the entire application, useful for adding global context providers.
-   **`headerWidgets`**: A React component to render in the application header.

## Installation

To build an admin panel, you will need several peer dependencies in your React project.

```bash
npm install @allma/admin-shell @allma/core-types react react-dom react-router-dom @mantine/core aws-amplify @aws-amplify/ui-react
```

## Core Usage: Building Your Admin App

The primary export is `createAllmaAdminApp`. You will use this in your application's entrypoint (e.g., `main.tsx`).

**Example `src/main.tsx`:**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createAllmaAdminApp } from '@allma/admin-shell';
import { AllmaPlugin } from '@allma/core-types';
import { IconDashboard } from '@tabler/icons-react';
import { Amplify } from 'aws-amplify';

// --- Step 1: Configure AWS Amplify ---
// These values come from your Allma CDK deployment outputs.
// It's best to provide them via environment variables (e.g., using a .env file with Vite).
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
    },
  },
  API: {
    REST: {
      'AdminApi': {
        endpoint: import.meta.env.VITE_API_BASE_URL,
      }
    }
  }
});


// --- Step 2: Define or Import Your Plugins ---
// A plugin is just an object that conforms to the AllmaPlugin type.
// You can build complex features in separate files or even separate packages.
const dashboardPlugin: AllmaPlugin = {
  name: 'DashboardPlugin',
  routes: [
    {
      path: '/',
      element: <div>Welcome to your Custom Allma Dashboard!</div>,
    },
  ],
  navItems: [
    {
      label: 'Dashboard',
      path: '/',
      icon: IconDashboard,
    },
  ],
};


// --- Step 3: Create and Mount the Allma App ---
// This function initializes the shell, registers your plugins, and renders the app.
createAllmaAdminApp({
  plugins: [
    dashboardPlugin,
    // ...add other plugins here
  ],
});
```

## Contributing

This package is part of the `allma-core` monorepo. We welcome contributions! Please see our main [repository](https://github.com/ALLMA-dev/allma-core) and [contribution guide](https://docs.allma.dev/docs/community/contribution-guide) for more details.

## License

This project is licensed under the Apache-2.0 License.
