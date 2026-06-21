import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Phase 0 smoke test: proves the `dom` project boots — jsdom environment, the setup file
 * (matchMedia / ResizeObserver stubs), React 19 render, and jest-dom matchers all wire up.
 * Real component tests land in Phase 5; this just guards the harness itself.
 */
describe('dom test harness', () => {
  it('renders a React element into jsdom', () => {
    render(<button type="button">click me</button>);
    expect(screen.getByRole('button', { name: 'click me' })).toBeInTheDocument();
  });

  it('exposes the browser API stubs from the setup file', () => {
    expect(window.matchMedia('(min-width: 0px)').matches).toBe(false);
    expect(typeof window.ResizeObserver).toBe('function');
  });
});
