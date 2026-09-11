import { describe, expect, it } from 'vitest';
import {
  buildConnectorEnvKey,
  buildConnectorFieldSlug,
  buildConnectorJsonKey,
  buildMatrixEntries,
  buildVersionsMatrixCsv,
  buildVersionsMatrixEnv,
  buildVersionsMatrixETag,
  buildVersionsMatrixJson,
  findIncompatibleSlugs,
  findUnknownSlugs,
  groupConnectorVersionsBySlug,
  isVersionsMatrixFormat,
  parseConnectorSlugs,
  parseVersionsMatrixFormat,
} from './versions-matrix-endpoint.utils';

describe('buildVersionsMatrixETag', () => {
  it('wraps a sha256 hash of the payload in a strong ETag', () => {
    expect(buildVersionsMatrixETag('payload')).toBe(
      '"239f59ed55e737c77147cf55ad0c1b030b6d7ee748a7426952f9b852d5a935e5"'
    );
  });

  it('produces different ETags for different payloads', () => {
    expect(buildVersionsMatrixETag('payload-a')).not.toBe(
      buildVersionsMatrixETag('payload-b')
    );
  });

  it('is deterministic for the same payload', () => {
    expect(buildVersionsMatrixETag('same')).toBe(
      buildVersionsMatrixETag('same')
    );
  });
});

describe('isVersionsMatrixFormat', () => {
  it.each`
    value        | expected
    ${'json'}    | ${true}
    ${'env'}     | ${true}
    ${'csv'}     | ${true}
    ${'xml'}     | ${false}
    ${undefined} | ${false}
    ${42}        | ${false}
  `('returns $expected for $value', ({ value, expected }) => {
    expect(isVersionsMatrixFormat(value)).toBe(expected);
  });
});

describe('parseVersionsMatrixFormat', () => {
  it('defaults to "json" when the parameter is absent', () => {
    expect(parseVersionsMatrixFormat(undefined)).toBe('json');
  });

  it('accepts "env"', () => {
    expect(parseVersionsMatrixFormat('env')).toBe('env');
  });

  it('accepts "csv"', () => {
    expect(parseVersionsMatrixFormat('csv')).toBe('csv');
  });

  it('returns undefined for an unrecognized format', () => {
    expect(parseVersionsMatrixFormat('xml')).toBeUndefined();
  });
});

describe('parseConnectorSlugs', () => {
  it('returns undefined slugs (all connectors) when the parameter is absent', () => {
    expect(parseConnectorSlugs(undefined)).toEqual({
      ok: true,
      slugs: undefined,
    });
  });

  it('splits, trims and dedupes a comma-separated list while preserving case', () => {
    expect(parseConnectorSlugs(' MitreAttack ,misp,MitreAttack')).toEqual({
      ok: true,
      slugs: ['MitreAttack', 'misp'],
    });
  });

  it('rejects a non-string value', () => {
    expect(parseConnectorSlugs(['mitre'])).toEqual({ ok: false });
  });

  it('rejects a value that resolves to an empty list', () => {
    expect(parseConnectorSlugs(' , ,')).toEqual({ ok: false });
  });
});

describe('findUnknownSlugs', () => {
  it('returns an empty array when all connectors were requested', () => {
    expect(findUnknownSlugs(undefined, ['mitre'])).toEqual([]);
  });

  it('returns requested slugs absent from the known list', () => {
    expect(findUnknownSlugs(['mitre', 'ghost'], ['mitre', 'sentinel'])).toEqual(
      ['ghost']
    );
  });

  it('returns an empty array when every requested slug is known', () => {
    expect(findUnknownSlugs(['mitre'], ['mitre', 'sentinel'])).toEqual([]);
  });
});

describe('groupConnectorVersionsBySlug', () => {
  it('maps each connector slug to its version', () => {
    expect(
      groupConnectorVersionsBySlug([
        { slug: 'mitre', version: '7.260809.0' },
        { slug: 'sentinel', version: '7.260809.0' },
      ])
    ).toEqual(
      new Map([
        ['mitre', '7.260809.0'],
        ['sentinel', '7.260809.0'],
      ])
    );
  });

  it('skips connectors with a null slug or version', () => {
    expect(
      groupConnectorVersionsBySlug([
        { slug: null, version: '7.260809.0' },
        { slug: 'mitre', version: null },
      ])
    ).toEqual(new Map());
  });
});

describe('findIncompatibleSlugs', () => {
  it('returns an empty array when all connectors were requested', () => {
    expect(
      findIncompatibleSlugs(undefined, new Map([['mitre', '7.260809.0']]))
    ).toEqual([]);
  });

  it('returns requested slugs missing from the compatible map', () => {
    expect(
      findIncompatibleSlugs(
        ['mitre', 'sentinel'],
        new Map([['mitre', '7.260809.0']])
      )
    ).toEqual(['sentinel']);
  });
});

describe('buildMatrixEntries', () => {
  it('builds one entry per target slug that has a compatible version', () => {
    expect(
      buildMatrixEntries(
        ['mitre', 'sentinel'],
        new Map([
          ['mitre', '7.260809.0'],
          ['sentinel', '7.260809.0'],
        ])
      )
    ).toEqual([
      { slug: 'mitre', version: '7.260809.0' },
      { slug: 'sentinel', version: '7.260809.0' },
    ]);
  });

  it('excludes target slugs without a compatible version, preserving order', () => {
    expect(
      buildMatrixEntries(
        ['mitre', 'sentinel'],
        new Map([['sentinel', '7.260809.0']])
      )
    ).toEqual([{ slug: 'sentinel', version: '7.260809.0' }]);
  });
});

describe('field/key builders', () => {
  it.each`
    slug              | expectedField     | expectedJsonKey                     | expectedEnvKey
    ${'mitre'}        | ${'mitre'}        | ${'connector_mitre_version'}        | ${'CONNECTOR_MITRE_VERSION'}
    ${'my-connector'} | ${'my_connector'} | ${'connector_my_connector_version'} | ${'CONNECTOR_MY_CONNECTOR_VERSION'}
  `(
    'formats "$slug" consistently across field, json key and env key',
    ({ slug, expectedField, expectedJsonKey, expectedEnvKey }) => {
      expect(buildConnectorFieldSlug(slug)).toBe(expectedField);
      expect(buildConnectorJsonKey(slug)).toBe(expectedJsonKey);
      expect(buildConnectorEnvKey(slug)).toBe(expectedEnvKey);
    }
  );
});

describe('buildVersionsMatrixJson', () => {
  it('builds the opencti_version plus one key per connector entry', () => {
    expect(
      buildVersionsMatrixJson('7.260904.0', [
        { slug: 'mitre', version: '7.260809.0' },
        { slug: 'sentinel', version: '7.260809.0' },
      ])
    ).toEqual({
      opencti_version: '7.260904.0',
      connector_mitre_version: '7.260809.0',
      connector_sentinel_version: '7.260809.0',
    });
  });

  it('returns only the opencti_version when there are no entries', () => {
    expect(buildVersionsMatrixJson('7.260904.0', [])).toEqual({
      opencti_version: '7.260904.0',
    });
  });
});

describe('buildVersionsMatrixEnv', () => {
  it('builds an OPENCTI_VERSION line plus one line per connector entry', () => {
    expect(
      buildVersionsMatrixEnv('7.260904.0', [
        { slug: 'mitre', version: '7.260809.0' },
        { slug: 'sentinel', version: '7.260809.0' },
      ])
    ).toBe(
      [
        'OPENCTI_VERSION="7.260904.0"',
        'CONNECTOR_MITRE_VERSION="7.260809.0"',
        'CONNECTOR_SENTINEL_VERSION="7.260809.0"',
      ].join('\n')
    );
  });

  it('uppercases the product and connector version values', () => {
    expect(
      buildVersionsMatrixEnv('7.260308.0-lts.4', [
        { slug: 'mitre', version: '7.260809.0-lts.1' },
      ])
    ).toBe(
      [
        'OPENCTI_VERSION="7.260308.0-LTS.4"',
        'CONNECTOR_MITRE_VERSION="7.260809.0-LTS.1"',
      ].join('\n')
    );
  });
});

describe('buildVersionsMatrixCsv', () => {
  it('builds a header row plus a single value row', () => {
    expect(
      buildVersionsMatrixCsv('7.260904.0', [
        { slug: 'mitre', version: '7.260809.0' },
        { slug: 'sentinel', version: '7.260809.0' },
      ])
    ).toBe(
      [
        'opencti_version,connector_mitre_version,connector_sentinel_version',
        '7.260904.0,7.260809.0,7.260809.0',
      ].join('\n')
    );
  });

  it('quotes fields containing a comma, quote, or newline', () => {
    expect(
      buildVersionsMatrixCsv('7.260904.0', [
        { slug: 'weird', version: '7.260809.0,"lts"\n1' },
      ])
    ).toBe(
      [
        'opencti_version,connector_weird_version',
        '7.260904.0,"7.260809.0,""lts""\n1"',
      ].join('\n')
    );
  });

  it('returns just the header/value row for opencti_version when there are no entries', () => {
    expect(buildVersionsMatrixCsv('7.260904.0', [])).toBe(
      ['opencti_version', '7.260904.0'].join('\n')
    );
  });
});
