-- R-11-01, R-11-02, E8 · Tenant isolation.
--
-- Scaffold state (F0-04): the assertion below FAILS today (no schema yet) and is
-- wrapped in a pgTAP `todo` block so it reports as an expected failure
-- (`not ok ... # TODO`) without turning the CI `db` job red before F1-02.
--
-- F1-02: replace the body with the real test — connect as `app_panel` with
-- org-A JWT claims and assert that select / insert / update / delete against
-- org-B rows in `tickets` and `scans` ALL fail; break the build if any succeed.
-- Then delete the `todo` / `todo_end` wrapper: once it passes, pg_prove will
-- flag it as "unexpectedly succeeded", which is the signal to un-TODO it.

begin;
select plan(1);

select todo_start('RLS isolation lands in F1-02');
select ok(
  to_regclass('public.tickets') is not null,
  'tickets exists (placeholder for the real org-A/org-B isolation assertions)'
);
select todo_end();

select * from finish();
rollback;
