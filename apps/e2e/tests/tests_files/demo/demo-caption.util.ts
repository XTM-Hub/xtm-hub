import { Page } from '@playwright/test';

type BannerVariant = 'step' | 'checkpoint';

const BANNER_COLORS: Record<BannerVariant, string> = {
  step: '#7C3AED', // purple - about to do something
  checkpoint: '#059669', // green - verify the result
};

async function showBanner(page: Page, text: string, variant: BannerVariant) {
  await page.evaluate(
    ({ label, background }) => {
      const existing = document.getElementById('demo-step-banner');
      existing?.remove();

      const banner = document.createElement('div');
      banner.id = 'demo-step-banner';
      banner.textContent = label;
      Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '2147483647',
        padding: '16px 24px',
        background,
        color: '#FFFFFF',
        fontSize: '20px',
        fontWeight: '600',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      } satisfies Partial<CSSStyleDeclaration>);

      document.body.appendChild(banner);
    },
    { label: text, background: BANNER_COLORS[variant] }
  );
}

/**
 * Injects a full-screen intro overlay describing the whole test scenario,
 * then waits so a viewer has time to read it before the demo starts.
 *
 * Demo-only utility: not meant for use in regular (non-recorded) e2e specs.
 */
export async function announceIntro(
  page: Page,
  title: string,
  description: string,
  displayMs = 8000
) {
  await page.evaluate(
    ({ title, description }) => {
      const existing = document.getElementById('demo-intro-overlay');
      existing?.remove();

      const overlay = document.createElement('div');
      overlay.id = 'demo-intro-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(17, 24, 39, 0.95)',
        color: '#FFFFFF',
        fontFamily: 'sans-serif',
        padding: '48px',
        textAlign: 'center',
      } satisfies Partial<CSSStyleDeclaration>);

      const titleEl = document.createElement('h1');
      titleEl.textContent = title;
      Object.assign(titleEl.style, {
        fontSize: '32px',
        fontWeight: '700',
        marginBottom: '24px',
      } satisfies Partial<CSSStyleDeclaration>);

      const descriptionEl = document.createElement('p');
      descriptionEl.textContent = description;
      Object.assign(descriptionEl.style, {
        fontSize: '20px',
        lineHeight: '1.6',
        maxWidth: '900px',
        whiteSpace: 'pre-line',
      } satisfies Partial<CSSStyleDeclaration>);

      const container = document.createElement('div');
      container.append(titleEl, descriptionEl);
      overlay.appendChild(container);
      document.body.appendChild(overlay);
    },
    { title, description }
  );

  await page.waitForTimeout(displayMs);

  await page.evaluate(() => {
    document.getElementById('demo-intro-overlay')?.remove();
  });
}

/**
 * Injects the intro overlay of {@link announceIntro}, pre-formatted with the
 * list of data the scenario starts from, so a viewer knows the initial state
 * before any action happens.
 *
 * Demo-only utility: not meant for use in regular (non-recorded) e2e specs.
 */
export async function announceInitialData(
  page: Page,
  scenarioTitle: string,
  data: string[],
  displayMs = 8000
) {
  await announceIntro(
    page,
    scenarioTitle,
    `Initial data for this test:\n${data.map((entry) => `- ${entry}`).join('\n')}`,
    displayMs
  );
}

/**
 * Injects a banner overlay announcing the upcoming demo step, then waits so
 * it's clearly visible in the recording before the step's actions run.
 *
 * Demo-only utility: not meant for use in regular (non-recorded) e2e specs.
 */
export async function announceStep(page: Page, text: string, displayMs = 3000) {
  await showBanner(page, text, 'step');
  await page.waitForTimeout(displayMs);
}

/**
 * Injects a banner overlay describing what to check once a step's actions
 * have completed, then waits so the viewer has time to read the result
 * on screen before the video moves on.
 *
 * Demo-only utility: not meant for use in regular (non-recorded) e2e specs.
 */
export async function announceCheckpoint(
  page: Page,
  text: string,
  displayMs = 4000
) {
  await showBanner(page, text, 'checkpoint');
  await page.waitForTimeout(displayMs);
}

/** Removes the banner injected by {@link announceStep} or {@link announceCheckpoint}, if present. */
export async function clearStepBanner(page: Page) {
  await page.evaluate(() => {
    document.getElementById('demo-step-banner')?.remove();
  });
}

/**
 * Displays a monospace overlay with a DB query and its result so demo videos
 * can prove the backend state, not only UI behavior.
 */
export async function announceDbQueryResult(
  page: Page,
  title: string,
  query: string,
  result: unknown,
  displayMs = 5000
) {
  const serializedResult = JSON.stringify(result, null, 2) ?? 'null';
  await page.evaluate(
    ({ title, query, result }) => {
      const existing = document.getElementById('demo-db-query-overlay');
      existing?.remove();

      const overlay = document.createElement('div');
      overlay.id = 'demo-db-query-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(2, 6, 23, 0.85)',
      } satisfies Partial<CSSStyleDeclaration>);

      const panel = document.createElement('div');
      Object.assign(panel.style, {
        width: 'min(1200px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 48px)',
        overflow: 'auto',
        background: 'rgba(2, 6, 23, 0.95)',
        border: '1px solid rgba(148, 163, 184, 0.45)',
        borderRadius: '10px',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
        color: '#E2E8F0',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        padding: '14px',
      } satisfies Partial<CSSStyleDeclaration>);

      const titleEl = document.createElement('div');
      titleEl.textContent = title;
      Object.assign(titleEl.style, {
        fontSize: '14px',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#93C5FD',
      } satisfies Partial<CSSStyleDeclaration>);

      const queryEl = document.createElement('pre');
      queryEl.textContent = `SQL\n${query}`;
      Object.assign(queryEl.style, {
        margin: '0 0 10px 0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#FDE68A',
      } satisfies Partial<CSSStyleDeclaration>);

      const resultEl = document.createElement('pre');
      resultEl.textContent = `Result\n${result}`;
      Object.assign(resultEl.style, {
        margin: '0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '12px',
        lineHeight: '1.4',
      } satisfies Partial<CSSStyleDeclaration>);

      panel.append(titleEl, queryEl, resultEl);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    },
    { title, query, result: serializedResult.slice(0, 3500) }
  );

  await page.waitForTimeout(displayMs);
}

/**
 * Variant of {@link announceDbQueryResult} that shows the same query evaluated
 * before and after an action, so a demo video can prove what the action
 * actually changed in the database.
 *
 * Demo-only utility: not meant for use in regular (non-recorded) e2e specs.
 */
export async function announceDbQueryBeforeAfter(
  page: Page,
  title: string,
  query: string,
  before: unknown,
  after: unknown,
  displayMs = 5000
) {
  await announceDbQueryResult(page, title, query, { before, after }, displayMs);
}
