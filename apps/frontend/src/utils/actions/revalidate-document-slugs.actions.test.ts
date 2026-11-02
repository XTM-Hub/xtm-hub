import {
  publicDocumentCacheTag,
  publicDocumentsCacheTag,
} from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import { updateTag } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';
import revalidateDocumentSlugsAction from './revalidate-document-slugs.actions';

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));

const SERVICE_INSTANCE_SLUG = 'opencti-integrations';
const DOC_SLUG = 'my-connector';
// The tags the public document fetchers cache their responses under.
const LIST_CACHE_TAG = publicDocumentsCacheTag(SERVICE_INSTANCE_SLUG);
const DOCUMENT_CACHE_TAG = publicDocumentCacheTag(
  SERVICE_INSTANCE_SLUG,
  DOC_SLUG
);

describe('revalidateDocumentSlugsAction', () => {
  it('should expire the document list and the document detail when a document slug is given', async () => {
    // Given / When
    await revalidateDocumentSlugsAction(SERVICE_INSTANCE_SLUG, DOC_SLUG);

    // Then
    expect(vi.mocked(updateTag).mock.calls).toEqual([
      [LIST_CACHE_TAG],
      [DOCUMENT_CACHE_TAG],
    ]);
  });

  it.each([
    ['no document slug is given', undefined],
    ['the document slug is null', null],
    ['the document slug is empty', ''],
  ])(
    'should only expire the document list when %s',
    async (_context, docSlug) => {
      // Given / When
      await revalidateDocumentSlugsAction(SERVICE_INSTANCE_SLUG, docSlug);

      // Then
      expect(vi.mocked(updateTag).mock.calls).toEqual([[LIST_CACHE_TAG]]);
    }
  );
});
