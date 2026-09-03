/**
 * Import fences from §1.1 of plan-implementacion-codigo.md.
 * These fail the build on violation. The target directories do not all exist
 * yet (apps/web lands in Phase 2); each rule simply matches nothing until then.
 *
 *   pnpm boundaries
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'gate-no-server-secrets',
      comment:
        'R-05-02: the validator surface (gate) must never import server-only or ' +
        'key material. An accidental import ships the event key in the hostile ' +
        "device's bundle.",
      severity: 'error',
      from: {
        path: [
          '^apps/web/src/app/\\(gate\\)/',
          '^apps/web/src/gate/',
        ],
      },
      to: {
        path: [
          '^packages/crypto-server/',
          '^apps/web/src/server/',
        ],
      },
    },
    {
      name: 'gate-dependency-allowlist',
      comment:
        'R-11-09 / 150 KB budget: the gate may only depend on an explicit ' +
        'allowlist of packages. Adding a dependency to the validator is a ' +
        'decision, not an accident.',
      severity: 'error',
      from: {
        path: [
          '^apps/web/src/app/\\(gate\\)/',
          '^apps/web/src/gate/',
        ],
      },
      to: {
        dependencyTypes: ['npm'],
        pathNot: [
          'node_modules/(@qr-access/(rules|qr|manifest))/',
          'node_modules/(dexie|@noble)/',
          'node_modules/(react|react-dom|next|scheduler)/',
        ],
      },
    },
    {
      name: 'rules-is-the-graph-root',
      comment:
        'packages/rules is the vertex of the dependency graph: the decision ' +
        'table depends on nothing else in the repo.',
      severity: 'error',
      from: { path: '^packages/rules/' },
      to: {
        path: '^packages/',
        pathNot: '^packages/rules/',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
