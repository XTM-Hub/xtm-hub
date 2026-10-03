import { describe, expect, it } from 'vitest';
import { DocumentMetadataKeyCode } from '../../../__generated__/resolvers-types';
import { BadRequestErrorCode } from '../../../utils/error/error.code';
import {
  ConnectorCoverageSnapshot,
  ManifestFragmentHelper,
  MAX_CONTACT_LENGTH,
} from './manifest-fragment.helper';

describe('validateAndFormatManifestVersion', () => {
  it.each`
    input                 | expected
    ${'7.260309.0-lts.5'} | ${'007.260309.000.LTS.005'}
    ${'7.260309.0'}       | ${'007.260309.000'}
    ${'6.5.1'}            | ${'006.000005.001'}
    ${'6.5.1-lts.2'}      | ${'006.000005.001.LTS.002'}
  `('formats "$input" as "$expected"', ({ input, expected }) => {
    expect(ManifestFragmentHelper.validateAndFormatManifestVersion(input)).toBe(
      expected
    );
  });

  it.each`
    input
    ${'not-a-version'}
    ${'6.5'}
    ${'6'}
    ${'6.0.4.5'}
    ${'LTS.1.2.3'}
    ${'7.20260703.0'}
    ${'>= 7.260309.0'}
  `('throws when version format is invalid: "$input"', ({ input }) => {
    expect(() =>
      ManifestFragmentHelper.validateAndFormatManifestVersion(input)
    ).toThrow(BadRequestErrorCode.InvalidManifestVersionFormat);
  });
});

describe('validateShortDescriptionLength', () => {
  it.each`
    length | description
    ${0}   | ${'empty string'}
    ${1}   | ${'single character'}
    ${250} | ${'exactly the max length'}
  `(
    'accepts a short_description of length $length ($description)',
    ({ length }) => {
      expect(() =>
        ManifestFragmentHelper.validateShortDescriptionLength(
          'a'.repeat(length)
        )
      ).not.toThrow();
    }
  );

  it.each`
    length | description
    ${251} | ${'one character over the max length'}
    ${300} | ${'well over the max length'}
  `(
    'throws for a short_description of length $length ($description)',
    ({ length }) => {
      expect(() =>
        ManifestFragmentHelper.validateShortDescriptionLength(
          'a'.repeat(length)
        )
      ).toThrow(BadRequestErrorCode.ShortDescriptionTooLong);
    }
  );
});

describe('validateSolutionCategories', () => {
  it.each`
    solutionCategories       | description
    ${['Threat Intel']}      | ${'a single category'}
    ${['Threat Intel', 'X']} | ${'multiple categories'}
  `(
    'accepts solution_categories with $description',
    ({ solutionCategories }) => {
      expect(() =>
        ManifestFragmentHelper.validateSolutionCategories(solutionCategories)
      ).not.toThrow();
    }
  );

  it.each`
    solutionCategories | description
    ${[]}              | ${'an empty array'}
    ${null}            | ${'null'}
    ${undefined}       | ${'undefined'}
  `(
    'throws when solution_categories is $description',
    ({ solutionCategories }) => {
      expect(() =>
        ManifestFragmentHelper.validateSolutionCategories(solutionCategories)
      ).toThrow(BadRequestErrorCode.SolutionCategoriesRequired);
    }
  );
});

describe('getLatestTagForConnectorVersion', () => {
  it.each`
    input                       | expected
    ${'007.260309.000'}         | ${'latest'}
    ${'007.260309.000.LTS.005'} | ${'latest-lts'}
  `('returns "$expected" for "$input"', ({ input, expected }) => {
    expect(ManifestFragmentHelper.getLatestTagForConnectorVersion(input)).toBe(
      expected
    );
  });
});

describe('isStrictlyGreaterConnectorVersion', () => {
  it.each`
    candidate                   | current                     | expected
    ${'007.260309.001'}         | ${'007.260309.000'}         | ${true}
    ${'007.260309.000'}         | ${'007.260309.000'}         | ${false}
    ${'007.260308.999'}         | ${'007.260309.000'}         | ${false}
    ${'007.260309.001.LTS.002'} | ${'007.260309.001.LTS.001'} | ${true}
    ${'007.260309.000'}         | ${''}                       | ${true}
  `(
    'compares padded candidate "$candidate" with current "$current"',
    ({ candidate, current, expected }) => {
      expect(
        ManifestFragmentHelper.isStrictlyGreaterConnectorVersion({
          candidate,
          current,
        })
      ).toBe(expected);
    }
  );
});

describe('getConnectorMetadataFromExisting', () => {
  it('returns undefined when no metadata is available', () => {
    expect(
      ManifestFragmentHelper.getConnectorMetadataFromExisting({
        currentLatestConnector: undefined,
        existingBatchConnectors: [],
      })
    ).toBeUndefined();
  });

  it('prefers current latest metadata and falls back to existing connectors', () => {
    expect(
      ManifestFragmentHelper.getConnectorMetadataFromExisting({
        currentLatestConnector: {
          datasheet_url: 'https://latest/datasheet',
        },
        existingBatchConnectors: [
          {
            datasheet_url: 'https://existing/datasheet',
            blogpost_url: 'https://existing/blogpost',
            demo_url: 'https://existing/demo',
          },
        ],
      })
    ).toEqual({
      datasheet_url: 'https://latest/datasheet',
      blogpost_url: 'https://existing/blogpost',
      demo_url: 'https://existing/demo',
    });
  });
});

describe('getConnectorDocumentTags', () => {
  it.each`
    shouldPromoteAsLatest | latestTag       | expected
    ${true}               | ${'latest'}     | ${['decoupling', 'latest']}
    ${true}               | ${'latest-lts'} | ${['decoupling', 'latest-lts']}
    ${false}              | ${'latest'}     | ${['decoupling']}
  `(
    'builds tags for shouldPromoteAsLatest=$shouldPromoteAsLatest',
    ({ shouldPromoteAsLatest, latestTag, expected }) => {
      expect(
        ManifestFragmentHelper.getConnectorDocumentTags(
          shouldPromoteAsLatest,
          latestTag
        )
      ).toEqual(expected);
    }
  );
});

describe('buildConnectorLogoFilename', () => {
  it('builds a unique filename based on connector title and version', () => {
    expect(
      ManifestFragmentHelper.buildConnectorLogoFilename({
        title: 'MISP',
        version: '7.260309.0-lts.5',
      })
    ).toBe('MISP-7.260309.0-lts.5-logo.png');
  });
});

describe('findMinConnectorVersion', () => {
  it.each([
    [[], undefined],
    [['6.5.1'], '6.5.1'],
    [['6.5.1', '7.0.0'], '6.5.1'],
    [['7.0.0', '6.5.1'], '6.5.1'],
    [['7.260309.0-lts.5', '6.5.1'], '6.5.1'],
    [['6.5.1-lts.2', '6.5.1-lts.1'], '6.5.1-lts.1'],
    [['6.5.1', '6.5.1'], '6.5.1'],
  ])('returns %s for %s', (versions, expected) => {
    expect(ManifestFragmentHelper.findMinConnectorVersion(versions)).toBe(
      expected
    );
  });
});

describe('assertHomogeneousLtsBatch', () => {
  it('returns false (non-LTS) for an empty batch', () => {
    expect(ManifestFragmentHelper.assertHomogeneousLtsBatch([])).toBe(false);
  });

  it('returns false for a non-LTS batch', () => {
    expect(
      ManifestFragmentHelper.assertHomogeneousLtsBatch([
        { version: '7.0.0' },
        { version: '7.1.0' },
      ])
    ).toBe(false);
  });

  it('returns true for an LTS batch', () => {
    expect(
      ManifestFragmentHelper.assertHomogeneousLtsBatch([
        { version: '7.260309.0-lts.5' },
        { version: '7.260309.0-lts.6' },
      ])
    ).toBe(true);
  });

  it('rejects a batch mixing LTS and non-LTS fragments', () => {
    expect(() =>
      ManifestFragmentHelper.assertHomogeneousLtsBatch([
        { version: '7.0.0' },
        { version: '7.260309.0-lts.5' },
      ])
    ).toThrow(BadRequestErrorCode.MixedLtsManifestFragments);
  });
});

describe('normalizeOptionalText', () => {
  it.each`
    value          | expected     | description
    ${'free'}      | ${'free'}    | ${'a plain value'}
    ${'  free  '}  | ${'free'}    | ${'surrounding whitespace'}
    ${'a@b.com\n'} | ${'a@b.com'} | ${'a trailing newline'}
  `(
    'should return $expected when given $description',
    ({ value, expected }: { value: string; expected: string }) => {
      // Given a raw optional text value
      // When it is normalized
      const result = ManifestFragmentHelper.normalizeOptionalText(value);
      // Then the trimmed value is returned
      expect(result).toBe(expected);
    }
  );

  it.each([
    { value: '', description: 'an empty string' },
    { value: '   ', description: 'whitespace only' },
    { value: null, description: 'null' },
    { value: undefined, description: 'undefined' },
  ])(
    'should return undefined when the value is $description',
    ({ value }: { value: string | null | undefined }) => {
      // Given a blank or absent value
      // When it is normalized
      const result = ManifestFragmentHelper.normalizeOptionalText(value);
      // Then it is treated as absent
      expect(result).toBeUndefined();
    }
  );
});

describe('parseContact', () => {
  it.each`
    length                    | description
    ${MAX_CONTACT_LENGTH - 1} | ${'just below the limit'}
    ${MAX_CONTACT_LENGTH}     | ${'exactly at the limit'}
  `(
    'should return the contact when its length is $length ($description)',
    ({ length }: { length: number }) => {
      // Given a contact within the allowed length
      const contact = 'a'.repeat(length);
      // When it is validated and normalized
      const result = ManifestFragmentHelper.parseContact(contact);
      // Then it is returned unchanged
      expect(result).toBe(contact);
    }
  );

  it('should measure the length after trimming', () => {
    // Given a contact at the limit, padded with whitespace
    const contact = 'a'.repeat(MAX_CONTACT_LENGTH);
    // When it is validated and normalized
    const result = ManifestFragmentHelper.parseContact(`  ${contact}  `);
    // Then the padding is not counted against the limit
    expect(result).toBe(contact);
  });

  it('should throw when the contact exceeds the maximum length', () => {
    // Given a contact one character over the limit
    const contact = 'a'.repeat(MAX_CONTACT_LENGTH + 1);
    // When it is validated
    const validate = () => ManifestFragmentHelper.parseContact(contact);
    // Then the ingestion is rejected
    expect(validate).toThrow(BadRequestErrorCode.ContactTooLong);
  });

  it.each([
    { value: '', description: 'an empty string' },
    { value: null, description: 'null' },
    { value: undefined, description: 'undefined' },
  ])(
    'should return undefined when the contact is $description',
    ({ value }: { value: string | null | undefined }) => {
      // Given no contact, which is the case for Filigran-supported integrations
      // When it is validated
      const result = ManifestFragmentHelper.parseContact(value);
      // Then no error is raised and nothing is stored
      expect(result).toBeUndefined();
    }
  );
});

describe('getDeclaredCoverageFromExisting', () => {
  const declaredSnapshot = (
    sectors: string[],
    version_padded?: string
  ): ConnectorCoverageSnapshot => ({
    version_padded,
    [DocumentMetadataKeyCode.CoveredObjectTypes]: '[]',
    [DocumentMetadataKeyCode.CoveredSectors]: JSON.stringify(sectors),
    [DocumentMetadataKeyCode.CoveredRegions]: '[]',
    [DocumentMetadataKeyCode.CoverageInferred]: 'false',
  });
  const inferredSnapshot: ConnectorCoverageSnapshot = {
    version_padded: '007.260310.000',
    [DocumentMetadataKeyCode.CoveredSectors]: JSON.stringify(['Energy']),
    [DocumentMetadataKeyCode.CoverageInferred]: 'true',
  };

  it('should prefer the declared coverage of the current latest connector', () => {
    // Given
    const currentLatestConnector = declaredSnapshot(['Finance']);
    const existingBatchConnectors = [
      declaredSnapshot(['Retail'], '007.260309.000'),
    ];

    // When
    const coverage = ManifestFragmentHelper.getDeclaredCoverageFromExisting({
      currentLatestConnector,
      existingBatchConnectors,
    });

    // Then
    expect(coverage?.sectors).toEqual(['Finance']);
  });

  it('should fall back to the highest version with a declared coverage', () => {
    // Given
    const existingBatchConnectors = [
      declaredSnapshot(['Retail'], '007.260301.000'),
      inferredSnapshot,
      declaredSnapshot(['Finance'], '007.260308.000'),
    ];

    // When
    const coverage = ManifestFragmentHelper.getDeclaredCoverageFromExisting({
      existingBatchConnectors,
    });

    // Then
    expect(coverage?.sectors).toEqual(['Finance']);
  });

  it('should keep the coverage an admin cleared on the current latest connector', () => {
    // Given - the latest version returned to inference, an older one still declares Finance
    const currentLatestConnector = inferredSnapshot;
    const existingBatchConnectors = [
      declaredSnapshot(['Finance'], '007.260308.000'),
    ];

    // When
    const coverage = ManifestFragmentHelper.getDeclaredCoverageFromExisting({
      currentLatestConnector,
      existingBatchConnectors,
    });

    // Then
    expect(coverage).toBeNull();
  });

  it('should search older versions when the current latest connector stores no coverage', () => {
    // Given
    const currentLatestConnector: ConnectorCoverageSnapshot = {
      version_padded: '007.260310.000',
    };
    const existingBatchConnectors = [
      declaredSnapshot(['Finance'], '007.260308.000'),
    ];

    // When
    const coverage = ManifestFragmentHelper.getDeclaredCoverageFromExisting({
      currentLatestConnector,
      existingBatchConnectors,
    });

    // Then
    expect(coverage?.sectors).toEqual(['Finance']);
  });

  it.each([
    ['no existing version', []],
    ['only inferred coverage', [inferredSnapshot]],
    ['an empty declared coverage', [declaredSnapshot([], '007.260308.000')]],
  ])('should return null with %s', (_description, existingBatchConnectors) => {
    // Given / When
    const coverage = ManifestFragmentHelper.getDeclaredCoverageFromExisting({
      existingBatchConnectors,
    });

    // Then
    expect(coverage).toBeNull();
  });
});
