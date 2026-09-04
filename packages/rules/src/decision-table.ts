/**
 * The admission rule as data — R-12-01, R-12-02.
 *
 * This table is the single source of truth for admission. It is compiled into
 * three implementations (the TS evaluator here, `redeem_ticket()` in Postgres,
 * and the golden fixtures both are tested against). Nothing else in the repo
 * may import this package (see .dependency-cruiser.cjs).
 *
 * Rows are grouped by `applies` surface, each with its own precedence
 * namespace (only rows applicable to a given surface compete for that
 * surface's verdict — see `evaluate()`), transcribed from two different
 * orderings in the spec:
 *
 *  - `client` rows follow §5.4's offline pre-screen (steps 1-5): malformed >
 *    wrong_event > unknown_code > stale_epoch > invalid_signature. The client
 *    never produces `admitted` — once all five checks pass it falls through
 *    to `defer` (no matching row), matching R-05-08 ("solo aquí se consulta
 *    al servidor"). §5.4 step 6 (local-cache screening of revoked/already-used
 *    codes) is a heuristic best-effort check, not modelled here: `Inputs` has
 *    no field for "seen in this device's local cache," only the DB's
 *    authoritative `status`/`usesRemaining`.
 *
 *  - `db` rows follow §7.2's diagnosis tree inside `redeem_ticket()`:
 *    unknown_code > wrong_event > stale_epoch > revoked > uses_exhausted >
 *    already_used. **Known spec gap** (flagged in the F0-05 review, matches
 *    §7.2 verbatim): `out_of_window` is checked *before* the ticket is even
 *    looked up, so it outranks every other db verdict, including
 *    `unknown_code` — an unrecognized code during closed hours reports
 *    `out_of_window`, not `unknown_code`. Reproduced faithfully here (row
 *    `db-out-of-window`, precedence 0) because this package mirrors what
 *    `redeem_ticket()` actually implements, not an idealized spec; revisit
 *    together with `redeem_ticket()` in F1-03 if this should change.
 *
 *  Three §8 codes never appear as a row: `device_not_enrolled` (a Postgres
 *  exception raised before diagnosis starts), `rate_limited` (client-side
 *  friction, §11.2, not a `redeem_ticket()` verdict), and `clock_skew`
 *  (recorded as `scans.clock_skewed`, orthogonal to `result`). `malformed`
 *  and `invalid_signature` are `client`-only per §5.4/§8 ("Solo se produce
 *  en el dispositivo"). `ticket_misconfigured` and `replay_blocked` are not
 *  produced by §7.2's pseudocode as written — the latter is a documented
 *  spec gap (see the F0-05 review: reconciliation, §9.4, never actually
 *  assigns it) that belongs to F2-06 (`sync_batch`), not this table.
 */

import type { ResultCode } from './catalog.js';

export type Inputs = {
  ticketExists: boolean;
  /** ticket.event_id === device.event_id */
  sameEvent: boolean;
  sameOrg: boolean;
  epochMatch: boolean;
  status: 'valid' | 'used' | 'void' | 'refunded' | 'transferred' | 'blocked';
  /** uses_count < max_uses */
  usesRemaining: boolean;
  /** within [gates_open - tolerance, gates_close + tolerance] */
  withinWindow: boolean;
  signatureValid: boolean;
  wellFormed: boolean;
};

/** The subset of `Inputs` a given evaluator can actually observe. */
export type Surface = 'db' | 'client';

export type Row = {
  id: string;
  /** Conditions on the inputs; an absent key matches any value. */
  when: Partial<Inputs>;
  /** Expected code from the §8 catalog. */
  expect: ResultCode;
  /**
   * Diagnosis order from §7.2:
   *   unknown_code > wrong_event > stale_epoch > revoked
   *   > uses_exhausted > already_used
   * Lower number wins. Not derivable from `when`; must be explicit or the two
   * implementations reconstruct it differently and disagree on ambiguous cases.
   */
  precedence: number;
  /**
   * Which evaluators this row constrains. The client does not know real
   * `status`, `withinWindow`, or authoritative `usesRemaining`; rows that only
   * apply to `db` yield the `defer` verdict on the client (ask the server).
   */
  applies: Surface[];
};

export const ROWS: readonly Row[] = [
  // --- client: §5.4 offline pre-screen, steps 1-5 -------------------------
  { id: 'client-malformed', when: { wellFormed: false }, expect: 'malformed', precedence: 1, applies: ['client'] },
  { id: 'client-wrong-event', when: { sameEvent: false }, expect: 'wrong_event', precedence: 2, applies: ['client'] },
  { id: 'client-unknown-code', when: { ticketExists: false }, expect: 'unknown_code', precedence: 3, applies: ['client'] },
  { id: 'client-stale-epoch', when: { epochMatch: false }, expect: 'stale_epoch', precedence: 4, applies: ['client'] },
  { id: 'client-invalid-signature', when: { signatureValid: false }, expect: 'invalid_signature', precedence: 5, applies: ['client'] },

  // --- db: §7.2 redeem_ticket() diagnosis tree -----------------------------
  // Known gap (see file header): checked before ticket lookup, outranks everything.
  { id: 'db-out-of-window', when: { withinWindow: false }, expect: 'out_of_window', precedence: 0, applies: ['db'] },

  // Primary path: mirrors the UPDATE ... WHERE clause exactly.
  {
    id: 'db-admitted',
    when: { ticketExists: true, sameEvent: true, epochMatch: true, status: 'valid', usesRemaining: true },
    expect: 'admitted',
    precedence: 5,
    applies: ['db'],
  },

  // Diagnosis branch, in §7.2's if/elsif order.
  { id: 'db-unknown-code', when: { ticketExists: false }, expect: 'unknown_code', precedence: 10, applies: ['db'] },
  { id: 'db-wrong-event', when: { ticketExists: true, sameEvent: false }, expect: 'wrong_event', precedence: 11, applies: ['db'] },
  { id: 'db-stale-epoch', when: { ticketExists: true, sameEvent: true, epochMatch: false }, expect: 'stale_epoch', precedence: 12, applies: ['db'] },

  { id: 'db-revoked-void', when: { status: 'void' }, expect: 'revoked', precedence: 13, applies: ['db'] },
  { id: 'db-revoked-refunded', when: { status: 'refunded' }, expect: 'revoked', precedence: 13, applies: ['db'] },
  { id: 'db-revoked-blocked', when: { status: 'blocked' }, expect: 'revoked', precedence: 13, applies: ['db'] },

  { id: 'db-uses-exhausted-valid', when: { status: 'valid', usesRemaining: false }, expect: 'uses_exhausted', precedence: 14, applies: ['db'] },
  { id: 'db-uses-exhausted-used', when: { status: 'used', usesRemaining: false }, expect: 'uses_exhausted', precedence: 14, applies: ['db'] },
  { id: 'db-uses-exhausted-transferred', when: { status: 'transferred', usesRemaining: false }, expect: 'uses_exhausted', precedence: 14, applies: ['db'] },

  { id: 'db-already-used-used', when: { status: 'used', usesRemaining: true }, expect: 'already_used', precedence: 15, applies: ['db'] },
  { id: 'db-already-used-transferred', when: { status: 'transferred', usesRemaining: true }, expect: 'already_used', precedence: 15, applies: ['db'] },
];
