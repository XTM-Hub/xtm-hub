import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';
import unicorn from 'eslint-plugin-unicorn';

const restrictedGlobalTestMocks = new Set([
  'next-intl',
  'next/navigation',
  '@/relay/environment/registry',
  '@/components/error-frontend-log.graphql',
  '@/hooks/use-registered-platforms',
  '@/hooks/use-is-feature-enabled',
]);

const getStringLiteralValue = (node) => {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  return null;
};

const localTestRulesPlugin = {
  rules: {
    'no-remock-shared-globals': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow re-mocking modules already mocked globally in setup-vitest.ts',
        },
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee.type !== 'MemberExpression' ||
              node.callee.object.type !== 'Identifier' ||
              node.callee.object.name !== 'vi' ||
              node.callee.property.type !== 'Identifier' ||
              node.callee.property.name !== 'mock'
            ) {
              return;
            }

            const moduleName = getStringLiteralValue(node.arguments[0]);
            if (!moduleName || !restrictedGlobalTestMocks.has(moduleName)) {
              return;
            }

            context.report({
              node: node.arguments[0],
              message:
                "'{{moduleName}}' is already mocked in setup-vitest.ts. Reuse the shared mock and override it with vi.mocked(...) in tests.",
              data: { moduleName },
            });
          },
        };
      },
    },
  },
};

const localI18nRulesPlugin = {
  rules: {
    'no-literal-string-in-jsx': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow untranslated literal strings in JSX while allowing configured punctuation tokens.',
        },
        schema: [
          {
            type: 'object',
            properties: {
              allowedStrings: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        // Examples from config:
        // - allowedStrings: ':' | '/' | '•' | '('
        // - useful for UI separators that must not be translated.
        const allowedStrings = new Set(
          context.options[0]?.allowedStrings ?? []
        );

        const isAllowedText = (value) => {
          if (typeof value !== 'string') {
            return false;
          }

          const trimmed = value.trim();
          if (!trimmed) {
            return true;
          }

          // Example allowed directly: " - ", "/", "•", "..."
          // because these are separators with no letters/digits.
          if (!/[\p{L}\p{N}]/u.test(trimmed)) {
            return true;
          }

          return allowedStrings.has(trimmed);
        };

        const reportIfLiteralString = (node) => {
          if (
            node.type === 'Literal' &&
            typeof node.value === 'string' &&
            !isAllowedText(node.value)
          ) {
            context.report({
              node,
              message: 'Cannot have untranslated text in JSX',
            });
            return;
          }

          if (
            node.type === 'TemplateLiteral' &&
            node.expressions.length === 0
          ) {
            const templateValue = node.quasis[0]?.value?.cooked ?? '';
            if (!isAllowedText(templateValue)) {
              context.report({
                node,
                message: 'Cannot have untranslated text in JSX',
              });
            }
            return;
          }

          if (node.type === 'BinaryExpression' && node.operator === '+') {
            reportIfLiteralString(node.left);
            reportIfLiteralString(node.right);
            return;
          }

          if (node.type === 'ConditionalExpression') {
            reportIfLiteralString(node.consequent);
            reportIfLiteralString(node.alternate);
            return;
          }

          if (node.type === 'LogicalExpression') {
            reportIfLiteralString(node.left);
            reportIfLiteralString(node.right);
          }
        };

        return {
          // Example flagged: <span>Deployable</span>
          // Example ignored: <span> | </span>
          JSXText(node) {
            if (!isAllowedText(node.value)) {
              context.report({
                node,
                message: 'Cannot have untranslated text in JSX',
              });
            }
          },
          'JSXElement > JSXExpressionContainer'(node) {
            if (node.expression.type === 'JSXEmptyExpression') {
              return;
            }

            reportIfLiteralString(node.expression);
          },
        };
      },
    },
  },
};

const fixedTailwindTextColors = new Set([
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'black',
  'white',
]);

const tailwindOpacityPattern = /^(?:\d{1,3}|\[[^\]]+\])$/u;
const tailwindColorWithOptionalScalePattern = /^([a-z]+)(?:-(\d{1,3}))?$/u;

const isFixedTailwindTextClass = (baseClass) => {
  if (!baseClass.startsWith('text-')) {
    return false;
  }

  const textColorPart = baseClass.slice(5);
  const [colorWithScale, opacity] = textColorPart.split('/', 2);
  if (opacity && !tailwindOpacityPattern.test(opacity)) {
    return false;
  }

  const match = tailwindColorWithOptionalScalePattern.exec(colorWithScale);
  if (!match) {
    return false;
  }

  const [, colorName] = match;
  return fixedTailwindTextColors.has(colorName);
};

const isFixedTailwindBgClass = (baseClass) => {
  if (!baseClass.startsWith('bg-')) {
    return false;
  }

  const bgColorPart = baseClass.slice(3);
  const [bgColor, opacity] = bgColorPart.split('/', 2);
  if (opacity && !tailwindOpacityPattern.test(opacity)) {
    return false;
  }

  return bgColor === 'white' || bgColor === 'gray-500';
};

const containsFixedTailwindColorClass = (classNameSourceCodeValue) =>
  classNameSourceCodeValue.split(/[\s'"`]+/u).some((token) => {
    if (!token) {
      return false;
    }

    const baseClass = token.includes(':')
      ? token.slice(token.lastIndexOf(':') + 1)
      : token;
    return (
      isFixedTailwindTextClass(baseClass) || isFixedTailwindBgClass(baseClass)
    );
  });

const localThemeRulesPlugin = {
  rules: {
    'no-fixed-tailwind-color': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow fixed Tailwind text colors and fixed bg-white/bg-gray-500 classes.',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (
              node.name.type !== 'JSXIdentifier' ||
              node.name.name !== 'className' ||
              !node.value
            ) {
              return;
            }

            const classNameValue = context.sourceCode.getText(node.value);
            if (containsFixedTailwindColorClass(classNameValue)) {
              context.report({
                node: node.value,
                message:
                  'Use theme color tokens instead of fixed Tailwind text colors or bg-white/bg-gray-500.',
              });
            }
          },
        };
      },
    },
  },
};

const eslintConfig = [
  {
    plugins: {
      unicorn,
    },
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'react/destructuring-assignment': ['error', 'always'],
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/no-typos': 'error',
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            'React.FC': {
              message: 'Use a function typed with Props instead',
            },
          },
        },
      ],
      'react-hooks/rules-of-hooks': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': false,
        },
      ],
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
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/^(\\.\\.\\/){2,}/]',
          message: "Avoid deep relative imports. Use '@/...'.",
        },
      ],
    },
  },

  // Default → kebab-case (utils, hooks, etc.)
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/components/**', '**/__generated__/**'],
    rules: {
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
  // Components → PascalCase
  {
    files: ['**/components/**/*.tsx'],
    rules: {
      'unicorn/filename-case': ['error', { case: 'pascalCase' }],
    },
  },
  {
    files: ['**/components/**/*.tsx'],
    ignores: ['**/*.test.tsx', '**/*.spec.tsx'],
    plugins: {
      'xtm-hub-i18n-rules': localI18nRulesPlugin,
    },
    rules: {
      'xtm-hub-i18n-rules/no-literal-string-in-jsx': [
        'error',
        {
          allowedStrings: [
            ' ',
            '*',
            '-',
            ':',
            '/',
            '|',
            '•',
            '·',
            '(',
            ')',
            ',',
            '.',
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__generated__/**',
    ],
    plugins: {
      'xtm-hub-theme-rules': localThemeRulesPlugin,
    },
    rules: {
      'xtm-hub-theme-rules/no-fixed-tailwind-color': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    plugins: {
      'xtm-hub-test-rules': localTestRulesPlugin,
    },
    rules: {
      'xtm-hub-test-rules/no-remock-shared-globals': 'error',
    },
  },

  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'graphql/generated.ts',
      'graphql/mocks.ts',
    ],
  },
  {
    settings: {
      // Fix for ESLint 10+: eslint-plugin-react uses context.getFilename() (legacy API)
      // which was removed in ESLint 10 flat config. Declaring the version explicitly
      // prevents the plugin from trying to auto-detect it and failing.
      react: { version: '19' },
    },
  },
];

export default eslintConfig;
