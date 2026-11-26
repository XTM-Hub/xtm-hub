import { EpicAdminMenu } from '@/components/epic/epic-item/EpicAdminMenu';
import testRender from '@/utils/test/test-render';
import { mockEpic } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useEpicFilterMock = vi.fn();

vi.mock('@/hooks/use-epic-filter', () => ({
  useEpicFilter: () => useEpicFilterMock(),
}));
vi.mock('@/components/epic/EpicForm', async () => {
  const actual = await vi.importActual('@/components/epic/EpicForm');
  return {
    ...actual,
    default: () => {
      return <button>Mock Form</button>;
    },
  };
});
describe('EpicAdminMenu', () => {
  const epic = mockEpic({
    id: 'epic-1',
    title: 'Roadmap epic',
    active: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useEpicFilterMock.mockReturnValue({
      setSelectedProducts: vi.fn(),
    });
  });

  it.each`
    userCanDelete | userCanUpdate | shouldRender
    ${false}      | ${false}      | ${false}
    ${true}       | ${false}      | ${true}
    ${false}      | ${true}       | ${true}
    ${true}       | ${true}       | ${true}
  `(
    'renders menu trigger according to permissions (delete=$userCanDelete, update=$userCanUpdate)',
    ({ userCanDelete, userCanUpdate, shouldRender }) => {
      // Given
      const { queryByRole } = testRender(
        <EpicAdminMenu
          epic={epic}
          userCanDelete={userCanDelete}
          userCanUpdate={userCanUpdate}
        />
      );

      // When
      const menuButton = queryByRole('button', { name: 'Utils.OpenMenu' });

      if (shouldRender) {
        expect(menuButton).toBeInTheDocument();
        return;
      }

      expect(menuButton).toBeNull();
    }
  );

  it('renders draft badge when epic is inactive', () => {
    // Given
    testRender(
      <EpicAdminMenu
        epic={{ ...epic, active: false }}
        userCanDelete={false}
        userCanUpdate={false}
      />
    );

    // Then
    expect(screen.getByText('Epic.Timeline.draft')).toBeInTheDocument();
  });

  it('opens update sheet when clicking on update action', async () => {
    // Given
    const { user } = testRender(
      <EpicAdminMenu
        epic={epic}
        userCanDelete={false}
        userCanUpdate={true}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Utils.Update' })
    );

    // Then
    expect(screen.getByText('Epic.EpicActions.UpdateEpic')).toBeInTheDocument();
  });

  it('opens delete dialog when clicking on delete action', async () => {
    const { user } = testRender(
      <EpicAdminMenu
        epic={epic}
        userCanDelete={true}
        userCanUpdate={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Utils.Delete' })
    );

    expect(
      screen.getByText('Epic.EpicActions.SureDeleteEpic')
    ).toBeInTheDocument();
  });
});
