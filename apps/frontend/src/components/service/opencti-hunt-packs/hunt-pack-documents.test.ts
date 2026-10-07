import { ServiceContextProps } from '@/components/service/components/ServiceContext';
import { ServiceFormValues } from '@/components/service/components/subscribable-services.types';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import {
  toDocumentItem,
  useHuntPackDocumentContext,
} from '@/components/service/opencti-hunt-packs/hunt-pack-documents';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { testRenderHook } from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { HuntPackDocumentItemFragment } from '@graphql/generated';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/service/document/use-document-context', () => ({
  useDocumentContext: vi.fn(),
}));

const serviceInstance = {
  id: 'service-1',
} as unknown as serviceInstance_fragment$data;
const huntPack = { id: 'pack-1' } as documentItem_fragment$data;

describe('useHuntPackDocumentContext', () => {
  const sharedContext = {
    handleAddSheet: vi.fn(
      async (
        _values: ServiceFormValues,
        onSuccess: (serviceName: string) => void
      ) => onSuccess('Credential access')
    ),
    handleUpdateSheet: vi.fn(
      async (
        _values: ServiceFormValues,
        _resource: documentItem_fragment$data,
        onSuccess: (serviceName: string) => void
      ) => onSuccess('Credential access')
    ),
    handleDeleteSheet: vi.fn(
      async (_document: documentItem_fragment$data, onCompleted: () => void) =>
        onCompleted()
    ),
  };
  let invalidateQueries: ReturnType<typeof vi.spyOn>;
  const invalidatedKeys = () =>
    invalidateQueries.mock.calls.map(
      ([filters]) => (filters as { queryKey: string[] }).queryKey
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDocumentContext).mockReturnValue(
      sharedContext as unknown as ServiceContextProps
    );
    invalidateQueries = vi
      .spyOn(QueryClient.prototype, 'invalidateQueries')
      .mockResolvedValue();
  });

  const renderContext = () =>
    testRenderHook(() => useHuntPackDocumentContext(serviceInstance)).result
      .current;

  it('uses the shared document context of the hunt packs library', () => {
    renderContext();

    expect(useDocumentContext).toHaveBeenCalledWith({
      serviceInstance,
      type: ShareableResourceType.OPENCTI_HUNT_PACK,
    });
  });

  it.each`
    action
    ${'create'}
    ${'update'}
  `(
    'refreshes the hunt pack queries and the facet counts after a $action',
    async ({ action }: { action: string }) => {
      const onSuccess = vi.fn();
      const context = renderContext();

      if (action === 'create') {
        await context.handleAddSheet(
          {} as ServiceFormValues,
          onSuccess,
          vi.fn()
        );
      } else {
        await context.handleUpdateSheet(
          {} as ServiceFormValues,
          huntPack,
          onSuccess,
          vi.fn()
        );
      }

      expect(onSuccess).toHaveBeenCalledWith('Credential access');
      expect(invalidatedKeys()).toEqual([
        ['HuntPackDocuments'],
        ['HuntPackDocument'],
        ['DocumentFacets'],
      ]);
    }
  );

  it('refreshes the lists and the facet counts after a deletion, not the deleted pack', async () => {
    const onCompleted = vi.fn();
    const context = renderContext();

    await context.handleDeleteSheet(huntPack, onCompleted);

    expect(onCompleted).toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual([
      ['HuntPackDocuments'],
      ['DocumentFacets'],
    ]);
  });
});

describe('toDocumentItem', () => {
  it('keeps every field read by React Query', () => {
    const document = {
      __typename: 'OpenCTIHuntPack',
      id: 'pack-1',
      name: 'Credential access',
      hunt_count: 6,
    } as unknown as HuntPackDocumentItemFragment;

    expect(toDocumentItem(document)).toEqual(document);
  });
});
