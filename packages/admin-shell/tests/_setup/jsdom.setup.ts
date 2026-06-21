import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * jsdom lacks a few browser APIs that Mantine and reactflow touch on mount. Stub them so
 * component tests don't explode on render. Kept minimal — add only what a real test needs.
 */

// Mantine reads matchMedia for color-scheme / responsive hooks.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// reactflow / Mantine ScrollArea observe element size.
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
