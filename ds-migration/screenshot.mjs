#!/usr/bin/env node
// Captures the screens a migration spec declares, in the light and dark themes, so the build
// session can compare the rendering before and after its change. The images stay local, under
// the git directory, and are never committed.
// Usage:
//   node ds-migration/screenshot.mjs <spec-file> before|after
//   node ds-migration/screenshot.mjs --preflight   the browser starts and the app answers
// Environment: DS_APP_URL (default http://localhost:3012), DS_APP_EMAIL (default admin@filigran.io),
// DS_APP_PASSWORD (default admin): the development seed account.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const APP_URL = process.env.DS_APP_URL ?? 'http://localhost:3012';
const EMAIL = process.env.DS_APP_EMAIL ?? 'admin@filigran.io';
const PASSWORD = process.env.DS_APP_PASSWORD ?? 'admin';
const THEMES = ['light', 'dark'];
const NAVIGATION_TIMEOUT = 120_000; // the dev server compiles a route on its first visit
const SELECTOR_TIMEOUT = 20_000;
// Development overlays only: hiding the toast region would hide the Snackbar migration.
const HIDE_DEV_TOOLS = '#devtools-indicator, nextjs-portal { display: none !important; }';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

// The screens are the JSON block under `## Screens` in the spec.
const readScreens = (specPath) => {
  const text = readFileSync(specPath, 'utf8');
  const kind = text.match(/^kind:\s*([a-z]+)/m)?.[1];
  const block = text.match(/^## Screens\n[\s\S]*?```json\n([\s\S]*?)\n```/m);
  if (!block) fail(`${specPath} has no JSON block under "## Screens"`);
  let screens;
  try {
    screens = JSON.parse(block[1]);
  } catch (error) {
    fail(`The screens of ${specPath} are not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(screens)) fail(`The screens of ${specPath} must be a JSON array`);
  if (!screens.length && kind !== 'cleanup') fail(`${specPath} declares no screen: list at least one`);
  for (const screen of screens) {
    if (!/^[a-z0-9-]+$/.test(screen.name ?? '') || !screen.path?.startsWith('/')) {
      fail(`Each screen needs a kebab-case "name" and a "path" starting with /: ${JSON.stringify(screen)}`);
    }
  }
  return screens;
};

const login = async (browser) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(NAVIGATION_TIMEOUT);
  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('email').fill(EMAIL);
  await page.getByPlaceholder('password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  const state = await context.storageState();
  await context.close();
  return state;
};

const runStep = async (page, step) => {
  if (step.click) return page.locator(step.click).first().click();
  if (step.hover) return page.locator(step.hover).first().hover();
  if (step.waitFor) return page.locator(step.waitFor).first().waitFor();
  throw new Error(`Unknown step ${JSON.stringify(step)}: use click, hover or waitFor`);
};

const capture = async (browser, state, screen, theme, file) => {
  const context = await browser.newContext({
    storageState: state,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: theme,
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  await context.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
  const page = await context.newPage();
  page.setDefaultTimeout(SELECTOR_TIMEOUT);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const checkErrors = () => {
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
  };
  try {
    const response = await page.goto(`${APP_URL}${screen.path}`, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT });
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    if (new URL(page.url()).pathname.includes('/login')) throw new Error('redirected to the login page');
    checkErrors();
    for (const step of screen.steps ?? []) await runStep(page, step);
    await page.addStyleTag({ content: HIDE_DEV_TOOLS });
    const options = { path: file, animations: 'disabled', caret: 'hide' };
    if (screen.clip) await page.locator(screen.clip).first().screenshot(options);
    else await page.screenshot({ ...options, fullPage: true });
    checkErrors();
  } finally {
    await context.close();
  }
};

const args = process.argv.slice(2);
const browser = await chromium.launch();
try {
  if (args[0] === '--preflight') {
    await login(browser);
    console.log(`The browser starts and ${APP_URL} accepts the login`);
  } else {
    const [specPath, phase] = args;
    if (!specPath || !['before', 'after'].includes(phase)) {
      fail('Usage: node ds-migration/screenshot.mjs <spec-file> before|after | --preflight');
    }
    const screens = readScreens(specPath);
    const gitDir = resolve(execFileSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8' }).trim());
    const root = join(gitDir, 'ds-migration', 'screens', basename(specPath, '.md'));
    mkdirSync(join(root, phase), { recursive: true });
    const state = screens.length ? await login(browser) : undefined;
    const failures = [];
    for (const screen of screens) {
      for (const theme of THEMES) {
        const name = `${screen.name}-${theme}.png`;
        try {
          await capture(browser, state, screen, theme, join(root, phase, name));
          console.log(`${screen.name} ${theme}: before ${join(root, 'before', name)} after ${join(root, 'after', name)}`);
        } catch (error) {
          failures.push(`${screen.name} ${theme}: ${error.message.split('\n')[0]}`);
        }
      }
    }
    if (failures.length) fail(`Screens not captured (${phase}):\n${failures.join('\n')}`);
    console.log(`${screens.length * THEMES.length} ${phase} screenshots in ${join(root, phase)}`);
  }
} finally {
  await browser.close();
}
