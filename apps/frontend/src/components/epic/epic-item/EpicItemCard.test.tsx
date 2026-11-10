import { EpicItemCard } from '@/components/epic/epic-item/EpicItemCard';
import testRender from '@/utils/test/test-render';
import { EditionType, EpicType, FiligranProduct } from '@graphql/generated';
import { mockEpic } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('EpicItemCard', () => {
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

  it('renders card content and child components', () => {
    // Given
    // When
    testRender(
      <EpicItemCard
        epic={epic}
        userCanDelete={false}
        userCanUpdate={false}
      />
    );

    // Then
    expect(
      screen.getByRole('heading', { name: epic.title })
    ).toBeInTheDocument();
    expect(screen.getByText(epic.short_description)).toBeInTheDocument();
  });

  it('opens details by updating URL when clicking outside admin menu area', async () => {
    // Given
    const { user } = testRender(
      <EpicItemCard
        epic={epic}
        userCanDelete={false}
        userCanUpdate={false}
      />
    );

    // When
    await user.click(screen.getByText(epic.title));

    // Then
    expect(mockReplaceState).toHaveBeenCalledOnce();
    expect(mockReplaceState).toHaveBeenCalledWith(
      null,
      '',
      '/epics?epicId=epic-1'
    );
  });

  it('does not update URL when clicking in admin menu area', async () => {
    // Given
    const { user } = testRender(
      <EpicItemCard
        epic={epic}
        userCanDelete={true}
        userCanUpdate={true}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));

    // Then
    expect(mockReplaceState).not.toHaveBeenCalled();
  });
});
