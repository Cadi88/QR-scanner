import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/generated/**',
      'database.types.ts',
      'supabase/.branches/**',
      'supabase/.temp/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // CommonJS tooling config (dependency-cruiser, etc.).
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    // Scripts and config may use the console freely.
    files: ['**/scripts/**', '**/*.config.{mjs,ts}', 'vitest.workspace.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
