import { Locator, Page } from '@playwright/test';

export async function openAndGetRowActionsDropdown(page: Page, row: Locator) {
  const button = row.locator('td:last-child').getByRole('button');
  await button.waitFor({ state: 'visible' });
  await button.click();
  const dropdown = page.getByRole('menu');
  await dropdown.waitFor({ state: 'visible' });
  return dropdown;
}

export async function clickRowAction(
  page: Page,
  row: Locator,
  actionLabel: string,
  role: 'menuitem' | 'button' = 'menuitem'
) {
  const dropdown = await openAndGetRowActionsDropdown(page, row);
  const button = dropdown.getByRole(role, { name: actionLabel });
  await button.waitFor();
  await button.click({ force: true });
}

export async function selectUseCase(page: Page, name = 'Global') {
  await page.getByRole('combobox', { name: 'Use cases', exact: true }).click();
  await page.getByRole('option', { name, exact: true }).click();
  await page.keyboard.press('Escape');
}
export async function selectSolutionCategories(page: Page) {
  await page
    .getByRole('combobox', { name: 'Solution categories', exact: true })
    .click();
  await page.getByRole('option', { name: 'Solutioncategory' }).click();
  await page.getByRole('option', { name: 'Other' }).click();
  await page.keyboard.press('Escape');
}

export async function waitForDrawerToOpen(page: Page) {
  await page.locator('body > [role="dialog"]').waitFor({ state: 'visible' });
}

export async function waitForDrawerToClose(page: Page) {
  await page.locator('body > [role="dialog"]').waitFor({ state: 'hidden' });
}

export async function waitForReactIdle(page: Page, timeout = 5000) {
  try {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        type FiberCandidate = {
          memoizedState?: {
            isProcessing?: boolean;
          };
        };
        type ReactDevtoolsHook = {
          reactDevtoolsAgent?: {
            _fibers?: Record<string, FiberCandidate>;
          };
        };
        const reactHook = (
          window as Window & {
            __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevtoolsHook;
          }
        ).__REACT_DEVTOOLS_GLOBAL_HOOK__;

        // Detect React
        if (reactHook) {
          // This method waits for all React updates to complete
          const checkReactUpdates = () => {
            const hook = reactHook;
            if (hook.reactDevtoolsAgent && hook.reactDevtoolsAgent._fibers) {
              const hasUpdates = Object.values(
                hook.reactDevtoolsAgent._fibers
              ).some((fiber) => fiber.memoizedState?.isProcessing === true);
              if (!hasUpdates) {
                resolve();
                return;
              }
            } else {
              // If we can't check React's state, resolve after a short delay
              setTimeout(resolve, 200);
              return;
            }
            setTimeout(checkReactUpdates, 50);
          };

          checkReactUpdates();
        } else {
          // If React DevTools is not available, use requestAnimationFrame
          // which runs after React has finished rendering
          setTimeout(() => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 50);
            });
          }, 50);
        }
      });
    }, timeout);
  } catch (e) {
    console.warn('Timeout waiting for React to stabilize:', e);
  }
}
