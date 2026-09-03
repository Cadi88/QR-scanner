-- R-12-06 · Every SECURITY DEFINER function in `public` must pin search_path.
--
-- Scaffold state (F0-04): there are no SECURITY DEFINER functions yet, so this
-- passes vacuously. It becomes load-bearing in F1-03 when `redeem_ticket()` is
-- written — the assertion text is kept verbatim so it bites then. The prototype
-- `redeem_ticket` (removed in F0-02) would have failed this.

begin;
select plan(1);

select is_empty(
  $$
  select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and not exists (
       select 1
         from unnest(coalesce(p.proconfig, '{}')) as c
        where c like 'search_path=%'
     )
  $$,
  'every SECURITY DEFINER function pins search_path'
);

select * from finish();
rollback;
