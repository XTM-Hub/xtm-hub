import {
  CONNECTOR_TYPE_ICONS,
  CONNECTOR_TYPES,
  getConnectorTypeIcon,
  humanizeIdentifier,
  isConnectorType,
  isHuntPlatform,
  UNKNOWN_CONNECTOR_TYPE_ICON,
} from '@/components/service/integrations/connector-type/connector-type.utils';
import { ICON_NAMES } from '@filigran/design-system';
import { describe, expect, it } from 'vitest';

describe('connector-type.utils', () => {
  it('only uses icon names of the design system vocabulary', () => {
    const icons = [
      ...Object.values(CONNECTOR_TYPE_ICONS),
      UNKNOWN_CONNECTOR_TYPE_ICON,
    ];

    for (const icon of icons) {
      expect(ICON_NAMES).toContain(icon);
    }
  });

  it('lists the hunt connector type', () => {
    expect(CONNECTOR_TYPES).toContain('INTERNAL_HUNT');
  });

  it.each`
    value               | expected
    ${'INTERNAL_HUNT'}  | ${true}
    ${'STREAM'}         | ${true}
    ${'internal_hunt'}  | ${false}
    ${'INTERNAL_HUNTS'} | ${false}
    ${null}             | ${false}
    ${undefined}        | ${false}
  `('isConnectorType($value) is $expected', ({ value, expected }) => {
    expect(isConnectorType(value)).toBe(expected);
  });

  it('uses the crosshair icon for hunt connectors and a generic icon for unknown types', () => {
    expect(getConnectorTypeIcon('INTERNAL_HUNT')).toBe('locate-fixed');
    expect(getConnectorTypeIcon('INTERNAL_INGESTION')).toBe(
      UNKNOWN_CONNECTOR_TYPE_ICON
    );
  });

  it.each`
    value                   | expected
    ${'splunk'}             | ${true}
    ${'microsoft-sentinel'} | ${true}
    ${'internet'}           | ${true}
    ${'qradar'}             | ${false}
    ${null}                 | ${false}
  `('isHuntPlatform($value) is $expected', ({ value, expected }) => {
    expect(isHuntPlatform(value)).toBe(expected);
  });

  it.each`
    value                   | expected
    ${'INTERNAL_INGESTION'} | ${'Internal ingestion'}
    ${'ibm-qradar'}         | ${'Ibm qradar'}
    ${'  SOME__TYPE  '}     | ${'Some type'}
  `('humanizes "$value" as "$expected"', ({ value, expected }) => {
    expect(humanizeIdentifier(value)).toBe(expected);
  });
});
