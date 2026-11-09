import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { ANALYTICS_ID_ATTRIBUTE } from '@/lib/analytics/analytics.consts';
import {
  analyticsId,
  findAnalyticsRegistryErrors,
} from '@/lib/analytics/analytics.ids';
import { ANALYTICS_ELEMENT_IDS } from '@/lib/analytics/analytics.registry';
import testRender from '@/utils/test/test-render';
import {
  Button,
  Checkbox,
  Combobox,
  ComboboxField,
  ComboboxInput,
  ComboboxTrigger,
  Icon,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@filigran/design-system';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const SHARE_ACTION = 'Share resource';
const ELEMENT_ID = 'resource_share';
const LABEL = 'Share';
const MENU_LABEL = 'Actions';
const TAB_VALUE = 'capabilities';
const ACCORDION_VALUE = 'section';

describe('findAnalyticsRegistryErrors', () => {
  it('should find no error when every key and action follows the contract', () => {
    // Given
    const registry = {
      resource_download: { action: 'Download resource' },
      resource_download_signup: { action: 'Sign up to download resource' },
      trial_guide_documentation_open: {
        action: 'Open documentation from trial guide',
      },
      ee_details_open: { action: 'Open Enterprise Edition details' },
    };

    // When
    const errors = findAnalyticsRegistryErrors(registry);

    // Then
    expect(errors).toEqual([]);
  });

  it.each([
    [
      'a key that is not snake_case',
      { resource_Csv_download: { action: 'Download resource CSV' } },
      ['resource_Csv_download: the key is not snake_case'],
    ],
    [
      'a key whose domain is not in the list',
      { table_page_open: { action: 'Open table page' } },
      ['table_page_open: the domain is not in the list'],
    ],
    [
      'a key whose verb is not in the list',
      { resource_link_follow: { action: 'Follow resource link' } },
      ['resource_link_follow: the verb is not in the list'],
    ],
    [
      'a sign-up key without a verb before the suffix',
      { roadmap_feature_signup: { action: 'Sign up from feature' } },
      ['roadmap_feature_signup: the verb is not in the list'],
    ],
    [
      'an action used twice',
      {
        resource_share: { action: SHARE_ACTION },
        roadmap_epic_share: { action: SHARE_ACTION },
      },
      [
        `resource_share: the action "${SHARE_ACTION}" is not unique`,
        `roadmap_epic_share: the action "${SHARE_ACTION}" is not unique`,
      ],
    ],
    [
      'an action starting with Click',
      { roadmap_feature_vote: { action: 'Click Vote on a feature' } },
      [
        'roadmap_feature_vote: the action "Click Vote on a feature" starts with Click',
      ],
    ],
  ])(
    'should report an error when the registry has %s',
    (_case, registry, expectedErrors) => {
      // Given / When
      const errors = findAnalyticsRegistryErrors(registry);

      // Then
      expect(errors).toEqual(expectedErrors);
    }
  );

  it('should find no error when checking the analytics registry', () => {
    // Given / When
    const errors = findAnalyticsRegistryErrors(ANALYTICS_ELEMENT_IDS);

    // Then
    expect(errors).toEqual([]);
  });
});

describe('analyticsId', () => {
  it.each([
    [
      'a Button',
      'button',
      () => <Button {...analyticsId(ELEMENT_ID)}>{LABEL}</Button>,
    ],
    [
      'an IconButton',
      'button',
      () => (
        <IconButton
          {...analyticsId(ELEMENT_ID)}
          aria-label={LABEL}
          icon={
            <Icon
              name="x"
              size={16}
            />
          }
        />
      ),
    ],
    [
      'a MenuItem inside its menu',
      'menuitem',
      () => (
        <Menu open>
          <MenuTrigger>{MENU_LABEL}</MenuTrigger>
          <MenuContent>
            <MenuItem {...analyticsId(ELEMENT_ID)}>{LABEL}</MenuItem>
          </MenuContent>
        </Menu>
      ),
    ],
    [
      'a MenuSubTrigger inside its menu',
      'menuitem',
      () => (
        <Menu open>
          <MenuTrigger>{MENU_LABEL}</MenuTrigger>
          <MenuContent>
            <MenuSub>
              <MenuSubTrigger {...analyticsId(ELEMENT_ID)}>
                {LABEL}
              </MenuSubTrigger>
            </MenuSub>
          </MenuContent>
        </Menu>
      ),
    ],
    [
      'a TabsTrigger inside its tabs',
      'tab',
      () => (
        <Tabs defaultValue={TAB_VALUE}>
          <TabsList>
            <TabsTrigger
              value={TAB_VALUE}
              {...analyticsId(ELEMENT_ID)}>
              {LABEL}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ),
    ],
    [
      'a Checkbox',
      'checkbox',
      () => (
        <Checkbox
          {...analyticsId(ELEMENT_ID)}
          aria-label={LABEL}
        />
      ),
    ],
    [
      'a Switch',
      'switch',
      () => (
        <Switch
          {...analyticsId(ELEMENT_ID)}
          label={LABEL}
        />
      ),
    ],
    [
      'a SelectTrigger inside its select',
      'combobox',
      () => (
        <Select>
          <SelectTrigger
            {...analyticsId(ELEMENT_ID)}
            aria-label={LABEL}>
            <SelectValue />
          </SelectTrigger>
        </Select>
      ),
    ],
    [
      'a ComboboxTrigger inside its combobox',
      'button',
      () => (
        <Combobox<string>
          options={[]}
          value={null}>
          <ComboboxField>
            <ComboboxInput aria-label={MENU_LABEL} />
            <ComboboxTrigger
              {...analyticsId(ELEMENT_ID)}
              aria-label={LABEL}
            />
          </ComboboxField>
        </Combobox>
      ),
    ],
    [
      'an AccordionTrigger inside its accordion',
      'button',
      () => (
        <Accordion
          type="single"
          collapsible>
          <AccordionItem value={ACCORDION_VALUE}>
            <AccordionTrigger {...analyticsId(ELEMENT_ID)}>
              {LABEL}
            </AccordionTrigger>
          </AccordionItem>
        </Accordion>
      ),
    ],
    [
      'a SheetTrigger inside its sheet',
      'button',
      () => (
        <Sheet>
          <SheetTrigger {...analyticsId(ELEMENT_ID)}>{LABEL}</SheetTrigger>
        </Sheet>
      ),
    ],
  ])(
    'should render the analytics id in the DOM when %s receives it',
    async (_component, role, renderComponent) => {
      // Given / When
      testRender(renderComponent());

      // Then
      expect(await screen.findByRole(role, { name: LABEL })).toHaveAttribute(
        ANALYTICS_ID_ATTRIBUTE,
        ELEMENT_ID
      );
    }
  );
});
