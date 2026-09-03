# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

QR-based access control for large events: attendees hold a ticket whose QR payload is a
**signed short token** (`v|ev|tkt|ep|sig`, Crockford Base32, HMAC signature — not an opaque
UUID). Door staff scan it on a zero-install PWA that validates **offline** against a signed
binary manifest, queues scans locally, and reconciles when the network returns. Duplicate,
revoked, out-of-window and wrong-event scans are rejected; every attempt is audited.

The repo is an early-stage **pnpm + Turborepo monorepo**. It is being built to
`plan-implementacion-codigo.md` (the implementation plan, kept outside the repo), which is
the companion to the `proyecto-acceso-qr.md` spec. **The plan is the source of truth for
scope, sequencing and the open design questions** — read it before non-trivial work.

### Status: Phase 0 (foundations) in progress

Done or scaffolded:

- **F0-01** toolchain — `package.json` (pnpm pinned, Node ≥22), `tsconfig.base.json`
  (`strict` + `noUncheckedIndexedAccess`), `eslint.config.mjs`, `.dependency-cruiser.cjs`
  (the three §1.1 import fences), `turbo.json` tasks.
- **F0-02** `supabase/migrations/20260902120000_roles.sql` — `app_validator`, `app_panel`,
  `app_migrator`, `app_fn_owner`. The initial-commit prototype migration was removed (see
  `supabase/migrations/README.md`).
- **F0-04** test harness — Vitest workspace (`unit`, `db`), pgTAP guard tests
  (`supabase/tests/security_definer_guard.sql`, `rls_isolation.sql` — the latter is
  intentionally red until F1-02), Toxiproxy + k6 skeletons under `tests/`.
- **F0-06** `.github/workflows/ci.yml` — `lint`/`typecheck`/`unit`/`db` real; `bundle-budget`,
  `e2e`, `no-deploy-on-event-day` stubbed until later phases.

Blocked / scaffold-only (need input — see `plan` §"Open decisions"):

- **F0-03** `packages/crypto-server` — `KmsClient` interface + `DeterministicKms` dev stub +
  `KeyService`. Real AWS KMS impl and the "which runtime calls KMS" decision are pending.
- **F0-05** `packages/rules` — decision-table *types* (`Inputs`, `Row` with `precedence` and
  `applies`), `evaluate()`, `gen-golden.ts`. `ROWS` and the §8 result-code catalog are
  empty pending the spec.

Not started: everything in `apps/*` (Next.js 15 PWA — Phase 2), the real schema (F1-01),
`redeem_ticket()`/`sync_batch()` (F1-03 / F2-06), `packages/qr`, `packages/manifest`.

## Commands

Package manager is **pnpm**. The Supabase CLI is a devDependency — run it with `pnpm supabase ...`.

| Task | Command |
| --- | --- |
| Lint (+ import fences) | `pnpm lint` then `pnpm boundaries` |
| Typecheck all packages | `pnpm typecheck` |
| Unit tests (Vitest workspace) | `pnpm test` |
| Regenerate golden fixtures (must be deterministic) | `pnpm gen:golden` |
| Start / stop local Supabase stack | `pnpm supabase start` / `pnpm supabase stop` |
| Rebuild schema from migrations + `seed.sql` | `pnpm supabase db reset` |
| pgTAP suite | `pnpm supabase test db` (or `pnpm test:db`) |
| New migration file | `pnpm supabase migration new <name>` |
| Regenerate `database.types.ts` | `pnpm gen:types` |

Local Studio: http://127.0.0.1:54323 · API: http://127.0.0.1:54321 · DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

## Layout

- `packages/rules/` — ⭐ the admission rule as data. **Imports nothing else in the repo**
  (enforced by dependency-cruiser). Compiled into three implementations: `evaluate.ts`
  (client), `redeem_ticket()` (Postgres), and the golden fixtures both are tested against.
- `packages/crypto-server/` — KMS facade + key derivation. **Never imported by the gate**
  (`apps/web/src/app/(gate)/**`, `apps/web/src/gate/**`) — enforced.
- `supabase/migrations/` — forward-only; a migration that ran in CI is never edited. See
  `supabase/migrations/README.md` (naming: keep the CLI timestamp format).
- `supabase/tests/` — pgTAP. `generated/golden_cases.sql` is emitted by `gen:golden`.
- `tests/chaos/` (Toxiproxy, E10), `tests/load/` (k6, E11) — skeletons.
- `apps/*` / `packages/{qr,manifest}` — planned, absent.

## Conventions

- TypeScript everywhere; `strict` + `noUncheckedIndexedAccess`. ESM (`"type": "module"`,
  `verbatimModuleSyntax`) — relative imports carry the `.js` extension.
- Any PR touching the admission rule (`decision-table.ts`, `evaluate.ts`, `redeem_ticket()`)
  must regenerate `golden.json` and have both sides green — CI fails on fixture drift.
- Any PR adding a dependency to the `/puerta` (gate) tree needs justification and the
  bundle-budget gate green (§1.2 of the plan; ≤150 KB gz).
- `config.toml` `site_url` assumes a frontend on `127.0.0.1:3000`.
- `database.types.ts` was checked in as UTF-16LE in the initial commit; `pnpm gen:types`
  normalizes it to UTF-8. Regenerate whenever a migration changes the schema.
- `supabase/snippets/` — Studio scratch queries, not part of the app.
