import { describe, it, expect } from 'vitest';
import {
  formatPreciseDuration,
  formatFuzzyDurationWithDetail,
} from '../../../src/utils/formatters.js';

describe('formatPreciseDuration', () => {
  it.each([
    [undefined, 'duration n/a'],
    [null, 'duration n/a'],
    [-1, 'duration n/a'],
  ])('returns the n/a sentinel for %s', (input, expected) => {
    expect(formatPreciseDuration(input)).toBe(expected);
  });

  it.each([
    [0, '0 ms'],
    [123, '123 ms'],
    [999, '999 ms'],
  ])('renders sub-second values as raw milliseconds (%i)', (input, expected) => {
    expect(formatPreciseDuration(input)).toBe(expected);
  });

  it.each([
    [1000, '1s'],
    [1234, '1.234s'],
    [1500, '1.5s'],
    [2000, '2s'],
    [60000, '1m'],
    [61234, '1m 1.234s'],
    [3600000, '1h'],
    [3661234, '1h 1m 1.234s'],
    [90061000, '1d 1h 1m 1s'],
  ])('formats %i ms as "%s"', (input, expected) => {
    expect(formatPreciseDuration(input)).toBe(expected);
  });

  it('strips trailing zeros from the fractional second', () => {
    // 1.250s, not 1.250s with padding
    expect(formatPreciseDuration(1250)).toBe('1.25s');
  });
});

describe('formatFuzzyDurationWithDetail', () => {
  it('reports invalid dates', () => {
    expect(formatFuzzyDurationWithDetail('not-a-date', '2020-01-01')).toBe('Invalid date');
  });

  it('appends a seconds detail for sub-minute spans', () => {
    const start = new Date('2020-01-01T00:00:00.000Z');
    const end = new Date('2020-01-01T00:00:23.000Z');
    expect(formatFuzzyDurationWithDetail(start, end)).toBe('less than a minute (23 seconds)');
  });

  it('appends a minutes+seconds detail for sub-hour spans', () => {
    const start = new Date('2020-01-01T00:00:00.000Z');
    const end = new Date('2020-01-01T00:05:30.000Z');
    // date-fns formatDistance rounds the fuzzy part (5m30s → "6 minutes"); the precise
    // detail in parentheses is the exact value.
    expect(formatFuzzyDurationWithDetail(start, end)).toBe('6 minutes (5m, 30s)');
  });

  it('appends an hour/minute detail for multi-hour spans', () => {
    const start = new Date('2020-01-01T00:00:00.000Z');
    const end = new Date('2020-01-01T02:30:00.000Z');
    expect(formatFuzzyDurationWithDetail(start, end)).toBe('about 3 hours (2h 30m)');
  });
});
