-- 0001 · Postgres roles (F0-02) — R-04-02, R-04-03, R-12-05.
--
-- The three roles of §4.2 are NOT connection roles in Supabase. PostgREST always
-- connects as `authenticator` and does `SET ROLE <claim "role">`. So the roles
-- are NOLOGIN and granted to `authenticator`:
--
--   device JWTs carry  role: "app_validator"
--   panel  JWTs carry  role: "app_panel"
--
-- `app_migrator` is deliberately NOT granted to `authenticator` (R-04-03): it is
-- only ever assumed by the migration pipeline.
--
-- `app_fn_owner` owns the SECURITY DEFINER functions (redeem_ticket, sync_batch,
-- …). If those were owned by `postgres` — a superuser on Supabase — they would
-- run as superuser. It gets only the privileges those functions need; grants are
-- attached in the migrations that create the tables (F1-01+).
--
-- Migration-naming decision (recorded in migrations/README.md): keep the
-- Supabase CLI timestamp format. The plan's `0001_`, `0002_` labels are
-- nicknames; lexical ordering is preserved either way.

create role app_validator nologin;
create role app_panel     nologin;
create role app_migrator  nologin;
create role app_fn_owner  nologin;

grant app_validator to authenticator;
grant app_panel     to authenticator;
-- intentionally: no `grant app_migrator to authenticator;`

-- Note: the role that runs migrations (with CREATEROLE) is automatically granted
-- ADMIN on each role it creates here, so later migrations can `SET ROLE
-- app_fn_owner` to create/own the SECURITY DEFINER functions without an explicit
-- membership grant.
