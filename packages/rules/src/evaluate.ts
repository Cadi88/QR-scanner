/**
 * TS evaluator — the client-side implementation of the admission rule (R-12-02).
 * Pure and synchronous: same inputs in, same verdict out, no I/O.
 *
 * The client only observes a subset of `Inputs` (see `Surface`). Rows that the
 * client cannot decide resolve to `defer` — "ask the server".
 */

import { DEFER, type ClientVerdict } from './catalog.js';
import { ROWS, type Inputs, type Row, type Surface } from './decision-table.js';

function rowMatches(row: Row, inputs: Partial<Inputs>): boolean {
  for (const [key, expected] of Object.entries(row.when) as [
    keyof Inputs,
    Inputs[keyof Inputs],
  ][]) {
    if (!(key in inputs)) return false;
    if (inputs[key] !== expected) return false;
  }
  return true;
}

function pickByPrecedence(rows: Row[]): Row | undefined {
  return rows.reduce<Row | undefined>(
    (best, r) => (best === undefined || r.precedence < best.precedence ? r : best),
    undefined,
  );
}

export function evaluate(
  inputs: Partial<Inputs>,
  surface: Surface = 'client',
): ClientVerdict {
  const matching = ROWS.filter((r) => rowMatches(r, inputs));
  if (matching.length === 0) return DEFER;

  const forSurface = matching.filter((r) => r.applies.includes(surface));
  const winner = pickByPrecedence(forSurface.length > 0 ? forSurface : matching);

  if (winner === undefined) return DEFER;
  if (!winner.applies.includes(surface)) return DEFER;
  return winner.expect;
}
