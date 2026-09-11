import { EpicItem } from '@/components/epic/epic-item/EpicItem';
import testRender from '@/utils/test/test-render';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { EditionType, EpicType, FiligranProduct } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createMockEnvironment } from 'relay-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useEpicListContextMock = vi.fn();

vi.mock('@/hooks/use-epic-list-context', () => ({
  useEpicListContext: () => useEpicListContextMock(),
}));

describe('EpicItem', () => {
  const epic = {
    id: 'epic-1',
    title: 'Roadmap epic',
    epic_type: EpicType.Other,
    product: [FiligranProduct.Opencti],
    edition_type: EditionType.CommunityEdition,
    short_description: 'short description',
    description: 'long description',
  } as epic_fragment$data;

  const defaultProps = {
    epic,
    serviceInstanceId: 'service-instance-1',
    userCanDelete: false,
    userCanUpdate: false,
  };

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

  it('renders card and passes expected props', () => {
    // Given
    const environment = createMockEnvironment();

    // When
    const { queryByText } = testRender(<EpicItem {...defaultProps} />, {
      relayConfig: environment,
    });

    // Then
    expect(queryByText(epic.title)).toBeInTheDocument();
    expect(queryByText(epic.short_description)).toBeInTheDocument();
    expect(queryByText(epic.description)).not.toBeInTheDocument();
  });

  it('opens detail dialog when card asks to open it', async () => {
    // Given
    const environment = createMockEnvironment();
    const { user } = testRender(<EpicItem {...defaultProps} />, {
      relayConfig: environment,
    });

    // When
    const card = screen.getByRole('listitem');
    await user.click(within(card).getByText(epic.title));

    // Then
    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/epics?epicId=epic-1', {
      scroll: false,
    });
  });

  it('closes detail dialog when dialog emits close event', async () => {
    // Given
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('epic-1'),
      toString: vi.fn().mockReturnValue('epicId=epic-1'),
    } as unknown as ReturnType<typeof useSearchParams>);

    const environment = createMockEnvironment();
    const { user } = testRender(<EpicItem {...defaultProps} />, {
      relayConfig: environment,
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(epic.description)).toBeInTheDocument();

    // When
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Then
    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('/epics', { scroll: false });
  });
});
