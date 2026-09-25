import { describe, expect, it } from 'vitest';
import { IntegrationType } from '../../../__generated__/resolvers-types';
import {
  buildIntegrationsCompatibilityBody,
  classifyIntegrationCompatibility,
  INTEGRATION_INCOMPATIBILITY_REASONS,
  isLtsPaddedVersion,
  parseIntegrationVersions,
  type CompatibilityCandidate,
  type IntegrationVersionPair,
} from './integrations-compatibility-endpoint.utils';

const OPENCTI_VERSION_PADDED = '007.260309.000';
const OPENCTI_LTS_VERSION_PADDED = '007.260309.000.LTS.005';

const buildCandidate = (
  overrides: Partial<CompatibilityCandidate> = {}
): CompatibilityCandidate => ({
  version_padded: '007.260101.000',
  active: true,
  is_decommissioned: false,
  ...overrides,
});

const buildPair = (
  overrides: Partial<IntegrationVersionPair> = {}
): IntegrationVersionPair => ({
  slug: 'mitre',
  version: '7.260101.0',
  versionPadded: '007.260101.000',
  ...overrides,
});

describe('parseIntegrationVersions', () => {
  it('reports a missing parameter separately from an invalid one', () => {
    expect(parseIntegrationVersions(undefined)).toEqual({
      ok: false,
      reason: 'missing',
    });
  });

  it.each([
    { description: 'a non-string value', raw: ['mitre@7.260101.0'] },
    { description: 'an empty string', raw: '' },
    { description: 'only separators', raw: ',,' },
    { description: 'a pair without a version', raw: 'mitre' },
    { description: 'an empty slug', raw: '@7.260101.0' },
    { description: 'an empty version', raw: 'mitre@' },
    { description: 'a malformed version', raw: 'mitre@not-a-version' },
    { description: 'one malformed pair among valid ones', raw: 'mitre@7.260101.0,other@nope' },
  ])('rejects $description', ({ raw }) => {
    expect(parseIntegrationVersions(raw)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('parses a single pair and exposes its padded version', () => {
    expect(parseIntegrationVersions('mitre@7.260101.0')).toEqual({
      ok: true,
      pairs: [
        { slug: 'mitre', version: '7.260101.0', versionPadded: '007.260101.000' },
      ],
    });
  });

  it('parses an LTS version', () => {
    expect(parseIntegrationVersions('mitre@7.260101.0-lts.1')).toEqual({
      ok: true,
      pairs: [
        {
          slug: 'mitre',
          version: '7.260101.0-lts.1',
          versionPadded: '007.260101.000.LTS.001',
        },
      ],
    });
  });

  it('trims surrounding whitespace around each pair', () => {
    const result = parseIntegrationVersions(' mitre@7.260101.0 , other@7.260200.0 ');

    expect(result).toEqual({
      ok: true,
      pairs: [
        { slug: 'mitre', version: '7.260101.0', versionPadded: '007.260101.000' },
        { slug: 'other', version: '7.260200.0', versionPadded: '007.260200.000' },
      ],
    });
  });

  it('collapses duplicate pairs', () => {
    const result = parseIntegrationVersions('mitre@7.260101.0,mitre@7.260101.0');

    expect(result).toEqual({
      ok: true,
      pairs: [
        { slug: 'mitre', version: '7.260101.0', versionPadded: '007.260101.000' },
      ],
    });
  });

  it('treats two different versions of the same slug as distinct entries', () => {
    const result = parseIntegrationVersions('mitre@7.260101.0,mitre@7.260200.0');

    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.pairs).toHaveLength(2);
  });

  it('splits on the last "@" so a slug containing one survives', () => {
    expect(parseIntegrationVersions('we@ird@7.260101.0')).toEqual({
      ok: true,
      pairs: [
        { slug: 'we@ird', version: '7.260101.0', versionPadded: '007.260101.000' },
      ],
    });
  });
});

describe('isLtsPaddedVersion', () => {
  it.each([
    { versionPadded: '007.260309.000', expected: false },
    { versionPadded: '007.260309.000.LTS.005', expected: true },
  ])('returns $expected for $versionPadded', ({ versionPadded, expected }) => {
    expect(isLtsPaddedVersion(versionPadded)).toBe(expected);
  });
});

describe('classifyIntegrationCompatibility', () => {
  const classify = (
    overrides: Partial<Parameters<typeof classifyIntegrationCompatibility>[0]> = {}
  ) =>
    classifyIntegrationCompatibility({
      pair: buildPair(),
      productVersionPadded: OPENCTI_VERSION_PADDED,
      productIsLts: false,
      integrationType: IntegrationType.Connector,
      candidate: buildCandidate(),
      latestCompatibleVersion: '7.260200.0',
      ...overrides,
    });

  it('always echoes back the requested slug and version', () => {
    expect(classify()).toMatchObject({
      slug: 'mitre',
      integration_version: '7.260101.0',
    });
  });

  it('answers compatible when the connector version clears every check', () => {
    expect(classify()).toEqual({
      slug: 'mitre',
      integration_version: '7.260101.0',
      compatible: true,
      latest_compatible_integration_version: '7.260200.0',
    });
  });

  it('reports an unknown slug without a verdict', () => {
    const entry = classify({ integrationType: undefined, candidate: undefined });

    expect(entry).toEqual({
      slug: 'mitre',
      integration_version: '7.260101.0',
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.UnknownIntegrationSlug,
    });
    expect(entry).not.toHaveProperty('compatible');
  });

  it('reports a non-connector integration as unsupported, naming its type', () => {
    const entry = classify({
      integrationType: IntegrationType.CsvFeed,
      candidate: undefined,
    });

    expect(entry).toEqual({
      slug: 'mitre',
      integration_version: '7.260101.0',
      integration_type: IntegrationType.CsvFeed,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.IntegrationTypeNotSupported,
    });
    expect(entry).not.toHaveProperty('compatible');
  });

  it('reports an unknown version without a verdict, but still suggests a fallback', () => {
    const entry = classify({ candidate: undefined });

    expect(entry).toEqual({
      slug: 'mitre',
      integration_version: '7.260101.0',
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.UnknownIntegrationVersion,
      latest_compatible_integration_version: '7.260200.0',
    });
    expect(entry).not.toHaveProperty('compatible');
  });

  it.each([
    { description: 'decommissioned', candidate: buildCandidate({ is_decommissioned: true }) },
    { description: 'inactive', candidate: buildCandidate({ active: false }) },
  ])('answers incompatible when the connector is $description', ({ candidate }) => {
    expect(classify({ candidate })).toMatchObject({
      compatible: false,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.IntegrationDecommissioned,
    });
  });

  it.each([
    {
      description: 'an LTS connector on a non-LTS OpenCTI',
      candidate: buildCandidate({ version_padded: '007.260101.000.LTS.001' }),
      productIsLts: false,
      productVersionPadded: OPENCTI_VERSION_PADDED,
    },
    {
      description: 'a non-LTS connector on an LTS OpenCTI',
      candidate: buildCandidate({ version_padded: '007.260101.000' }),
      productIsLts: true,
      productVersionPadded: OPENCTI_LTS_VERSION_PADDED,
    },
  ])('answers incompatible for $description', (input) => {
    expect(classify(input)).toMatchObject({
      compatible: false,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.LtsTrackMismatch,
    });
  });

  it('answers incompatible, with the floor, when OpenCTI is too old', () => {
    const entry = classify({
      candidate: buildCandidate({
        minimum_deployable_version: '7.260601.0',
        minimum_deployable_version_padded: '007.260601.000',
      }),
    });

    expect(entry).toEqual({
      slug: 'mitre',
      integration_version: '7.260101.0',
      compatible: false,
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.OpenctiVersionTooOld,
      minimum_deployable_version: '7.260601.0',
      latest_compatible_integration_version: '7.260200.0',
    });
  });

  it('treats a minimum equal to the OpenCTI version as compatible', () => {
    expect(
      classify({
        candidate: buildCandidate({
          minimum_deployable_version: '7.260309.0',
          minimum_deployable_version_padded: OPENCTI_VERSION_PADDED,
        }),
      })
    ).toMatchObject({ compatible: true });
  });

  it('omits the fallback when no version of the slug is compatible', () => {
    const entry = classify({ latestCompatibleVersion: undefined });

    expect(entry).not.toHaveProperty('latest_compatible_integration_version');
  });

  it('prefers the unknown-slug reason over the unknown-version one', () => {
    expect(
      classify({ integrationType: undefined, candidate: undefined })
    ).toMatchObject({
      incompatibility_reason:
        INTEGRATION_INCOMPATIBILITY_REASONS.UnknownIntegrationSlug,
    });
  });
});

describe('buildIntegrationsCompatibilityBody', () => {
  it('echoes the resolved OpenCTI version alongside the entries', () => {
    const entries = [
      { slug: 'mitre', integration_version: '7.260101.0', compatible: true },
    ];

    expect(buildIntegrationsCompatibilityBody('7.260309.0', entries)).toEqual({
      opencti_version: '7.260309.0',
      integrations: entries,
    });
  });
});
