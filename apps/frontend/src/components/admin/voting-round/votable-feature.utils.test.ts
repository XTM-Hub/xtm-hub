import {
  buildVotableFeatureInput,
  extractIllustrationFiles,
  resolveIllustrationDocumentId,
  toGraphqlUploads,
} from '@/components/admin/voting-round/votable-feature.utils';
import { FiligranProduct } from '@graphql/generated';

const buildValues = (
  overrides: Partial<Parameters<typeof buildVotableFeatureInput>[0]> = {}
) =>
  ({
    title: 'AI-powered report triage',
    short_description: 'Automatically extract entities.',
    description: 'Long description',
    product: FiligranProduct.Opencti,
    use_case_ids: ['use-case-1'],
    illustration_document: undefined,
    remove_illustration: false,
    position: '3',
    active: true,
    ...overrides,
  }) as Parameters<typeof buildVotableFeatureInput>[0];

describe('buildVotableFeatureInput', () => {
  it('should turn the position back into a number the API accepts', () => {
    expect(buildVotableFeatureInput(buildValues()).position).toBe(3);
  });

  it('should not leak the upload fields into the input', () => {
    expect(buildVotableFeatureInput(buildValues())).not.toHaveProperty(
      'illustration_document'
    );
    expect(buildVotableFeatureInput(buildValues())).not.toHaveProperty(
      'remove_illustration'
    );
  });
});

describe('extractIllustrationFiles', () => {
  it('should return an empty list when no file was picked', () => {
    expect(extractIllustrationFiles(buildValues())).toEqual([]);
  });

  it('should turn the picked FileList into a plain array', () => {
    const file = new File(['x'], 'illustration.png', { type: 'image/png' });

    expect(
      extractIllustrationFiles(
        buildValues({
          illustration_document: [file] as unknown as FileList,
        })
      )
    ).toEqual([file]);
  });
});

describe('toGraphqlUploads', () => {
  it('should map the files onto the document variable', () => {
    const file = new File(['x'], 'illustration.png', { type: 'image/png' });

    expect(toGraphqlUploads([file])).toEqual({ document: [file] });
  });
});

describe('resolveIllustrationDocumentId', () => {
  it.each`
    removeIllustration | currentDocumentId | expected        | description
    ${false}           | ${'document-1'}   | ${'document-1'} | ${'an untouched illustration is resent as is'}
    ${true}            | ${'document-1'}   | ${null}         | ${'an explicit removal clears the field'}
    ${false}           | ${null}           | ${null}         | ${'a feature without illustration stays empty'}
    ${false}           | ${undefined}      | ${null}         | ${'a missing value is normalised to null'}
  `(
    'should return $expected when $description',
    ({ removeIllustration, currentDocumentId, expected }) => {
      expect(
        resolveIllustrationDocumentId(
          buildValues({ remove_illustration: removeIllustration }),
          currentDocumentId
        )
      ).toBe(expected);
    }
  );
});
