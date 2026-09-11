import { EpicItemCard } from '@/components/epic/epic-item/EpicItemCard';
import testRender from '@/utils/test/test-render';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { EditionType, EpicType, FiligranProduct } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createMockEnvironment } from 'relay-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useEpicListContextMock = vi.fn();

vi.mock('@/hooks/use-epic-list-context', () => ({
  useEpicListContext: () => useEpicListContextMock(),
}));

describe('EpicItemCard', () => {
  const epic = {
    id: 'epic-1',
    title: 'Roadmap epic',
    epic_type: EpicType.Other,
    product: [FiligranProduct.Opencti],
    edition_type: EditionType.CommunityEdition,
    short_description: 'short description',
    description: 'long description',
  } as epic_fragment$data;

  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useEpicListContextMock.mockReturnValue({
      connectionID: 'connection-id-1',
      filterByProduct: vi.fn(),
    });

    vi.mocked(usePathname).mockReturnValue('/epics');

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: mockReplace,
      prefetch: vi.fn(),
    });

    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    } as unknown as ReturnType<typeof useSearchParams>);
  });

  it('renders card content and child components', () => {
    // Given
    const environment = createMockEnvironment();

    // When
    testRender(
      <EpicItemCard
        epic={epic}
        serviceInstanceId={'service-instance-1'}
        userCanDelete={false}
        userCanUpdate={false}
      />,
      { relayConfig: environment }
    );

    // Then
    expect(
      screen.getByRole('heading', { name: epic.title })
    ).toBeInTheDocument();
    expect(screen.getByText(epic.short_description)).toBeInTheDocument();
  });

  it('opens details by updating URL when clicking outside admin menu area', async () => {
    // Given
    const environment = createMockEnvironment();

    const { user } = testRender(
      <EpicItemCard
        epic={epic}
        serviceInstanceId={'service-instance-1'}
        userCanDelete={false}
        userCanUpdate={false}
      />,
      { relayConfig: environment }
    );

    // When
    await user.click(screen.getByText(epic.title));

    // Then
    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/epics?epicId=epic-1', {
      scroll: false,
    });
  });

  it('does not update URL when clicking in admin menu area', async () => {
    // Given
    const environment = createMockEnvironment();

    const { user } = testRender(
      <EpicItemCard
        epic={epic}
        serviceInstanceId={'service-instance-1'}
        userCanDelete={true}
        userCanUpdate={true}
      />,
      { relayConfig: environment }
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));

    // Then
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
