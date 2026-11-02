import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: 2,
  /* Parallel test is breaking tests */
  workers: 1,
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      pathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
      stylePath: './tests/screenshot.css',
    },
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    [
      'playwright-ctrf-json-reporter',
      {
        minimal: false,
        screenshot: true,
        annotations: true,
      },
    ],
    [
      'monocart-reporter',
      {
        name: `XTM Hub e2e Report`,
        outputFile: './test-results/report.html',
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3002',

    // Capture screenshot after each test failure.
    screenshot: 'only-on-failure',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    headless: true,
    viewport: { width: 1280, height: 800 }, // or keep Desktop Chrome defaults
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
  },

  /* Configure projects for major browsers */
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
      testIgnore: /platforms\//,
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
    // Against a real OpenCTI or OpenAEV, see xtm-hub-dev/docker-compose-ci-{opencti,openaev}.yml: each project runs
    // the specs of its folder in tests/platforms/.
    ...(['opencti', 'openaev'] as const).map((platform) => ({
      name: platform,
      testMatch: new RegExp(`platforms/${platform}/.*\\.spec\\.ts`),
      use: {
        ...devices['Desktop Chrome'],
        // The platforms only allow plain-http requests on port 80 in their CSP, and the CI Hub runs on
        // http://frontend:3000: without this, OpenCTI cannot check that XTM Hub is reachable and hides its
        // Connect button. In production the Hub is on https, which their CSP allows.
        bypassCSP: true,
      },
    })),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn dev',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:3002',
    reuseExistingServer: true,
  },
});
