import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import {
  buildMultipartBody,
  requestGraphqlWithUploads,
} from '@/lib/graphql-upload-client';

const QUERY = 'mutation Upload($document: Upload!) { uploadUserPicture }';

const mockFetchResponse = (body: unknown) => {
  const fetchMock = vi.fn().mockResolvedValue({ json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('buildMultipartBody with a single-file variable', () => {
  it('should null the variable and map the file at the variable path when the variable is a single file', () => {
    // Given
    const file = new File(['x'], 'picture.png', { type: 'image/png' });

    // When
    const { operations, map, files } = buildMultipartBody(
      QUERY,
      { document: null },
      { document: file }
    );

    // Then
    expect(JSON.parse(operations).variables).toEqual({ document: null });
    expect(JSON.parse(map)).toEqual({ '0': ['variables.document'] });
    expect(files).toEqual([file]);
  });

  it('should keep continuous file indexes when single-file and list variables are mixed', () => {
    // Given
    const logo = new File(['l'], 'logo.png', { type: 'image/png' });
    const first = new File(['a'], 'a.png', { type: 'image/png' });
    const second = new File(['b'], 'b.png', { type: 'image/png' });

    // When
    const { operations, map, files } = buildMultipartBody(
      QUERY,
      { input: { title: 'Doc' }, logo: null, images: null },
      { logo, images: [first, second] }
    );

    // Then
    expect(JSON.parse(operations).variables).toEqual({
      input: { title: 'Doc' },
      logo: null,
      images: [null, null],
    });
    expect(JSON.parse(map)).toEqual({
      '0': ['variables.logo'],
      '1': ['variables.images.0'],
      '2': ['variables.images.1'],
    });
    expect(files).toEqual([logo, first, second]);
  });
});

describe('requestGraphqlWithUploads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should post the multipart body with credentials and the preflight header when the request succeeds', async () => {
    // Given
    const fetchMock = mockFetchResponse({
      data: { uploadUserPicture: { id: 'user-1' } },
    });
    const file = new File(['x'], 'picture.png', { type: 'image/png' });

    // When
    const data = await requestGraphqlWithUploads<
      { uploadUserPicture: { id: string } },
      { document: null }
    >(QUERY, { document: null }, { document: file });

    // Then
    expect(data).toEqual({ uploadUserPicture: { id: 'user-1' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/graphql-api$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({
      'apollo-require-preflight': 'true',
    });
    const body = init.body as FormData;
    expect(JSON.parse(body.get('operations') as string)).toEqual({
      query: QUERY,
      variables: { document: null },
    });
    expect(JSON.parse(body.get('map') as string)).toEqual({
      '0': ['variables.document'],
    });
    expect(body.get('0')).toBeInstanceOf(File);
  });

  it('should throw UnauthenticatedError when the response has an UNAUTHENTICATED error', async () => {
    // Given
    mockFetchResponse({
      errors: [{ message: 'nope', extensions: { code: 'UNAUTHENTICATED' } }],
    });

    // When
    const request = requestGraphqlWithUploads(
      QUERY,
      { document: null },
      { document: [] }
    );

    // Then
    await expect(request).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('should throw the first GraphQL error message when the error is not UNAUTHENTICATED', async () => {
    // Given
    mockFetchResponse({ errors: [{ message: 'FILE_TOO_LARGE' }] });

    // When
    const request = requestGraphqlWithUploads(
      QUERY,
      { document: null },
      { document: [] }
    );

    // Then
    await expect(request).rejects.toThrow('FILE_TOO_LARGE');
  });
});
