import { RequestParameters, UploadableMap } from 'relay-runtime';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fetchFormData, fileListToUploadableMap } from './fetch-form-data';

describe('fetchFormData', () => {
  const fileA = { name: 'a.txt' };
  const fileB = { name: 'b.txt' };
  const fileC = { name: 'c.txt' };
  const fileD = { name: 'd.txt' };

  describe('fetchFormData', () => {
    const originalFetch = globalThis.fetch;
    const request = { text: 'query {}' } as RequestParameters;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should return JSON when no errors', async () => {
      const mockJson = { data: { foo: 'bar' } };
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockJson),
      });
      const result = await fetchFormData('/api', request, {}, {});
      expect(result).toEqual(mockJson);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('should throw UNAUTHENTICATED error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          errors: [
            { extensions: { code: 'UNAUTHENTICATED' }, message: 'Auth failed' },
          ],
        }),
      });
      await expect(fetchFormData('/api', request, {}, {})).rejects.toThrow(
        'UNAUTHENTICATED'
      );
    });

    it('should throw first error message for other errors', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          errors: [{ extensions: { code: 'OTHER' }, message: 'Some error' }],
        }),
      });
      await expect(fetchFormData('/api', request, {}, {})).rejects.toThrow(
        'Some error'
      );
    });

    it('should set cookie header if cookieList is provided', async () => {
      const mockJson = { data: { foo: 'bar' } };
      let headers: Record<string, unknown> = {};
      globalThis.fetch = vi.fn().mockImplementation((_, opts) => {
        headers = opts.headers;
        return Promise.resolve({
          json: () => Promise.resolve(mockJson),
        });
      });
      const cookieList = [
        { name: 'session', value: 'abc' },
        { name: 'other', value: 'xyz' },
      ];
      await fetchFormData('/api', request, {}, {}, cookieList);
      expect(headers.cookie).toBe('session=abc; other=xyz');
    });

    describe('file mapping', () => {
      let originalFormData: typeof globalThis.FormData;
      let formDataEntries: Record<string, unknown>;

      beforeEach(() => {
        originalFormData = globalThis.FormData;
        formDataEntries = {};

        globalThis.FormData = class {
          private _data: Record<string, unknown> = {};
          append(key: string, value: unknown) {
            this._data[key] = value;
            formDataEntries[key] = value;
          }
          // Needed for fetchFormData usage
          [Symbol.iterator]() {
            return Object.entries(this._data)[Symbol.iterator]();
          }
        } as unknown as typeof globalThis.FormData;

        globalThis.fetch = vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({ data: { ok: true } }),
        });
      });

      afterEach(() => {
        globalThis.FormData = originalFormData;
      });

      it('should correctly map a single uploadable without prefix', async () => {
        const uploadables = {
          'a.txt': fileA,
        };

        await fetchFormData(
          '/api',
          request,
          {},
          uploadables as unknown as UploadableMap
        );

        const mapField = formDataEntries['map'] as string;
        const parsedMap = JSON.parse(mapField);
        expect(parsedMap).toEqual({
          0: ['variables.document'],
        });

        expect(formDataEntries['0']).toBe(fileA);
      });

      it('should correctly map uploadables in FormData without prefix', async () => {
        const uploadables = {
          'a.txt': fileA,
          'b.txt': fileB,
        };

        await fetchFormData(
          '/api',
          request,
          {},
          uploadables as unknown as UploadableMap
        );

        const mapField = formDataEntries['map'] as string;
        const parsedMap = JSON.parse(mapField);
        expect(parsedMap).toEqual({
          0: ['variables.document.0'],
          1: ['variables.document.1'],
        });

        expect(formDataEntries['0']).toBe(fileA);
        expect(formDataEntries['1']).toBe(fileB);
      });

      it('should correctly map uploadables in FormData with their prefix', async () => {
        const uploadables = {
          'documentprefix-a.txt': fileA,
          'logoprefix-b.txt': fileB,
          'imageprefix-c.txt': fileC,
          'imageprefix-d.txt': fileD,
        };

        await fetchFormData(
          '/api',
          request,
          {},
          uploadables as unknown as UploadableMap
        );

        const mapField = formDataEntries['map'] as string;
        const parsedMap = JSON.parse(mapField);
        expect(parsedMap).toEqual({
          0: ['variables.document.0'],
          1: ['variables.logo.0'],
          2: ['variables.image.0'],
          3: ['variables.image.1'],
        });

        expect(formDataEntries['0']).toBe(fileA);
        expect(formDataEntries['1']).toBe(fileB);
        expect(formDataEntries['2']).toBe(fileC);
        expect(formDataEntries['3']).toBe(fileD);
      });
    });
  });

  describe('fileListToUploadableMap', () => {
    it.each`
      title                                    | input             | expected
      ${'map a single file by name'}           | ${[fileA]}        | ${{ 'a.txt': fileA }}
      ${'map multiple files by name'}          | ${[fileA, fileB]} | ${{ 'a.txt': fileA, 'b.txt': fileB }}
      ${'skip null values'}                    | ${[fileA, null]}  | ${{ 'a.txt': fileA }}
      ${'return empty object for empty array'} | ${[]}             | ${{}}
    `('should $title', ({ input, expected }) => {
      const result = fileListToUploadableMap(input);
      expect(result).toEqual(expected);
    });
  });
});
