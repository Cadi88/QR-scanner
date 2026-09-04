/**
 * Result-code catalog — §8 of proyecto-acceso-qr.md.
 *
 * 15 codes. `device_not_enrolled` and `rate_limited` never appear as a
 * `scans.result` value: the former is raised as a Postgres exception before
 * `redeem_ticket()`'s diagnosis logic runs (§7.2 step 0 — device lookup),
 * the latter is applied client-side (§11.2) as scan friction, not a verdict.
 * `clock_skew` is likewise not a mutually-exclusive verdict: it is recorded
 * as `scans.clock_skewed`, orthogonal to `result` (§7.2, `v_skew`). None of
 * these three participate in `decision-table.ts`'s `ROWS`.
 */

export const RESULT_CODES = [
  'admitted',
  'already_used',
  'uses_exhausted',
  'revoked',
  'unknown_code',
  'wrong_event',
  'stale_epoch',
  'out_of_window',
  'invalid_signature',
  'malformed',
  'ticket_misconfigured',
  'replay_blocked',
  'clock_skew',
  'device_not_enrolled',
  'rate_limited',
] as const;

export type ResultCode = (typeof RESULT_CODES)[number];

/** Client-only verdict for rows that only the database can decide (see `applies`). */
export const DEFER = 'defer' as const;
export type ClientVerdict = ResultCode | typeof DEFER;

export type Severity = 'info' | 'warn' | 'alert';

export type Presentation = {
  /** Whether this result grants entry. */
  admits: boolean;
  severity: Severity;
  /** Operator-facing description, §8. */
  operatorHint: string;
};

/**
 * §8 verbatim. R-08-03 requires each code to have a distinct colour and
 * sound in the `/puerta` UI — those are literal assets, a Phase 2 concern,
 * not spec data, so they are not modelled here.
 */
export const CATALOG: Record<ResultCode, Presentation> = {
  admitted: {
    admits: true,
    severity: 'info',
    operatorHint: 'Verde. Nombre corto y tipo de boleto.',
  },
  already_used: {
    admits: false,
    severity: 'alert',
    operatorHint: 'Rojo. Hora y puerta del ingreso real.',
  },
  uses_exhausted: {
    admits: false,
    severity: 'warn',
    operatorHint: 'Rojo. «Abono agotado: 3 de 3 usos».',
  },
  revoked: {
    admits: false,
    severity: 'alert',
    operatorHint: 'Rojo. Boleto anulado o reembolsado.',
  },
  unknown_code: {
    admits: false,
    severity: 'warn',
    operatorHint: 'Rojo. No existe en esta organización.',
  },
  wrong_event: {
    admits: false,
    severity: 'warn',
    operatorHint: 'Ámbar. Nombra el evento correcto.',
  },
  stale_epoch: {
    admits: false,
    severity: 'alert',
    operatorHint: 'Rojo. QR reemplazado por transferencia.',
  },
  out_of_window: {
    admits: false,
    severity: 'warn',
    operatorHint: 'Ámbar. Indica la hora de apertura.',
  },
  invalid_signature: {
    admits: false,
    severity: 'alert',
    operatorHint: 'Rojo. Solo se produce en el dispositivo.',
  },
  malformed: {
    admits: false,
    severity: 'info',
    operatorHint: 'Rojo. No es un código del sistema.',
  },
  ticket_misconfigured: {
    admits: false,
    severity: 'alert',
    operatorHint: 'Ámbar. Problema de datos, no del asistente.',
  },
  replay_blocked: {
    admits: false,
    severity: 'alert',
    operatorHint: 'Solo en conciliación: duplicado offline resuelto.',
  },
  clock_skew: {
    admits: false,
    severity: 'warn',
    operatorHint: 'Marca en la auditoría; no niega el acceso.',
  },
  device_not_enrolled: {
    admits: false,
    severity: 'alert',
    operatorHint: 'Excepción de API; no llega a pantalla.',
  },
  rate_limited: {
    admits: false,
    severity: 'warn',
    operatorHint: 'Requiere confirmación de supervisor (§11.2).',
  },
};
