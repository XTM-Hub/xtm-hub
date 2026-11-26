'use server';
import {
  publicDocumentCacheTag,
  publicDocumentsCacheTag,
} from '@/utils/shareable-resources/utils/shareable-resources.server.utils';
import { updateTag } from 'next/cache';

/**
 * Invalidates the cached public document list (and sitemap) for a service
 * instance after a create/update/delete. Pass `docSlug` on update/delete to
 * also invalidate that document's own detail cache; omit it on creation.
 *
 * Uses `updateTag` (not `revalidateTag`) for read-your-own-writes: the next
 * request must see fresh data immediately, not a stale-while-revalidate
 * response that could 404 a document the user just created/updated.
 */
export default async function revalidateDocumentSlugsAction(
  serviceInstanceSlug: string,
  docSlug?: string | null
) {
  updateTag(publicDocumentsCacheTag(serviceInstanceSlug));
  if (docSlug) {
    updateTag(publicDocumentCacheTag(serviceInstanceSlug, docSlug));
  }
}
