import { ServiceFormValues } from '@/components/service/components/subscribable-services.types';
import {
  invalidateDocumentQueries,
  invalidateDocumentQueriesAfterDelete,
} from '@/components/service/document/document-query-invalidation';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import revalidateDocumentSlugsAction from '@/utils/actions/revalidate-document-slugs.actions';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { testRenderHook } from '@/utils/test/test-render';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  DocumentCreateDocument,
  DocumentDeleteDocument,
  DocumentItemFragment,
  DocumentUpdateDocument,
} from '@graphql/generated';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVICE_INSTANCE_ID = 'service-instance-1';
const SERVICE_INSTANCE_SLUG = 'opencti-custom-dashboards';
const DOCUMENT_ID = 'document-1';
const DOCUMENT_SLUG = 'document-slug';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { request: mocks.request },
}));

vi.mock('@/lib/graphql-upload-client', () => ({
  requestGraphqlWithUploads: vi.fn(),
}));

vi.mock('@/utils/actions/revalidate-document-slugs.actions', () => ({
  default: vi.fn(),
}));

vi.mock('@/components/service/document/document-query-invalidation', () => ({
  invalidateDocumentQueries: vi.fn(),
  invalidateDocumentQueriesAfterDelete: vi.fn(),
}));

const serviceInstance = {
  id: SERVICE_INSTANCE_ID,
  slug: SERVICE_INSTANCE_SLUG,
} as serviceInstance_fragment$data;

const existingDocument = {
  id: DOCUMENT_ID,
  slug: DOCUMENT_SLUG,
} as DocumentItemFragment;

const buildFile = (name: string) => new File(['content'], name);

// A FileList is only ever read through Array.from, so an array stands in for it.
const toFileList = (files: File[]) => files as unknown as FileList;

const buildValues = (overrides: Record<string, unknown> = {}) =>
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
  }) as ServiceFormValues;

const renderContext = () =>
  testRenderHook(() =>
    useDocumentContext({
      serviceInstance,
      type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
    })
  ).result;

describe('useDocumentContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.request.mockResolvedValue({ createDocument: { id: DOCUMENT_ID } });
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue({
      createDocument: { id: DOCUMENT_ID },
    });
  });

  describe('handleAddSheet', () => {
    it('should send a plain request, without any upload, when the form carries no file', async () => {
      // Given
      const context = renderContext();
      const onSuccess = vi.fn();

      // When
      await context.current.handleAddSheet(buildValues(), onSuccess, vi.fn());

      // Then
      await waitFor(() =>
        expect(onSuccess).toHaveBeenCalledWith('My dashboard')
      );
      expect(requestGraphqlWithUploads).not.toHaveBeenCalled();
      expect(mocks.request).toHaveBeenCalledWith(
        expect.objectContaining({
          document: DocumentCreateDocument,
          variables: expect.objectContaining({
            serviceInstanceId: SERVICE_INSTANCE_ID,
            sourceDocument: null,
            logo: null,
            images: null,
          }),
        })
      );
    });

    it('should upload the files through the multipart client, each one under its own variable', async () => {
      // Given
      const sourceDocument = buildFile('dashboard.json');
      const logo = buildFile('logo.png');
      const images = [buildFile('a.png'), buildFile('b.png')];
      const context = renderContext();
      const onSuccess = vi.fn();

      // When
      await context.current.handleAddSheet(
        buildValues({
          document: toFileList([sourceDocument]),
          logo: toFileList([logo]),
          images: toFileList(images),
        }),
        onSuccess,
        vi.fn()
      );

      // Then
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(mocks.request).not.toHaveBeenCalled();
      expect(requestGraphqlWithUploads).toHaveBeenCalledWith(
        DocumentCreateDocument,
        expect.objectContaining({ serviceInstanceId: SERVICE_INSTANCE_ID }),
        { sourceDocument, logo, images }
      );
    });

    it('should invalidate the document queries and revalidate the public slugs once created', async () => {
      // Given
      const context = renderContext();
      const onSuccess = vi.fn();

      // When
      await context.current.handleAddSheet(buildValues(), onSuccess, vi.fn());

      // Then
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(invalidateDocumentQueries).toHaveBeenCalledOnce();
      expect(revalidateDocumentSlugsAction).toHaveBeenCalledWith(
        SERVICE_INSTANCE_SLUG
      );
    });

    it('should report the failure and invalidate nothing when the creation fails', async () => {
      // Given
      const error = new Error('DOCUMENT_CREATION_FAILED');
      mocks.request.mockRejectedValue(error);
      const context = renderContext();
      const onError = vi.fn();

      // When
      await context.current.handleAddSheet(buildValues(), vi.fn(), onError);

      // Then
      await waitFor(() => expect(onError).toHaveBeenCalledWith(error));
      expect(invalidateDocumentQueries).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdateSheet', () => {
    it('should upload only the new files and keep the existing images by id', async () => {
      // Given
      const newImage = buildFile('new.png');
      const newLogo = buildFile('new-logo.png');
      const existingImage = { id: 'image-1', file_name: 'old.png' };
      mocks.request.mockResolvedValue({ updateDocument: { id: DOCUMENT_ID } });
      vi.mocked(requestGraphqlWithUploads).mockResolvedValue({
        updateDocument: { id: DOCUMENT_ID },
      });
      const context = renderContext();
      const onSuccess = vi.fn();

      // When
      await context.current.handleUpdateSheet(
        buildValues({
          images: [existingImage, newImage] as unknown as FileList,
          logo: toFileList([newLogo]),
        }),
        existingDocument,
        onSuccess,
        vi.fn()
      );

      // Then
      await waitFor(() =>
        expect(onSuccess).toHaveBeenCalledWith('My dashboard')
      );
      expect(requestGraphqlWithUploads).toHaveBeenCalledWith(
        DocumentUpdateDocument,
        expect.objectContaining({
          documentId: DOCUMENT_ID,
          serviceInstanceId: SERVICE_INSTANCE_ID,
          existingImageIds: ['image-1'],
        }),
        { logo: newLogo, images: [newImage] }
      );
      expect(invalidateDocumentQueries).toHaveBeenCalledOnce();
      expect(revalidateDocumentSlugsAction).toHaveBeenCalledWith(
        SERVICE_INSTANCE_SLUG,
        DOCUMENT_SLUG
      );
    });

    it('should keep the existing logo by id when it is not replaced', async () => {
      // Given
      mocks.request.mockResolvedValue({ updateDocument: { id: DOCUMENT_ID } });
      const existingLogo = { id: 'logo-1', file_name: 'logo.png' };
      const context = renderContext();
      const onSuccess = vi.fn();

      // When
      await context.current.handleUpdateSheet(
        buildValues({ logo: [existingLogo] as unknown as FileList }),
        existingDocument,
        onSuccess,
        vi.fn()
      );

      // Then
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(requestGraphqlWithUploads).not.toHaveBeenCalled();
      expect(mocks.request).toHaveBeenCalledWith(
        expect.objectContaining({
          document: DocumentUpdateDocument,
          variables: expect.objectContaining({
            logo: null,
            existingImageIds: ['logo-1'],
          }),
        })
      );
    });
  });

  describe('handleDeleteSheet', () => {
    it('should delete the document, then refresh the lists without refetching its detail', async () => {
      // Given
      mocks.request.mockResolvedValue({ deleteDocument: { id: DOCUMENT_ID } });
      const context = renderContext();
      const onCompleted = vi.fn();

      // When
      await context.current.handleDeleteSheet(existingDocument, onCompleted);

      // Then
      await waitFor(() => expect(onCompleted).toHaveBeenCalled());
      expect(mocks.request).toHaveBeenCalledWith(
        expect.objectContaining({
          document: DocumentDeleteDocument,
          variables: {
            documentId: DOCUMENT_ID,
            serviceInstanceId: SERVICE_INSTANCE_ID,
            forceDelete: true,
          },
        })
      );
      expect(invalidateDocumentQueriesAfterDelete).toHaveBeenCalledOnce();
      expect(invalidateDocumentQueries).not.toHaveBeenCalled();
      expect(revalidateDocumentSlugsAction).toHaveBeenCalledWith(
        SERVICE_INSTANCE_SLUG,
        DOCUMENT_SLUG
      );
    });
  });
});
