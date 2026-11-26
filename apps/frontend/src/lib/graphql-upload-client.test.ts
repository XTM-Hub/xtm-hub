import { buildMultipartBody } from '@/lib/graphql-upload-client';

const QUERY = 'mutation Create($input: X!, $document: [Upload!]) { create }';

describe('buildMultipartBody', () => {
  it('should replace the uploads with nulls in the operation', () => {
    const file = new File(['x'], 'illustration.png', { type: 'image/png' });

    const { operations } = buildMultipartBody(
      QUERY,
      { input: { title: 'Feature' }, document: null },
      { document: [file] }
    );

    expect(JSON.parse(operations).variables).toEqual({
      input: { title: 'Feature' },
      document: [null],
    });
  });

  it('should point each file part at the variable path it fills', () => {
    const first = new File(['a'], 'a.png', { type: 'image/png' });
    const second = new File(['b'], 'b.png', { type: 'image/png' });

    const { map, files } = buildMultipartBody(
      QUERY,
      { document: null },
      { document: [first, second] }
    );

    expect(JSON.parse(map)).toEqual({
      '0': ['variables.document.0'],
      '1': ['variables.document.1'],
    });
    expect(files).toEqual([first, second]);
  });

  // Without a file the variable must keep the value the caller sent, otherwise
  // an absent upload would be turned into an empty list the API rejects.
  it('should leave the variables alone when there is no file', () => {
    const { operations, map, files } = buildMultipartBody(
      QUERY,
      { input: { title: 'Feature' }, document: null },
      { document: [] }
    );

    expect(JSON.parse(operations).variables.document).toBeNull();
    expect(JSON.parse(map)).toEqual({});
    expect(files).toEqual([]);
  });
});
