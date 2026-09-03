/**
 * The admission rule as data — R-12-01, R-12-02.
 *
 * This table is the single source of truth for admission. It is compiled into
 * three implementations (the TS evaluator here, `redeem_ticket()` in Postgres,
 * and the golden fixtures both are tested against). Nothing else in the repo
 * may import this package (see .dependency-cruiser.cjs).
 *
 * BLOCKED (F0-05): `ROWS` is empty until the §8 catalog and the §7.2 diagnosis
 * order are transcribed from proyecto-acceso-qr.md. The types below are the
 * contract; `precedence` and `applies` are the two fields the plan calls out as
 * implicit-in-the-spec and mandatory-to-make-explicit.
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

export const ROWS: readonly Row[] = [];
