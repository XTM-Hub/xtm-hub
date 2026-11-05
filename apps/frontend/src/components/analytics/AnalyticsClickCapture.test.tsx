import AnalyticsClickCapture from '@/components/analytics/AnalyticsClickCapture';
import {
  initializeAnalytics,
  releaseAnalyticsEvents,
} from '@/lib/analytics/analytics.client';
import { ANALYTICS_ID_ATTRIBUTE } from '@/lib/analytics/analytics.consts';
import {
  analyticsEpic,
  analyticsFeature,
  analyticsProduct,
  analyticsResource,
  analyticsSection,
} from '@/lib/analytics/analytics.context';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import {
  readTrackedEvents,
  resetAnalyticsEnvironment,
} from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
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
const RESOURCE_UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const RESOURCE_NAME = 'Ransomware playbook';
const LIBRARY = 'Playbooks';
const OPENCTI = 'OpenCTI';
const OPENAEV = 'OpenAEV';
const USE_CASE = 'Threat hunting';
const SECTION = 'Resource actions';
const EPIC_NAME = 'Epic name';
const FEATURE_NAME = 'Feature name';
const PORTAL_CONTENT_ID = 'portal-content';
const PORTAL_TRIGGER_ID = 'portal-trigger';
const SUBMENU_ID = 'submenu';
const DIALOG_TITLE_ID = 'dialog-title';

const downloadClick = {
  element_id: ELEMENTS.download.id,
  domain: RESOURCES_DOMAIN,
  action: ELEMENTS.download.action,
  page_type: PAGE_TYPE,
};

const tagged = (id: string) => ({ [ANALYTICS_ID_ATTRIBUTE]: id });

const playbook = analyticsResource({
  id: RESOURCE_UUID,
  name: RESOURCE_NAME,
  type: ShareableResourceType.OPENCTI_PLAYBOOK,
});

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

  it('should send the context of the annotated containers when a registered element is clicked', () => {
    // Given
    renderWithCapture(
      <section {...analyticsEpic(EPIC_NAME)}>
        <div {...analyticsFeature(FEATURE_NAME)}>
          <div
            {...analyticsResource({
              id: btoa(`Document:${RESOURCE_UUID}`),
              name: RESOURCE_NAME,
              type: ShareableResourceType.OPENCTI_PLAYBOOK,
              useCases: [{ name: USE_CASE }],
            })}>
            <div {...analyticsSection(SECTION)}>
              <button {...tagged(ELEMENTS.share.id)}>{TARGET}</button>
            </div>
          </div>
        </div>
      </section>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      {
        element_id: ELEMENTS.share.id,
        domain: RESOURCES_DOMAIN,
        action: ELEMENTS.share.action,
        page_type: PAGE_TYPE,
        resource_id: RESOURCE_UUID,
        resource_name: RESOURCE_NAME,
        library: LIBRARY,
        use_cases: USE_CASE,
        product: OPENCTI,
        section: SECTION,
        epic_name: EPIC_NAME,
        feature_name: FEATURE_NAME,
      },
    ]);
  });

  it('should send the product of the nearest container when product containers are nested', () => {
    // Given
    renderWithCapture(
      <div {...playbook}>
        <div {...analyticsProduct(PlatformIdentifier.Openaev)}>
          <button {...tagged(ELEMENTS.download.id)}>{TARGET}</button>
        </div>
      </div>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({ product: OPENAEV }),
    ]);
  });

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
    ['controls', { 'aria-controls': PORTAL_CONTENT_ID }],
    ['labels', { id: PORTAL_TRIGGER_ID }],
  ])(
    'should read the resource of the trigger when the trigger %s the portalled menu',
    (_link, triggerAttributes) => {
      // Given
      renderWithCapture(
        <>
          <div {...playbook}>
            <button {...triggerAttributes}>Open menu</button>
          </div>
          <div
            id={PORTAL_CONTENT_ID}
            role="menu"
            aria-labelledby={PORTAL_TRIGGER_ID}>
            <div
              role="menuitem"
              {...tagged(ELEMENTS.download.id)}>
              {TARGET}
            </div>
          </div>
        </>
      );

      // When
      fireEvent.click(screen.getByText(TARGET));

      // Then
      expect(readTrackedEvents('ui_click')).toEqual([
        expect.objectContaining({ resource_id: RESOURCE_UUID }),
      ]);
    }
  );

  it('should read the resource of the trigger when the portalled content without a role sits in a popper wrapper', () => {
    // Given
    renderWithCapture(
      <>
        <div {...playbook}>
          <button aria-controls={PORTAL_CONTENT_ID}>Open popover</button>
        </div>
        <div data-radix-popper-content-wrapper="">
          <div id={PORTAL_CONTENT_ID}>
            <button {...tagged(ELEMENTS.download.id)}>{TARGET}</button>
          </div>
        </div>
      </>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({ resource_id: RESOURCE_UUID }),
    ]);
  });

  it('should read the resource of the first trigger when the click is in a submenu', () => {
    // Given
    renderWithCapture(
      <>
        <div {...playbook}>
          <button aria-controls={PORTAL_CONTENT_ID}>Open menu</button>
        </div>
        <div
          id={PORTAL_CONTENT_ID}
          role="menu">
          <div
            role="menuitem"
            aria-controls={SUBMENU_ID}>
            More
          </div>
        </div>
        <div
          id={SUBMENU_ID}
          role="menu">
          <div
            role="menuitem"
            {...tagged(ELEMENTS.download.id)}>
            {TARGET}
          </div>
        </div>
      </>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([
      expect.objectContaining({ resource_id: RESOURCE_UUID }),
    ]);
  });

  it('should send no resource when the dialog is only labelled by its own title', () => {
    // Given
    renderWithCapture(
      <>
        <div {...playbook} />
        <div
          role="dialog"
          aria-labelledby={DIALOG_TITLE_ID}>
          <h2 id={DIALOG_TITLE_ID}>Confirm</h2>
          <button {...tagged(ELEMENTS.download.id)}>{TARGET}</button>
        </div>
      </>
    );

    // When
    fireEvent.click(screen.getByText(TARGET));

    // Then
    expect(readTrackedEvents('ui_click')).toEqual([downloadClick]);
  });
});
