import {
  DocumentFormValues,
  sendDocumentMutation,
  toCreateDocumentInput,
  toDocumentMetadata,
  toDocumentUploads,
  toUpdateDocumentInput,
} from '@/components/service/document/document-mutation.utils';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import { DocumentMetadataKeyCode, DocumentStatus } from '@graphql/generated';

vi.mock('@/lib/graphql-upload-client', () => ({
  requestGraphqlWithUploads: vi.fn(),
}));

const buildValues = (
  overrides: Record<string, unknown> = {}
): DocumentFormValues =>
  ({
    name: 'My dashboard',
    slug: 'my-dashboard',
    uploader_id: 'user-1',
    uploader_organization_id: 'org-1',
    short_description: 'short',
    description: 'long',
    product_version: '6.0.0',
    use_cases: ['use-case-1'],
    active: true,
    ...overrides,
  }) as DocumentFormValues;

const buildFile = (name: string) => new File(['content'], name);

describe('toCreateDocumentInput', () => {
  it('should keep the document columns and leave out the organization', () => {
    // When
    const input = toCreateDocumentInput(buildValues());

    // Then
    expect(input).toEqual({
      name: 'My dashboard',
      slug: 'my-dashboard',
      uploader_id: 'user-1',
      short_description: 'short',
      description: 'long',
      use_cases: ['use-case-1'],
      solution_categories: [],
      entity_types: null,
      license_type: null,
      status: DocumentStatus.Published,
    });
  });

  it('should default what the form leaves empty', () => {
    // When
    const input = toCreateDocumentInput(
      buildValues({
        active: undefined,
        use_cases: undefined,
        uploader_id: undefined,
      })
    );

    // Then
    expect(input).toMatchObject({
      status: DocumentStatus.Draft,
      use_cases: [],
      solution_categories: [],
      uploader_id: '',
    });
  });
});

describe('toUpdateDocumentInput', () => {
  it('should leave out the slug, which is never updated', () => {
    expect(toUpdateDocumentInput(buildValues(), 'draft')).not.toHaveProperty(
      'slug'
    );
  });

  it('should send nothing for the fields the form does not carry', () => {
    // When
    const serialized = JSON.parse(
      JSON.stringify(toUpdateDocumentInput(buildValues(), 'draft'))
    );

    // Then
    expect(serialized).toEqual({
      name: 'My dashboard',
      uploader_id: 'user-1',
      uploader_organization_id: 'org-1',
      short_description: 'short',
      description: 'long',
      use_cases: ['use-case-1'],
      status: DocumentStatus.Published,
    });
  });

  it.each`
    active   | currentStatus      | expectedStatus
    ${false} | ${'published'}     | ${DocumentStatus.Draft}
    ${true}  | ${'draft'}         | ${DocumentStatus.Published}
    ${true}  | ${'in_validation'} | ${DocumentStatus.Published}
    ${true}  | ${'published'}     | ${undefined}
    ${false} | ${'draft'}         | ${undefined}
    ${false} | ${'in_validation'} | ${undefined}
  `(
    'should send the status $expectedStatus when the switch is $active and the resource is $currentStatus',
    ({ active, currentStatus, expectedStatus }) => {
      // When
      const input = toUpdateDocumentInput(
        buildValues({ active }),
        currentStatus
      );

      // Then
      expect(input.status).toBe(expectedStatus);
      expect(input).not.toHaveProperty('active');
    }
  );
});

describe('toDocumentMetadata', () => {
  it('should turn every field that is neither a column nor a file into metadata', () => {
    // Given
    const values = buildValues({
      document: [buildFile('doc.json')],
      logo: [buildFile('logo.png')],
      images: [buildFile('image.png')],
    });

    // When
    const metadata = toDocumentMetadata(values);

    // Then
    expect(metadata).toEqual([
      { key: DocumentMetadataKeyCode.ProductVersion, value: '6.0.0' },
    ]);
  });

  it('should drop the empty metadata values', () => {
    // When
    const metadata = toDocumentMetadata(buildValues({ product_version: '' }));

    // Then
    expect(metadata).toEqual([]);
  });
});

describe('toDocumentUploads', () => {
  it('should key each file by the variable it fills', () => {
    // Given
    const sourceDocument = buildFile('doc.json');
    const logo = buildFile('logo.png');
    const images = [buildFile('a.png'), buildFile('b.png')];

    // When
    const uploads = toDocumentUploads({ sourceDocument, logo, images });

    // Then
    expect(uploads).toEqual({ sourceDocument, logo, images });
  });

  it('should leave out the variables with nothing to send', () => {
    expect(toDocumentUploads({ images: [] })).toEqual({});
  });
});

describe('sendDocumentMutation', () => {
  const QUERY = 'mutation DocumentCreate { createDocument { id } }';
  const variables = { name: 'My dashboard' };

  beforeEach(() => {
    vi.mocked(requestGraphqlWithUploads).mockReset();
  });

  it('should send the plain request when no file is carried', async () => {
    // Given
    const sendPlain = vi
      .fn()
      .mockResolvedValue({ createDocument: { id: '1' } });

    // When
    const result = await sendDocumentMutation(
      QUERY,
      { variables, uploads: {} },
      sendPlain
    );

    // Then
    expect(result).toEqual({ createDocument: { id: '1' } });
    expect(sendPlain).toHaveBeenCalledOnce();
    expect(requestGraphqlWithUploads).not.toHaveBeenCalled();
  });

  it('should send a multipart request, and not the plain one, when a file is carried', async () => {
    // Given
    const sendPlain = vi.fn();
    const uploads = { logo: buildFile('logo.png') };
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue({
      createDocument: { id: '2' },
    });

    // When
    const result = await sendDocumentMutation(
      QUERY,
      { variables, uploads },
      sendPlain
    );

    // Then
    expect(result).toEqual({ createDocument: { id: '2' } });
    expect(requestGraphqlWithUploads).toHaveBeenCalledWith(
      QUERY,
      variables,
      uploads
    );
    expect(sendPlain).not.toHaveBeenCalled();
  });
});
