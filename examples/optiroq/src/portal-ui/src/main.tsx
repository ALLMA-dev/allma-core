import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@aws-amplify/ui-react/styles.css';
import './global.css';

// The Amplify configuration is now handled inside the App component
// to ensure it runs after the environment is fully loaded.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find the root element to mount the application.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);