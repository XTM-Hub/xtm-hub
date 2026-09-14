import { describe, expect, it } from 'vitest';
import { ManifestType } from '../../../__generated__/resolvers-types';
import { MANIFEST_LIST_DEFAULT_COUNT } from '../../../modules/shareable-resource/manifest/manifest.consts';
import {
  buildManifestETag,
  isIntegrationType,
  isValidManifestName,
  parseCount,
  validateManifestParams,
} from './manifest-endpoint.utils';

describe('isValidManifestName', () => {
  it.each`
    name                                                  | expected | description
    ${'connector-manifest-7.260604.0-260526113805'}       | ${true}  | ${'standard valid name'}
    ${'connector-manifest-7.260309.0-lts.5-260526113805'} | ${true}  | ${'valid lowercase LTS variant'}
    ${'connector-manifest-7.260604.0-2605'}               | ${false} | ${'datetime too short'}
    ${'collector-manifest-7.260604.0-260526113805'}       | ${false} | ${'wrong prefix'}
    ${'../../secret'}                                     | ${false} | ${'path traversal attempt'}
    ${''}                                                 | ${false} | ${'empty string'}
    ${'connector-manifest-abc-260526113805'}              | ${false} | ${'non-numeric version'}
    ${'connector-manifest-7.2-260526113805'}              | ${false} | ${'missing patch segment'}
  `('returns $expected ($description)', ({ name, expected }) => {
    expect(isValidManifestName(name)).toBe(expected);
  });
});

describe('parseCount', () => {
  it.each`
    raw          | expected                       | description
    ${undefined} | ${MANIFEST_LIST_DEFAULT_COUNT} | ${'missing → default'}
    ${'5'}       | ${5}                           | ${'valid integer'}
    ${'0'}       | ${undefined}                   | ${'zero rejected (< 1)'}
    ${'-3'}      | ${undefined}                   | ${'negative rejected'}
    ${'1.5'}     | ${undefined}                   | ${'non-integer rejected'}
    ${'abc'}     | ${undefined}                   | ${'non-numeric rejected'}
    ${''}        | ${undefined}                   | ${'empty string rejected'}
    ${['5']}     | ${undefined}                   | ${'array rejected (duplicated param)'}
  `('$description', ({ raw, expected }) => {
    expect(parseCount(raw)).toBe(expected);
  });
});

describe('isIntegrationType', () => {
  it.each`
    value                     | expected | description
    ${ManifestType.Connector} | ${true}  | ${'valid enum value (connector)'}
    ${'injector'}             | ${false} | ${'type listed in the contract but not yet in the enum'}
    ${42}                     | ${false} | ${'number'}
    ${undefined}              | ${false} | ${'undefined'}
    ${['connector']}          | ${false} | ${'array'}
  `('$description → $expected', ({ value, expected }) => {
    expect(isIntegrationType(value)).toBe(expected);
  });
});

describe('validateManifestParams', () => {
  const VALID = {
    product: 'opencti',
    version: '7.260604.0',
    integrationType: 'connector',
  };

  it('returns the typed params when everything is valid', () => {
    expect(validateManifestParams(VALID)).toEqual({
      ok: true,
      product: 'opencti',
      version: '7.260604.0',
      integrationType: 'connector',
    });
  });

  it.each`
    params                                    | message                      | description
    ${{ ...VALID, product: 'x' }}             | ${'Invalid product'}         | ${'unknown product'}
    ${{ ...VALID, integrationType: 'x' }}     | ${'Invalid integrationType'} | ${'unknown integration type'}
    ${{ ...VALID, version: 'not-a-version' }} | ${'Invalid version format'}  | ${'malformed version'}
  `('rejects $description', ({ params, message }) => {
    expect(validateManifestParams(params)).toEqual({ ok: false, message });
  });
});

describe('buildManifestETag', () => {
  const VALID_NAME = 'connector-manifest-7.260604.0-260526113805';

  it('wraps the manifest name in a strong ETag', () => {
    expect(buildManifestETag(VALID_NAME)).toBe(`"${VALID_NAME}"`);
  });
});
