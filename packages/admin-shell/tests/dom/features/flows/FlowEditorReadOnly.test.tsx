import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { FlowDefinition } from '@allma/core-types';
import { renderWithProviders } from '../../../_helpers/render.js';

// --- Heavy children stubbed: this test exercises page-level gating, not the canvas. ---
vi.mock('../../../../src/features/flows/editor/components/FlowCanvas.js', () => ({
  FlowCanvas: () => <div data-testid="flow-canvas" />,
}));
vi.mock('../../../../src/features/flows/editor/components/editor-panel/StepPalette.js', () => ({
  StepPalette: () => <div data-testid="step-palette" />,
}));
vi.mock('../../../../src/features/flows/editor/components/editor-panel/StepEditorPanel.js', () => ({
  StepEditorPanel: () => <div data-testid="step-editor-panel" />,
}));
vi.mock('../../../../src/features/flows/editor/components/editor-panel/EdgeEditorPanel.js', () => ({
  EdgeEditorPanel: () => <div data-testid="edge-editor-panel" />,
}));

// @allma/ui-components ships its own @mantine/core copy; stub the two used exports so the
// page renders under the test's MantineProvider without a dual-package context mismatch.
vi.mock('@allma/ui-components', () => ({
  PageContainer: ({ title, rightSection, children }: { title?: ReactNode; rightSection?: ReactNode; children?: ReactNode }) => (
    <div>
      <div>{title}</div>
      <div>{rightSection}</div>
      <div>{children}</div>
    </div>
  ),
  CopyableText: ({ text }: { text?: string }) => <span>{text}</span>,
}));
vi.mock('../../../../src/features/flows/FlowsBreadcrumbs.js', () => ({
  FlowsBreadcrumbs: () => <nav data-testid="breadcrumbs" />,
}));

// react-router params/navigation (MemoryRouter from renderWithProviders stays real).
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ flowId: 'flow-1', version: '1' }), useNavigate: () => vi.fn() };
});

// API hooks: return a code- or visual-owned flow per test.
const getFlowByVersion = vi.fn();
const getFlowConfig = vi.fn();
vi.mock('../../../../src/api/flowService.js', () => ({
  useGetFlowByVersion: () => getFlowByVersion(),
  useGetFlowConfig: () => getFlowConfig(),
  useUpdateFlowVersion: () => ({ mutate: vi.fn(), isPending: false }),
  useUnpublishFlowVersion: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Editor store: a controlled, deterministic state seeded per test.
let storeState: Record<string, unknown>;
vi.mock('../../../../src/features/flows/editor/hooks/useFlowEditorStore.js', () => ({
  default: (selector: (s: Record<string, unknown>) => unknown) => selector(storeState),
}));

import { FlowEditorPage } from '../../../../src/features/flows/editor/FlowEditorPage.js';

const codeFlow = (overrides: Partial<FlowDefinition> = {}): FlowDefinition =>
  ({
    id: 'flow-1',
    name: 'My Flow',
    version: 1,
    isPublished: false,
    authoringSource: 'code',
    startStepInstanceId: 'start',
    steps: {},
    ...overrides,
  }) as unknown as FlowDefinition;

beforeEach(() => {
  vi.clearAllMocks();
  getFlowByVersion.mockReturnValue({ data: codeFlow(), isLoading: false, error: null });
  getFlowConfig.mockReturnValue({ data: { id: 'flow-1', name: 'My Flow', description: '' } });
});

describe('FlowEditorPage read-only enforcement', () => {
  it('opens a code-owned flow read-only: banner shown, Save hidden, canvas/sandbox kept', () => {
    storeState = { flowDefinition: codeFlow(), isDirty: false, nodes: [], setFlow: vi.fn(), clearDirtyState: vi.fn(), deselectAll: vi.fn() };
    renderWithProviders(<FlowEditorPage />);

    // The "Managed in code" banner (the teeth of coexistence).
    expect(screen.getByText(/Edit the source and redeploy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Managed in code/i).length).toBeGreaterThan(0);
    // Structural editing is gated: no Save, no add-steps palette.
    expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save & Close/ })).not.toBeInTheDocument();
    // Unpublish is for published flows, not code-owned ones.
    expect(screen.queryByRole('button', { name: /Unpublish/ })).not.toBeInTheDocument();
    // Viewing + Sandbox stay available: the canvas still mounts.
    expect(screen.getByTestId('flow-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('step-editor-panel')).toBeInTheDocument();
  });

  it('keeps a draft, editor-owned flow fully editable (Save shown, no banner)', () => {
    const visual = codeFlow({ authoringSource: 'visual' });
    getFlowByVersion.mockReturnValue({ data: visual, isLoading: false, error: null });
    storeState = { flowDefinition: visual, isDirty: true, nodes: [], setFlow: vi.fn(), clearDirtyState: vi.fn(), deselectAll: vi.fn() };
    renderWithProviders(<FlowEditorPage />);

    expect(screen.queryByText(/Managed in code/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeInTheDocument();
  });
});
