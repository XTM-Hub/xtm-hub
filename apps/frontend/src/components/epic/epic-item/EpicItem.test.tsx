import { EpicItem } from '@/components/epic/epic-item/EpicItem';
import testRender from '@/utils/test/test-render';
import { EditionType, EpicType, FiligranProduct } from '@graphql/generated';
import { mockEpic } from '@graphql/mocks';
import { screen, within } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('EpicItem', () => {
  const epic = mockEpic({
    id: 'epic-1',
    title: 'Roadmap epic',
    epic_type: EpicType.Other,
    products: [FiligranProduct.Opencti],
    edition_type: EditionType.CommunityEdition,
    short_description: 'short description',
    description: 'long description',
    problem_to_solve: 'problem to solve',
    proposed_solution: 'proposed solution',
    expected_value: 'expected value',
  });

  const defaultProps = {
    epic,
    userCanDelete: false,
    userCanUpdate: false,
  };

  const mockReplaceState = vi.spyOn(window.history, 'replaceState');

  beforeEach(() => {
    vi.clearAllMocks();
    mockReplaceState.mockImplementation(() => {});

    vi.mocked(usePathname).mockReturnValue('/epics');

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });

    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    } as unknown as ReturnType<typeof useSearchParams>);
  });

  it('renders card and passes expected props', () => {
    // Given
    // When
    const { queryByText } = testRender(<EpicItem {...defaultProps} />);

    // Then
    expect(queryByText(epic.title)).toBeInTheDocument();
    expect(queryByText(epic.short_description)).toBeInTheDocument();
    expect(queryByText(epic.description)).not.toBeInTheDocument();
  });

  it('opens detail dialog when card asks to open it', async () => {
    // Given
    const { user } = testRender(<EpicItem {...defaultProps} />);

    // When
    const card = screen.getByRole('listitem');
    await user.click(within(card).getByText(epic.title));

    // Then
    expect(mockReplaceState).toHaveBeenCalledOnce();
    expect(mockReplaceState).toHaveBeenCalledWith(
      null,
      '',
      '/epics?epicId=epic-1'
    );
  });

  it('closes detail dialog when dialog emits close event', async () => {
    // Given
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('epic-1'),
      toString: vi.fn().mockReturnValue('epicId=epic-1'),
    } as unknown as ReturnType<typeof useSearchParams>);

    const { user } = testRender(<EpicItem {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(epic.description)).toBeInTheDocument();

    // When
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Then
    expect(mockReplaceState).toHaveBeenCalledOnce();
    expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/epics');
  });
});
