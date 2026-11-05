import AnalyticsClickCapture from '@/components/analytics/AnalyticsClickCapture';
import {
  initializeAnalytics,
  releaseAnalyticsEvents,
} from '@/lib/analytics/analytics.client';
import { ANALYTICS_ID_ATTRIBUTE } from '@/lib/analytics/analytics.consts';
import {
  readTrackedEvents,
  resetAnalyticsEnvironment,
} from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ELEMENTS = vi.hoisted(() => ({
  download: { id: 'resource_download', action: 'Download resource' },
  share: { id: 'resource_share', action: 'Share resource' },
  open: { id: 'resource_open', action: 'Open resource' },
}));

vi.mock('@/lib/analytics/analytics.registry', () => ({
  ANALYTICS_ELEMENT_IDS: Object.fromEntries(
    Object.values(ELEMENTS).map(({ id, action }) => [id, { action }])
  ),
}));

const PAGE_TYPE = 'Home';
const TARGET = 'Target';
const UNKNOWN_ID = 'resource_unknown_open';
const RESOURCES_DOMAIN = 'Resources';

const downloadClick = {
  element_id: ELEMENTS.download.id,
  domain: RESOURCES_DOMAIN,
  action: ELEMENTS.download.action,
  page_type: PAGE_TYPE,
};

const tagged = (id: string) => ({ [ANALYTICS_ID_ATTRIBUTE]: id });

const renderWithCapture = (content: ReactNode) =>
  testRender(
    <>
      <AnalyticsClickCapture pageType={PAGE_TYPE} />
      {content}
    </>
  );

beforeEach(() => {
  resetAnalyticsEnvironment();
  initializeAnalytics('G-TEST');
  releaseAnalyticsEvents();
});

describe('AnalyticsClickCapture', () => {
  it('should track a click even when the element handler stops propagation', () => {
    // Given
    renderWithCapture(
      <button
        {...tagged(ELEMENTS.download.id)}
        onClick={(event) => event.stopPropagation()}>
        {TARGET}
      </button>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([downloadClick]);
  });

  it.each([
    ['a click outside any interactive element', () => <div>{TARGET}</div>],
    ['an element without an id', () => <button>{TARGET}</button>],
    [
      'an element whose id is not in the registry',
      () => <button {...tagged(UNKNOWN_ID)}>{TARGET}</button>,
    ],
    [
      'an untagged link inside a tagged container',
      () => (
        <div {...tagged(ELEMENTS.open.id)}>
          <a href="#resource">{TARGET}</a>
        </div>
      ),
    ],
    [
      'an element marked aria-disabled',
      () => (
        <div
          role="menuitem"
          aria-disabled
          {...tagged(ELEMENTS.download.id)}>
          {TARGET}
        </div>
      ),
    ],
    [
      'an element marked data-disabled',
      () => (
        <div
          role="menuitem"
          data-disabled=""
          {...tagged(ELEMENTS.download.id)}>
          {TARGET}
        </div>
      ),
    ],
    [
      'a button inside a disabled group',
      () => (
        <div
          role="group"
          aria-disabled="true">
          <button {...tagged(ELEMENTS.download.id)}>{TARGET}</button>
        </div>
      ),
    ],
    [
      'an option of a listbox',
      () => (
        <div role="listbox">
          <div
            role="option"
            aria-selected={false}
            {...tagged(ELEMENTS.download.id)}>
            {TARGET}
          </div>
        </div>
      ),
    ],
    [
      'a checkbox item of a menu',
      () => (
        <div role="menu">
          <div
            role="menuitemcheckbox"
            aria-checked={false}
            {...tagged(ELEMENTS.download.id)}>
            {TARGET}
          </div>
        </div>
      ),
    ],
    [
      'a checkbox of a combobox',
      () => (
        <div
          role="combobox"
          aria-controls="options"
          aria-expanded>
          <div
            role="checkbox"
            aria-checked={false}
            {...tagged(ELEMENTS.download.id)}>
            {TARGET}
          </div>
        </div>
      ),
    ],
    [
      'the label of an untagged field inside a tagged row',
      () => (
        <table>
          <tbody>
            <tr {...tagged(ELEMENTS.open.id)}>
              <td>
                <label>
                  {TARGET}
                  <input />
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      ),
    ],
    [
      'a native checkbox of a listbox',
      () => (
        <div role="listbox">
          <label>
            {TARGET}
            <input
              type="checkbox"
              {...tagged(ELEMENTS.download.id)}
            />
          </label>
        </div>
      ),
    ],
  ])(
    'should send nothing when the click lands on %s',
    (_case, renderContent) => {
      // Given
      renderWithCapture(renderContent());

      // When
      fireEvent.click(screen.getByText(TARGET));

      // Then
      expect(readTrackedEvents('ui_click')).toEqual([]);
    }
  );

  it('should attribute the click to the row when a cell of a tagged row is clicked', () => {
    // Given
    renderWithCapture(
      <table>
        <tbody>
          <tr {...tagged(ELEMENTS.open.id)}>
            <td>{TARGET}</td>
          </tr>
        </tbody>
      </table>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({ element_id: ELEMENTS.open.id }),
    ]);
  });

  it('should send only the inner element when tagged elements are nested', () => {
    // Given
    renderWithCapture(
      <div {...tagged(ELEMENTS.open.id)}>
        <button {...tagged(ELEMENTS.share.id)}>{TARGET}</button>
      </div>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({ element_id: ELEMENTS.share.id }),
    ]);
  });

  it.each([
    ['an input', 'textbox', () => <input aria-label={TARGET} />],
    ['a textarea', 'textbox', () => <textarea aria-label={TARGET} />],
    [
      'a select',
      'combobox',
      () => (
        <select aria-label={TARGET}>
          <option>{TARGET}</option>
        </select>
      ),
    ],
  ])(
    'should send nothing when %s without an id inside a tagged row is clicked',
    (_field, role, renderField) => {
      // Given
      renderWithCapture(
        <table>
          <tbody>
            <tr {...tagged(ELEMENTS.open.id)}>
              <td>{renderField()}</td>
            </tr>
          </tbody>
        </table>
      );

      // When
      fireEvent.click(screen.getByRole(role, { name: TARGET }));

      // Then
      expect(readTrackedEvents('ui_click')).toEqual([]);
    }
  );

  it('should track a click when only the container of the element is marked data-disabled', () => {
    // Given
    renderWithCapture(
      <div data-disabled="">
        <button {...tagged(ELEMENTS.download.id)}>{TARGET}</button>
      </div>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([downloadClick]);
  });
});
