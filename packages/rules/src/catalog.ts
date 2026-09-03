/**
 * Result-code catalog — §8 of proyecto-acceso-qr.md.
 *
 * BLOCKED (F0-05): the authoritative list of ~15 codes, their operator-facing
 * colour/sound, and their precedence order live in §8 of the companion spec,
 * which was out of scope for this pass. The entries below are the codes the
 * *plan document itself* names in F0-05 / F1-03 / F2-08, so downstream types
 * compile — they must be reconciled against §8 before `gen:golden` can reach
 * the "≥60 golden cases, 15 codes represented" close criterion.
 */

export const RESULT_CODES = [
  'admitted',
  'already_used',
  'uses_exhausted',
  'revoked',
  'refunded',
  'transferred',
  'blocked',
  'wrong_event',
  'stale_epoch',
  'out_of_window',
  'bad_signature',
  'unknown_code',
  'malformed',
  'ticket_misconfigured',
  'replay_blocked',
  'clock_skewed',
] as const;

export type ResultCode = (typeof RESULT_CODES)[number];

/** Client-only verdict for rows that only the database can decide (see `applies`). */
export const DEFER = 'defer' as const;
export type ClientVerdict = ResultCode | typeof DEFER;

export type Presentation = {
  /** Operator-facing tone. Reconcile with §8. */
  tone: 'go' | 'stop' | 'warn';
  /** TODO(F0-05): colour + sound come from §8; placeholders here. */
  color: string;
  sound: string;
};

/** TODO(F0-05): populate from §8. Intentionally partial. */
export const CATALOG: Partial<Record<ResultCode, Presentation>> = {};
