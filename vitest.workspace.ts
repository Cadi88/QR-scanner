import { defineWorkspace } from 'vitest/config';

/**
 * F0-04 test harness. Three projects were specified; `browser` (Playwright for
 * the PWA) lands in Phase 2.
 */
export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['packages/*/src/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'db',
      // Runs against local Postgres, one transaction per test with rollback.
      // Wired up in Phase 1 alongside the first real schema.
      include: ['supabase/tests/vitest/**/*.test.ts'],
      environment: 'node',
    },
  },
]);
