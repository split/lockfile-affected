import { describe, expect, it } from 'vitest';
import { formatAffectedOutput } from './format-affected-output.js';

describe('formatAffectedOutput', () => {
  const packages = ['app-a', 'app-b', 'utils'];

  it('formats as newline-separated names by default (lines)', () => {
    const result = formatAffectedOutput(packages, 'lines');

    expect(result).toBe('app-a\napp-b\nutils');
  });

  it('formats as JSON array when format is json', () => {
    const result = formatAffectedOutput(packages, 'json');

    expect(JSON.parse(result)).toEqual(['app-a', 'app-b', 'utils']);
  });

  it('returns empty string for lines format when no packages affected', () => {
    const result = formatAffectedOutput([], 'lines');

    expect(result).toBe('');
  });

  it('returns empty JSON array when no packages affected', () => {
    const result = formatAffectedOutput([], 'json');

    expect(JSON.parse(result)).toEqual([]);
  });
});
