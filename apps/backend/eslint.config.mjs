import pluginJs from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import jest from 'eslint-plugin-jest';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
export default defineConfig([
  {
    languageOptions: { globals: globals.node },
    plugins: {
      prettier: eslintConfigPrettier,
      vitest,
      jest,
      unicorn,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.strict,
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/__generated__/**',
    '**/builder/**',
    '**/tests/**',
    '**/src/utils/error/error.util.ts',
  ]),
  {
    files: ['**/*.ts'],
    ignores: [
      '**/model/portal-context.ts',
      '**/*.resolver.ts',
      '**/*.resolver.test.ts',
      '**/security/directive-graphql/**',
      '**/portal.const.ts',
      '**/index.ts',
      '**/pub.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/model/portal-context'],
              importNames: ['PortalContext'],
              message:
                'PortalContext must only be used in the graphql layers (*.resolver.ts, security/directive-graphql/).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.utils.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'vitest/prefer-to-have-length': 'error',
      'jest/prefer-to-be': 'error',
      'jest/valid-expect-in-promise': 'error',
      'vitest/valid-expect': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/no-commented-out-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-import-node-test': 'error',
      'vitest/no-done-callback': 'error',
      'vitest/prefer-hooks-on-top': 'error',
      'vitest/prefer-hooks-in-order': 'error',
      'vitest/prefer-each': 'error',
      'vitest/prefer-lowercase-title': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/tests.const', '**/tests.ts'],
              importNames: ['requestContextAdminUser', 'contextBypassUser'],
              message:
                'Use a dedicated test context helper instead of bypass/admin shared contexts.',
            },
            {
              group: ['**/tests/helper/test.*.helper'],
              message:
                'Import TestHelper from tests/helper/test.helper instead.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='db']",
          message: 'Use TestHelper to make calls to DB in tests.',
        },
      ],
    },
  },
  {
    files: ['**/*.app.ts'],
    rules: {
      // App-layer modules are namespaces of static, decoratable methods
      // (e.g. @RequiresPortalCapability) shared between GraphQL and REST,
      // not stateful instances — a static-only class is the intended shape.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*'],
    ignores: ['**/kanel/public/**', '**/*.js', '**/es-migrations/**'],
    rules: {
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
]);
