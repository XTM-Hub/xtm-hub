import { describe, expect, it } from 'vitest';
import { DocumentMetadataKeyCode } from '../../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../../utils/error/error.code';
import { HuntPackHelper } from './hunt-pack.helper';
import {
  HUNT_PACK_MAX_HUNTS,
  HUNT_PACK_MINIMUM_PRODUCT_VERSION,
} from './hunt-pack.model';

const attackPattern = (id: string, mitreId: string, viaReference = false) => ({
  type: 'attack-pattern',
  spec_version: '2.1',
  id,
  name: mitreId,
  ...(viaReference
    ? {
        external_references: [
          { source_name: 'mitre-attack', external_id: mitreId },
        ],
      }
    : { x_mitre_id: mitreId }),
});

const hunt = (
  id: string,
  techniqueRefs: string[] = [],
  platforms: string[] = []
) => ({
  type: 'hunt',
  spec_version: '2.1',
  id,
  name: `Hunt ${id}`,
  hypothesis: 'An adversary uses encoded PowerShell commands',
  technique_refs: techniqueRefs,
  native_queries: platforms.map((platform) => ({
    platform,
    language: 'spl',
    query: 'index=main',
  })),
});

const bundle = (objects: unknown[]) => ({
  type: 'bundle',
  id: 'bundle--8c1b3f0e-0a4b-4b8e-9d0c-2f6a7e5b1c90',
  objects,
});

describe('huntPackHelper.summarize', () => {
  it('counts the hunts and extracts their techniques and hunted platforms', () => {
    const summary = HuntPackHelper.summarize(
      bundle([
        attackPattern('attack-pattern--1', 'T1059.001'),
        attackPattern('attack-pattern--2', 'T1003', true),
        hunt(
          'hunt--1',
          ['attack-pattern--1', 'attack-pattern--2'],
          ['splunk', 'microsoft-sentinel']
        ),
        hunt(
          'hunt--2',
          ['attack-pattern--1', 'attack-pattern--missing'],
          ['splunk']
        ),
        { ...hunt('hunt--3'), type: 'x-opencti-hunt' },
        { type: 'identity', id: 'identity--1', name: 'Filigran' },
      ])
    );

    expect(summary).toEqual({
      huntCount: 3,
      attackTechniques: ['T1003', 'T1059.001'],
      huntPlatforms: ['microsoft-sentinel', 'splunk'],
    });
  });

  it('lists the platforms of a single native query and of JSON-encoded native queries', () => {
    const summary = HuntPackHelper.summarize(
      bundle([
        {
          ...hunt('hunt--1'),
          native_queries: { platform: 'splunk', language: 'spl', query: 'x' },
        },
        {
          ...hunt('hunt--2'),
          native_queries: [
            JSON.stringify({
              platform: 'elastic-security',
              language: 'esql',
              query: 'from logs-*',
            }),
          ],
        },
      ])
    );

    expect(summary.huntPlatforms).toEqual(['elastic-security', 'splunk']);
  });

  it('ignores malformed technique references', () => {
    const summary = HuntPackHelper.summarize(
      bundle([
        {
          ...hunt('hunt--1'),
          technique_refs: [42, null],
        },
      ])
    );

    expect(summary).toEqual({
      huntCount: 1,
      attackTechniques: [],
      huntPlatforms: [],
    });
  });

  it('only counts attack patterns with a valid ATT&CK identifier as techniques', () => {
    const summary = HuntPackHelper.summarize(
      bundle([
        attackPattern('attack-pattern--1', ' t1059.001 '),
        attackPattern('attack-pattern--2', 'not-a-technique'),
        {
          ...attackPattern('attack-pattern--3', 'T1003'),
          x_mitre_id: 'invalid',
        },
        { type: 'malware', id: 'malware--1', x_mitre_id: 'T1566' },
        hunt('hunt--1', [
          'attack-pattern--1',
          'attack-pattern--2',
          'attack-pattern--3',
          'malware--1',
        ]),
      ])
    );

    expect(summary.attackTechniques).toEqual(['T1059.001']);
  });

  it('falls back to the MITRE reference when the ATT&CK identifier is invalid', () => {
    const summary = HuntPackHelper.summarize(
      bundle([
        {
          ...attackPattern('attack-pattern--1', 'T1003', true),
          x_mitre_id: 'invalid',
        },
        hunt('hunt--1', ['attack-pattern--1']),
      ])
    );

    expect(summary.attackTechniques).toEqual(['T1003']);
  });

  it.each`
    case                         | content
    ${'a missing file content'}  | ${undefined}
    ${'an array'}                | ${[]}
    ${'a non bundle object'}     | ${{ type: 'report', objects: [] }}
    ${'a bundle without object'} | ${{ type: 'bundle' }}
  `('rejects $case as an invalid bundle', ({ content }) => {
    expect(() => HuntPackHelper.summarize(content)).toThrow(
      BadRequestErrorCode.HuntPackInvalidBundle
    );
  });

  it('rejects a bundle without hunt', () => {
    expect(() =>
      HuntPackHelper.summarize(
        bundle([attackPattern('attack-pattern--1', 'T1059')])
      )
    ).toThrow(BadRequestErrorCode.HuntPackEmpty);
  });

  it('rejects a bundle with a hunt the OpenCTI import refuses', () => {
    expect(() =>
      HuntPackHelper.summarize(
        bundle([
          hunt('hunt--1'),
          { ...hunt('hunt--2'), sigma_rule: 'title: No detection' },
        ])
      )
    ).toThrow(BadRequestErrorCode.HuntPackInvalidHunt);
  });

  it('rejects a bundle with more hunts than an OpenCTI import accepts', () => {
    const hunts = Array.from({ length: HUNT_PACK_MAX_HUNTS + 1 }, (_, index) =>
      hunt(`hunt--${index}`)
    );

    expect(() => HuntPackHelper.summarize(bundle(hunts))).toThrow(
      BadRequestErrorCode.HuntPackTooLarge
    );
  });

  it('accepts the largest hunt pack an OpenCTI import accepts', () => {
    const hunts = Array.from({ length: HUNT_PACK_MAX_HUNTS }, (_, index) =>
      hunt(`hunt--${index}`)
    );

    expect(HuntPackHelper.summarize(bundle(hunts)).huntCount).toBe(
      HUNT_PACK_MAX_HUNTS
    );
  });
});

describe('huntPackHelper metadata', () => {
  it('serializes a summary as metadata entries', () => {
    expect(
      HuntPackHelper.toMetadata({
        huntCount: 2,
        attackTechniques: ['T1059'],
        huntPlatforms: ['splunk'],
      })
    ).toEqual([
      { key: DocumentMetadataKeyCode.HuntCount, value: '2' },
      { key: DocumentMetadataKeyCode.AttackTechniques, value: '["T1059"]' },
      { key: DocumentMetadataKeyCode.HuntPlatforms, value: '["splunk"]' },
    ]);
  });

  it('drops the extracted metadata a client tries to set', () => {
    expect(
      HuntPackHelper.withoutExtractedMetadata([
        { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
        { key: DocumentMetadataKeyCode.HuntCount, value: '999' },
        { key: DocumentMetadataKeyCode.AttackTechniques, value: '["T0000"]' },
        { key: DocumentMetadataKeyCode.HuntPlatforms, value: '["fake"]' },
      ])
    ).toEqual([
      { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
    ]);
  });

  it.each`
    declared           | expected
    ${'7.261010.0'}    | ${'7.261010.0'}
    ${'7.261003.0'}    | ${'7.261003.0'}
    ${'7.261002.0'}    | ${HUNT_PACK_MINIMUM_PRODUCT_VERSION}
    ${'6.8.0'}         | ${HUNT_PACK_MINIMUM_PRODUCT_VERSION}
    ${'not-a-version'} | ${HUNT_PACK_MINIMUM_PRODUCT_VERSION}
    ${''}              | ${HUNT_PACK_MINIMUM_PRODUCT_VERSION}
    ${undefined}       | ${HUNT_PACK_MINIMUM_PRODUCT_VERSION}
  `(
    'requires OpenCTI $expected for a declared product version "$declared"',
    ({ declared, expected }) => {
      const metadata =
        declared === undefined
          ? []
          : [{ key: DocumentMetadataKeyCode.ProductVersion, value: declared }];

      expect(HuntPackHelper.withMinimumProductVersion(metadata)).toEqual([
        { key: DocumentMetadataKeyCode.ProductVersion, value: expected },
      ]);
    }
  );

  it.each`
    value                  | expected
    ${'["T1059","T1003"]'} | ${['T1059', 'T1003']}
    ${['splunk', 42]}      | ${['splunk']}
    ${'not-json'}          | ${[]}
    ${'{"a":1}'}           | ${[]}
    ${null}                | ${[]}
  `('parses the string list $value', ({ value, expected }) => {
    expect(HuntPackHelper.parseStringList(value)).toEqual(expected);
  });
});
