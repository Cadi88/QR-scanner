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
  it('defers when nothing in the input is known to be wrong (ask the server)', () => {
    expect(
      evaluate(
        { wellFormed: true, sameEvent: true, ticketExists: true, epochMatch: true, signatureValid: true },
        'client',
      ),
    ).toBe(DEFER);
  });

  it('every row declares a surface and a precedence (guards F0-05 population)', () => {
    for (const row of ROWS) {
      expect(row.applies.length).toBeGreaterThan(0);
      expect(Number.isInteger(row.precedence)).toBe(true);
    }
  });

  describe('client surface — §5.4 pre-screen order', () => {
    it('malformed wins over every other failure (step 1)', () => {
      expect(evaluate({ wellFormed: false, sameEvent: false, ticketExists: false }, 'client')).toBe(
        'malformed',
      );
    });

    it('wrong_event wins over unknown_code (step 2 before step 3)', () => {
      expect(evaluate({ sameEvent: false, ticketExists: false }, 'client')).toBe('wrong_event');
    });

    it('invalid_signature only fires once the earlier steps pass', () => {
      expect(evaluate({ signatureValid: false }, 'client')).toBe('invalid_signature');
    });

    it('never returns admitted — the client always defers on a clean scan', () => {
      expect(
        evaluate(
          { wellFormed: true, sameEvent: true, ticketExists: true, epochMatch: true, signatureValid: true },
          'client',
        ),
      ).not.toBe('admitted');
    });
  });

  describe('db surface — §7.2 diagnosis tree', () => {
    it('admits a valid, in-window, unused ticket', () => {
      expect(
        evaluate(
          { ticketExists: true, sameEvent: true, epochMatch: true, status: 'valid', usesRemaining: true },
          'db',
        ),
      ).toBe('admitted');
    });

    it('out_of_window outranks unknown_code (known spec gap, §7.2)', () => {
      expect(evaluate({ withinWindow: false, ticketExists: false }, 'db')).toBe('out_of_window');
    });

    it('unknown_code wins over wrong_event (ticket not found at all)', () => {
      expect(evaluate({ ticketExists: false, sameEvent: false }, 'db')).toBe('unknown_code');
    });

    it('a void ticket reports revoked, not already_used', () => {
      expect(evaluate({ status: 'void', usesRemaining: true }, 'db')).toBe('revoked');
    });

    it('distinguishes uses_exhausted from already_used on the same status', () => {
      expect(evaluate({ status: 'used', usesRemaining: false }, 'db')).toBe('uses_exhausted');
      expect(evaluate({ status: 'used', usesRemaining: true }, 'db')).toBe('already_used');
    });
  });
});
