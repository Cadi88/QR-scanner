import { describe, expect, it } from 'vitest';

import { RESULT_CODES, DEFER } from './catalog.js';
import { ROWS } from './decision-table.js';
import { evaluate } from './evaluate.js';

describe('catalog', () => {
  it('has no duplicate result codes', () => {
    expect(new Set(RESULT_CODES).size).toBe(RESULT_CODES.length);
  });
});

describe('evaluate', () => {
  it('defers when the table has no matching row', () => {
    expect(evaluate({ wellFormed: false })).toBe(DEFER);
  });

  it('every row declares a surface and a precedence (guards F0-05 population)', () => {
    for (const row of ROWS) {
      expect(row.applies.length).toBeGreaterThan(0);
      expect(Number.isInteger(row.precedence)).toBe(true);
    }
  });
});
