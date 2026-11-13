import { transform } from 'esbuild';
import { defineConfig, type Plugin } from 'vitest/config';

const DECORATOR_LINE = /^\s*@[A-Za-z_$]/m;

// Oxc does not lower TC39 decorators yet (https://github.com/oxc-project/oxc/issues/9170), so esbuild does it here.
// Its transform ignores tsconfig.json: keep the target in step with the tsconfig and builder/prod/prod.js.
// Remove this plugin once Oxc supports them.
const lowerDecorators = (): Plugin => ({
  name: 'lower-decorators',
  enforce: 'pre',
  async transform(code, id) {
    const [file = id] = id.split('?');
    if (
      !file.endsWith('.ts') ||
      file.includes('/node_modules/') ||
      !DECORATOR_LINE.test(code)
    ) {
      return null;
    }
    const result = await transform(code, {
      loader: 'ts',
      target: 'es2022',
      sourcemap: true,
      sourcefile: file,
    });
    return { code: result.code, map: result.map };
  },
});

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    globalSetup: './tests/config-test.ts',
    setupFiles: './tests/setup-test.ts',
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['./**/*.ts'],
      exclude: [
        'builder/**',
        'src/__generated__/**',
        'src/migrations/**',
        'src/es-migrations/**',
        'src/seeds/**',
        'tests/**',
        'config/**',
        '.kanelrc.js',
        '**/*.config.*',
        '**/*.d.ts',
        '**/*.mjs',
        '**/*.json',
      ],
    },
  },
  plugins: [lowerDecorators()],
});
