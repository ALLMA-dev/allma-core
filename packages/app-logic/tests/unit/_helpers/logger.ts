import { vi } from 'vitest';
import type { MockInstance } from 'vitest';

/**
 * The structured logger in `@allma/core-sdk` writes one JSON line per entry via `console.log`.
 * Rather than mock the logger module (which would defeat the singleton import pattern), we
 * spy on `console.log` and parse the structured entries back out. This keeps test output
 * quiet and lets specs assert on emitted log entries (level, message, details).
 */
export interface CapturedLog {
  level?: string;
  message?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface LogCapture {
  /** Structured entries that parsed as JSON (the logger's normal output). */
  entries: CapturedLog[];
  /** Raw strings passed to console.log, including any non-JSON lines. */
  raw: string[];
  /** Entries whose message contains the given substring. */
  withMessage: (substring: string) => CapturedLog[];
  /** Restore the original console.log. */
  restore: () => void;
}

/**
 * Spy on `console.log` and collect structured log entries. Remember to `restore()` (or rely
 * on Vitest's `clearMocks`/`restoreMocks` between tests).
 */
export const captureLogs = (): LogCapture => {
  const raw: string[] = [];
  const entries: CapturedLog[] = [];

  const spy: MockInstance = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    raw.push(line);
    try {
      entries.push(JSON.parse(line) as CapturedLog);
    } catch {
      // Non-JSON console output (e.g. setup banners) — keep only in `raw`.
    }
  });

  return {
    entries,
    raw,
    withMessage: (substring: string) =>
      entries.filter((e) => typeof e.message === 'string' && e.message.includes(substring)),
    restore: () => spy.mockRestore(),
  };
};
