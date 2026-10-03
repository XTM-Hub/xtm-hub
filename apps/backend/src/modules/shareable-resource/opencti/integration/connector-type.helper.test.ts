import { describe, expect, it } from 'vitest';
import { BadRequestErrorCode } from '../../../../utils/error/error.code';
import {
  ConnectorTypeHelper,
  MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE,
  OPENCTI_CONNECTOR_TYPES,
} from './connector-type.helper';

const HUNT_FLOOR = MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE.INTERNAL_HUNT;

const huntConfigSchema = (scope: unknown) =>
  JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      CONNECTOR_SCOPE: { type: 'string', default: scope },
      SPLUNK_HUNT_TOKEN: {
        type: 'string',
        format: 'password',
        writeOnly: true,
      },
    },
    required: [],
    additionalProperties: true,
  });

describe('connectorTypeHelper.normalize', () => {
  it.each(OPENCTI_CONNECTOR_TYPES.map((type) => [type]))(
    'accepts the OpenCTI connector type %s',
    (type) => {
      expect(ConnectorTypeHelper.normalize(type)).toBe(type);
    }
  );

  it.each`
    input                | expected
    ${'internal_hunt'}   | ${'INTERNAL_HUNT'}
    ${' INTERNAL_HUNT '} | ${'INTERNAL_HUNT'}
    ${'internal-hunt'}   | ${'INTERNAL_HUNT'}
    ${'stream'}          | ${'STREAM'}
  `('normalizes "$input" to $expected', ({ input, expected }) => {
    expect(ConnectorTypeHelper.normalize(input)).toBe(expected);
  });

  it.each`
    input
    ${undefined}
    ${null}
    ${''}
    ${'INTERNAL_HUNTS'}
    ${'HUNT'}
    ${'COLLECTOR'}
  `('returns undefined for "$input"', ({ input }) => {
    expect(ConnectorTypeHelper.normalize(input)).toBeUndefined();
  });
});

describe('connectorTypeHelper.parse', () => {
  it('returns the canonical connector type', () => {
    expect(ConnectorTypeHelper.parse('internal-hunt')).toBe('INTERNAL_HUNT');
  });

  it('rejects an unknown connector type', () => {
    expect(() => ConnectorTypeHelper.parse('INTERNAL_HUNTS')).toThrow(
      BadRequestErrorCode.ConnectorTypeNotRecognized
    );
  });
});

describe('connectorTypeHelper.resolveMinimumDeployableVersion', () => {
  it.each`
    connectorType        | declared              | expected
    ${'INTERNAL_HUNT'}   | ${'7.261002.0'}       | ${HUNT_FLOOR}
    ${'INTERNAL_HUNT'}   | ${'6.8.0'}            | ${HUNT_FLOOR}
    ${'INTERNAL_HUNT'}   | ${'7.260811.0-lts.1'} | ${HUNT_FLOOR}
    ${'INTERNAL_HUNT'}   | ${undefined}          | ${HUNT_FLOOR}
    ${'INTERNAL_HUNT'}   | ${''}                 | ${HUNT_FLOOR}
    ${'INTERNAL_HUNT'}   | ${'not-a-version'}    | ${HUNT_FLOOR}
    ${'INTERNAL_HUNT'}   | ${'7.261003.0'}       | ${'7.261003.0'}
    ${'INTERNAL_HUNT'}   | ${'7.261015.2'}       | ${'7.261015.2'}
    ${'INTERNAL_HUNT'}   | ${'7.261210.0-lts.1'} | ${'7.261210.0-lts.1'}
    ${'EXTERNAL_IMPORT'} | ${'7.260811.0'}       | ${'7.260811.0'}
    ${'EXTERNAL_IMPORT'} | ${undefined}          | ${undefined}
    ${undefined}         | ${'6.8.0'}            | ${'6.8.0'}
  `(
    'returns $expected for a $connectorType connector declaring "$declared"',
    ({ connectorType, declared, expected }) => {
      expect(
        ConnectorTypeHelper.resolveMinimumDeployableVersion(
          connectorType,
          declared
        )
      ).toBe(expected);
    }
  );
});

describe('connectorTypeHelper.resolveHuntPlatform', () => {
  it('reads the hunted platform from the CONNECTOR_SCOPE default', () => {
    expect(
      ConnectorTypeHelper.resolveHuntPlatform({
        image_type: 'INTERNAL_HUNT',
        config_schema: huntConfigSchema('splunk'),
      })
    ).toBe('splunk');
  });

  it('accepts a parsed config schema and a single-value array scope', () => {
    expect(
      ConnectorTypeHelper.resolveHuntPlatform({
        image_type: 'INTERNAL_HUNT',
        config_schema: JSON.parse(huntConfigSchema([' Microsoft-Sentinel '])),
      })
    ).toBe('microsoft-sentinel');
  });

  it.each`
    case                             | imageType            | configSchema
    ${'a connector of another type'} | ${'EXTERNAL_IMPORT'} | ${huntConfigSchema('splunk')}
    ${'no config schema'}            | ${'INTERNAL_HUNT'}   | ${null}
    ${'an invalid config schema'}    | ${'INTERNAL_HUNT'}   | ${'{not json'}
    ${'a schema without scope'}      | ${'INTERNAL_HUNT'}   | ${JSON.stringify({ properties: {} })}
    ${'a scope listing platforms'}   | ${'INTERNAL_HUNT'}   | ${huntConfigSchema(['splunk', 'internet'])}
    ${'a scope that is not a slug'}  | ${'INTERNAL_HUNT'}   | ${huntConfigSchema('splunk; drop')}
    ${'a non-string scope'}          | ${'INTERNAL_HUNT'}   | ${huntConfigSchema(42)}
  `('returns null for $case', ({ imageType, configSchema }) => {
    expect(
      ConnectorTypeHelper.resolveHuntPlatform({
        image_type: imageType,
        config_schema: configSchema,
      })
    ).toBeNull();
  });
});
