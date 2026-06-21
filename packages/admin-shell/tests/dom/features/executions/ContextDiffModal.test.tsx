import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ContextDiffModal } from '../../../../src/features/executions/components/ContextDiffModal.js';
import { renderWithProviders } from '../../../_helpers/render.js';

describe('ContextDiffModal', () => {
  it('renders nothing visible while closed', () => {
    renderWithProviders(
      <ContextDiffModal
        opened={false}
        onClose={() => {}}
        leftContext={{ a: 1 }}
        rightContext={{ a: 2 }}
        title="Context Diff"
      />,
    );
    expect(screen.queryByText('Context Diff')).not.toBeInTheDocument();
  });

  it('renders the modal title and the default before/after column headers when open', () => {
    renderWithProviders(
      <ContextDiffModal
        opened
        onClose={() => {}}
        leftContext={{ status: 'before-value' }}
        rightContext={{ status: 'after-value' }}
        title="Context Diff"
      />,
    );

    expect(screen.getByText('Context Diff')).toBeInTheDocument();
    // The diff viewer mounts with the default column titles when none are supplied.
    expect(screen.getByText('Step Input Context (Before)')).toBeInTheDocument();
    expect(screen.getByText('Final Context After Step (After)')).toBeInTheDocument();
  });

  it('uses the provided left/right column titles', () => {
    renderWithProviders(
      <ContextDiffModal
        opened
        onClose={() => {}}
        leftContext={{}}
        rightContext={{}}
        title="Context Diff"
        leftTitle="Input"
        rightTitle="Output"
      />,
    );

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
  });
});
