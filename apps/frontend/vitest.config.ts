import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';
import relay from 'vite-plugin-relay';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@app': fileURLToPath(new URL('./app', import.meta.url)),
      '@generated': fileURLToPath(new URL('./__generated__', import.meta.url)),
      '@graphql': fileURLToPath(new URL('./graphql', import.meta.url)),
      '@messages': fileURLToPath(new URL('./messages', import.meta.url)),
      '@public': fileURLToPath(new URL('./public', import.meta.url)),
      '@styles': fileURLToPath(new URL('./styles', import.meta.url)),
      '@filigran/ui/clients': fileURLToPath(
        new URL(
          './src/components/filigran-ui/components/clients/index.ts',
          import.meta.url
        )
      ),
      '@filigran/ui/servers': fileURLToPath(
        new URL(
          './src/components/filigran-ui/components/servers/index.ts',
          import.meta.url
        )
      ),
      '@filigran/ui/auto-form': fileURLToPath(
        new URL(
          './src/components/filigran-ui/components/auto-form/index.ts',
          import.meta.url
        )
      ),
      '@filigran/ui': fileURLToPath(
        new URL('./src/components/filigran-ui/index.ts', import.meta.url)
      ),
    },
  },
  ssr: {
    noExternal: [/@uiw\/.*/],
  },
  plugins: [react() as PluginOption, relay as PluginOption],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setup-vitest.ts',
    include: ['src/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        inline: ['@uiw/react-md-editor', '@uiw/react-markdown-preview'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['./src/**', './app/**'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.mjs',
        '**/*.config.*',
        '**/__generated__/**',
        '*.lintstagedrc.js',
        'middleware.ts',
        'graphql/mocks.ts',
        'graphql/generated.ts',
      ],
    },
  },
});
