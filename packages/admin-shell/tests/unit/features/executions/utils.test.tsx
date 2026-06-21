import { describe, it, expect } from 'vitest';
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { getStatusColor, getStatusIcon } from '../../../../src/features/executions/utils.js';

describe('getStatusColor', () => {
  it.each([
    ['COMPLETED', 'green'],
    ['RUNNING', 'blue'],
    ['FAILED', 'red'],
    ['TIMED_OUT', 'orange'],
    ['CANCELLED', 'gray'],
    ['RETRYING_SFN', 'yellow'],
    ['RETRYING_CONTENT', 'yellow'],
  ])('maps %s to %s', (status, color) => {
    expect(getStatusColor(status)).toBe(color);
  });

  it('falls back to "dark" for unknown statuses', () => {
    expect(getStatusColor('SOMETHING_ELSE')).toBe('dark');
  });
});

describe('getStatusIcon', () => {
  it('returns a check for COMPLETED', () => {
    expect(getStatusIcon('COMPLETED').type).toBe(IconCheck);
  });

  it('returns a cross for FAILED', () => {
    expect(getStatusIcon('FAILED').type).toBe(IconX);
  });

  it('returns the info icon for anything else', () => {
    expect(getStatusIcon('RUNNING').type).toBe(IconInfoCircle);
    expect(getStatusIcon('WHATEVER').type).toBe(IconInfoCircle);
  });
});
