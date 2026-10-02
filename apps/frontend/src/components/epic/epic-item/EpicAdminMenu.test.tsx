import { EpicAdminMenu } from '@/components/epic/epic-item/EpicAdminMenu';
import testRender from '@/utils/test/test-render';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { screen } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useEpicListContextMock = vi.fn();
const useEpicFilterMock = vi.fn();

vi.mock('@/hooks/use-epic-filter', () => ({
  useEpicFilter: () => useEpicFilterMock(),
}));
vi.mock('@/hooks/use-epic-list-context', () => ({
  useEpicListContext: () => useEpicListContextMock(),
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
  const epic = {
    id: 'epic-1',
    title: 'Roadmap epic',
    active: true,
  } as epic_fragment$data;

  beforeEach(() => {
    vi.clearAllMocks();
    useEpicListContextMock.mockReturnValue({
      connectionID: 'connection-id-1',
      filterByProduct: vi.fn(),
    });
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
      const environment = createMockEnvironment();
      const { queryByRole } = testRender(
        <EpicAdminMenu
          epic={epic}
          userCanDelete={userCanDelete}
          userCanUpdate={userCanUpdate}
        />,
        { relayConfig: environment }
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
    const environment = createMockEnvironment();

    testRender(
      <EpicAdminMenu
        epic={{ ...epic, active: false }}
        userCanDelete={false}
        userCanUpdate={false}
      />,
      { relayConfig: environment }
    );

    // Then
    expect(screen.getByText('Epic.Timeline.draft')).toBeInTheDocument();
  });

  it('opens update sheet when clicking on update action', async () => {
    // Given
    const environment = createMockEnvironment();

    const { user } = testRender(
      <EpicAdminMenu
        epic={epic}
        userCanDelete={false}
        userCanUpdate={true}
      />,
      { relayConfig: environment }
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
