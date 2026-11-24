import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Config dedicated to recording demo videos against the local stack.
 * Reuses the base config (webServer, setup/teardown projects, baseURL) but:
 *  - always records video, regardless of pass/fail
 *  - runs headed and slowed down so the recording is easy to follow
 *  - disables retries/parallelism noise that would clutter the video output
 *
 * Usage: yarn test:e2e:demo tests/tests_files/demo/<spec>.spec.ts
 */
// Demo specs skip themselves without it, so a regular run never replays their captions.
process.env.E2E_DEMO = '1';

export default defineConfig({
  ...baseConfig,
  retries: 0,
  // Higher slowMo + longer banner displayMs stretch out each test significantly.
  timeout: 300_000,
  reporter: [['list']],
  use: {
    ...baseConfig.use,
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 },
    },
    headless: false,
    launchOptions: {
      slowMo: 500,
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /.*\.teardown\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],
});
