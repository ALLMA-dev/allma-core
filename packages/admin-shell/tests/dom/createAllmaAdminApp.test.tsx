import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { AllmaPlugin } from '../../src/types/plugin.js';

// createAllmaAdminApp wires in auth + the whole authenticated app. Mock those boundaries so
// the test exercises only what this module owns: AppWrapper composition and forwarding the
// plugin list to the app. The real plugin consumption (routes/nav/header) lives in
// AuthenticatedApp, which is stubbed here to echo back the plugins it received.
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('@aws-amplify/ui-react', () => ({
  Authenticator: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));
vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }));
vi.mock('../../src/AuthenticatedApp.js', () => ({
  AuthenticatedApp: ({ plugins }: { plugins: AllmaPlugin[] }) => (
    <div data-testid="authenticated-app">{plugins.map((p) => p.id).join(',')}</div>
  ),
}));

import { createAllmaAdminApp } from '../../src/createAllmaAdminApp.js';

beforeEach(() => {
  vi.clearAllMocks();
  window.runtimeConfig = {
    VITE_ADMIN_STAGE_NAME: 'test',
    VITE_AWS_REGION: 'us-east-1',
    VITE_COGNITO_USER_POOL_ID: 'pool',
    VITE_COGNITO_USER_POOL_CLIENT_ID: 'client',
    VITE_API_BASE_URL: 'https://api.test',
  };
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createAllmaAdminApp', () => {
  it('throws a clear error when the root element is missing', () => {
    expect(() => createAllmaAdminApp({ plugins: [] })).toThrow(/root element/i);
  });

  it('forwards the full plugin list to the authenticated app', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    const plugins: AllmaPlugin[] = [
      { id: 'plugin.a', name: 'A' },
      { id: 'plugin.b', name: 'B' },
    ];

    createAllmaAdminApp({ plugins });

    const app = await screen.findByTestId('authenticated-app');
    expect(app).toHaveTextContent('plugin.a,plugin.b');
  });

  it('composes plugin AppWrappers around the app (first plugin outermost)', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    const Outer = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="outer">{children}</div>
    );
    const Inner = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="inner">{children}</div>
    );

    const plugins: AllmaPlugin[] = [
      { id: 'plugin.outer', name: 'Outer', AppWrapper: Outer },
      { id: 'plugin.inner', name: 'Inner', AppWrapper: Inner },
    ];

    createAllmaAdminApp({ plugins });

    await waitFor(() => expect(screen.getByTestId('authenticated-app')).toBeInTheDocument());
    // reduceRight composes so the first plugin's wrapper is the outermost ancestor.
    const outer = screen.getByTestId('outer');
    const inner = screen.getByTestId('inner');
    expect(outer).toContainElement(inner);
    expect(inner).toContainElement(screen.getByTestId('authenticated-app'));
  });
});
