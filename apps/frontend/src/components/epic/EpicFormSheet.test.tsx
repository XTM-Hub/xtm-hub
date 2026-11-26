import { buildEpicListVariables } from '@/components/epic/epic-list-query';
import { EpicFormSheet } from '@/components/epic/EpicFormSheet';
import { createQueryClient } from '@/lib/query-client';
import testRender from '@/utils/test/test-render';
import {
  CreateEpicInput,
  EditionType,
  EpicCreateMutation,
  EpicsQuery,
  EpicType,
  EpicUpdateMutation,
  FiligranProduct,
  Timeline,
  UpdateEpicInput,
} from '@graphql/generated';
import { mockEpic } from '@graphql/mocks';
import { epicKeys } from '@graphql/xtm-platform-roadmap/epic.keys';
import { QueryClient } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

type MutationOptions<TData, TVariables> = {
  onSuccess: (data: TData, variables: TVariables) => Promise<void> | void;
  onError: (error: unknown) => void;
};

const mocks: {
  createMutate: Mock;
  updateMutate: Mock;
  setSelectedProducts: Mock;
  showSnackbar: Mock;
  isCreating: boolean;
  createOptions?: MutationOptions<
    EpicCreateMutation,
    { input: CreateEpicInput }
  >;
  updateOptions?: MutationOptions<
    EpicUpdateMutation,
    { id: string; input: UpdateEpicInput }
  >;
} = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  setSelectedProducts: vi.fn(),
  showSnackbar: vi.fn(),
  isCreating: false,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useEpicCreateMutation: (
    _client: unknown,
    options: typeof mocks.createOptions
  ) => {
    mocks.createOptions = options;
    return { mutate: mocks.createMutate, isPending: mocks.isCreating };
  },
  useEpicUpdateMutation: (
    _client: unknown,
    options: typeof mocks.updateOptions
  ) => {
    mocks.updateOptions = options;
    return { mutate: mocks.updateMutate, isPending: false };
  },
}));

vi.mock('@/hooks/use-epic-filter', () => ({
  useEpicFilter: () => ({ setSelectedProducts: mocks.setSelectedProducts }),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

const ROADMAP_EPIC = mockEpic({
  id: 'epic-1',
  title: 'Roadmap epic',
  short_description: 'short description',
  description: 'description',
  problem_to_solve: 'problem to solve',
  proposed_solution: 'proposed solution',
  expected_value: 'expected value',
  products: [FiligranProduct.Opencti],
  timeline: Timeline.Now,
  edition_type: EditionType.CommunityEdition,
  epic_type: EpicType.Other,
  slack_link: null,
  active: true,
});
const OTHER_EPIC = mockEpic({ id: 'epic-2', title: 'Other epic' });
const CREATED_EPIC = mockEpic({
  id: 'epic-3',
  title: 'Created epic',
  products: [FiligranProduct.Openaev],
});
const UPDATED_TITLE = 'Roadmap epic updated';
const EPIC_CREATE_ERROR = 'EPIC_CREATE_ERROR';
const EPIC_UPDATE_ERROR = 'EPIC_UPDATE_ERROR';
const UNKNOWN_ERROR = 'UNKNOWN_ERROR';
const CREATE_BUTTON = 'Epic.EpicActions.CreateEpicButton';
const UPDATE_BUTTON = 'Epic.EpicActions.UpdateEpicButton';

// What the creation form sends once its required fields are filled: every
// other field keeps the form's default.
const NEW_EPIC_INPUT: CreateEpicInput = {
  title: 'New epic',
  short_description: 'new short description',
  description: '',
  problem_to_solve: 'new problem to solve',
  proposed_solution: 'new proposed solution',
  expected_value: 'new expected value',
  edition_type: EditionType.CommunityEdition,
  products: [FiligranProduct.Opencti],
  timeline: Timeline.Now,
  slack_link: '',
  active: false,
  is_integration: false,
};

const EPIC_INPUT: CreateEpicInput = {
  title: ROADMAP_EPIC.title,
  short_description: ROADMAP_EPIC.short_description,
  description: ROADMAP_EPIC.description,
  problem_to_solve: ROADMAP_EPIC.problem_to_solve,
  proposed_solution: ROADMAP_EPIC.proposed_solution,
  expected_value: ROADMAP_EPIC.expected_value,
  edition_type: EditionType.CommunityEdition,
  products: [FiligranProduct.Opencti],
  timeline: Timeline.Now,
  slack_link: '',
  active: true,
  is_integration: false,
};

const ALL_EPICS_VARIABLES = buildEpicListVariables();
const SEARCHED_EPICS_VARIABLES = buildEpicListVariables('roadmap');

const buildEpicsQuery = (epics: (typeof ROADMAP_EPIC)[]): EpicsQuery => ({
  epics: {
    totalCount: epics.length,
    edges: epics.map((epic) => ({ node: epic })),
  },
});

const renderWithCachedLists = (epic?: typeof ROADMAP_EPIC) => {
  const setOpen = vi.fn();
  const queryClient = createQueryClient();
  queryClient.setQueryData(
    epicKeys.list(ALL_EPICS_VARIABLES),
    buildEpicsQuery([ROADMAP_EPIC, OTHER_EPIC])
  );
  queryClient.setQueryData(
    epicKeys.list(SEARCHED_EPICS_VARIABLES),
    buildEpicsQuery([ROADMAP_EPIC])
  );
  const rendered = testRender(
    <EpicFormSheet
      epic={epic}
      open
      setOpen={setOpen}
    />,
    { queryClient }
  );
  return { ...rendered, queryClient, setOpen };
};

const succeedCreation = () =>
  act(async () => {
    await mocks.createOptions?.onSuccess(
      { createEpic: CREATED_EPIC },
      { input: { ...EPIC_INPUT, products: CREATED_EPIC.products } }
    );
  });

const succeedUpdate = (updatedEpic: typeof ROADMAP_EPIC) =>
  act(async () => {
    await mocks.updateOptions?.onSuccess(
      { updateEpic: updatedEpic },
      { id: updatedEpic.id, input: EPIC_INPUT }
    );
  });

const fillRequiredFields = async (
  user: ReturnType<typeof testRender>['user']
) => {
  const fields: [string, string][] = [
    ['Epic.Form.Title', NEW_EPIC_INPUT.title],
    ['Epic.Form.ShortDesc', NEW_EPIC_INPUT.short_description],
    ['Epic.Form.ProblemToSolve', NEW_EPIC_INPUT.problem_to_solve],
    ['Epic.Form.ProposedSolution', NEW_EPIC_INPUT.proposed_solution],
    ['Epic.Form.ExpectedValue', NEW_EPIC_INPUT.expected_value],
  ];
  for (const [label, value] of fields) {
    await user.type(screen.getByRole('textbox', { name: label }), value);
  }
};

const listsInvalidation = (queryClient: QueryClient) =>
  [ALL_EPICS_VARIABLES, SEARCHED_EPICS_VARIABLES].map(
    (variables) =>
      queryClient.getQueryState(epicKeys.list(variables))?.isInvalidated
  );

describe('EpicFormSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCreating = false;
  });

  it('should send the epic id with the form values when an update is submitted', async () => {
    // Given
    const { user } = renderWithCachedLists(ROADMAP_EPIC);

    // When
    await user.click(screen.getByRole('button', { name: UPDATE_BUTTON }));

    // Then
    expect(mocks.updateMutate).toHaveBeenCalledExactlyOnceWith({
      id: ROADMAP_EPIC.id,
      input: EPIC_INPUT,
    });
  });

  it('should send the filled form values when a creation is submitted', async () => {
    // Given
    const { user } = renderWithCachedLists();
    await fillRequiredFields(user);

    // When
    await user.click(screen.getByRole('button', { name: CREATE_BUTTON }));

    // Then
    expect(mocks.createMutate).toHaveBeenCalledExactlyOnceWith({
      input: NEW_EPIC_INPUT,
    });
  });

  it('should block the submit button while the epic is being saved', () => {
    // Given
    mocks.isCreating = true;

    // When
    renderWithCachedLists();

    // Then
    // While loading, the button's name also carries the spinner's status text.
    expect(
      screen.getByRole('button', { name: new RegExp(`^${CREATE_BUTTON}`) })
    ).toBeDisabled();
  });

  it('should close the sheet when the creation succeeds', async () => {
    // Given
    const { setOpen } = renderWithCachedLists();

    // When
    await succeedCreation();

    // Then
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should filter the roadmap on the products of the created epic when the creation succeeds', async () => {
    // Given
    renderWithCachedLists();

    // When
    await succeedCreation();

    // Then
    expect(mocks.setSelectedProducts).toHaveBeenCalledExactlyOnceWith(
      CREATED_EPIC.products
    );
  });

  it('should show the success toast when the creation succeeds', async () => {
    // Given
    renderWithCachedLists();

    // When
    await succeedCreation();

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith({
      severity: 'success',
      title: 'Utils.Success',
      description: 'Utils.Success',
    });
  });

  it('should invalidate every cached epic list when the creation succeeds', async () => {
    // Given
    const { queryClient } = renderWithCachedLists();

    // When
    await succeedCreation();

    // Then
    expect(listsInvalidation(queryClient)).toEqual([true, true]);
  });

  it('should replace the epic in every cached list when the update succeeds', async () => {
    // Given
    const updatedEpic = { ...ROADMAP_EPIC, title: UPDATED_TITLE };
    const { queryClient } = renderWithCachedLists(ROADMAP_EPIC);

    // When
    await succeedUpdate(updatedEpic);

    // Then
    expect(
      [ALL_EPICS_VARIABLES, SEARCHED_EPICS_VARIABLES].map((variables) =>
        queryClient.getQueryData(epicKeys.list(variables))
      )
    ).toEqual([
      buildEpicsQuery([updatedEpic, OTHER_EPIC]),
      buildEpicsQuery([updatedEpic]),
    ]);
  });

  it('should close the sheet when the update succeeds', async () => {
    // Given
    const { setOpen } = renderWithCachedLists(ROADMAP_EPIC);

    // When
    await succeedUpdate(ROADMAP_EPIC);

    // Then
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should invalidate every cached epic list when the update succeeds', async () => {
    // Given
    const { queryClient } = renderWithCachedLists(ROADMAP_EPIC);

    // When
    await succeedUpdate(ROADMAP_EPIC);

    // Then
    expect(listsInvalidation(queryClient)).toEqual([true, true]);
  });

  it.each([
    {
      error: new Error(EPIC_CREATE_ERROR),
      expectedKey: EPIC_CREATE_ERROR,
      description: 'the server rejects it',
    },
    {
      error: EPIC_CREATE_ERROR,
      expectedKey: UNKNOWN_ERROR,
      description: 'the failure is not an Error',
    },
  ])(
    'should show the $expectedKey error when the creation fails because $description',
    ({ error, expectedKey }) => {
      // Given
      renderWithCachedLists();

      // When
      act(() => {
        mocks.createOptions?.onError(error);
      });

      // Then
      expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'error',
        title: 'Utils.Error',
        description: `Error.Server.${expectedKey}`,
      });
    }
  );

  it('should keep the sheet open when the creation fails', () => {
    // Given
    const { setOpen } = renderWithCachedLists();

    // When
    act(() => {
      mocks.createOptions?.onError(new Error(EPIC_CREATE_ERROR));
    });

    // Then
    expect(setOpen).not.toHaveBeenCalled();
  });

  it('should show the server error when the update fails', () => {
    // Given
    renderWithCachedLists(ROADMAP_EPIC);

    // When
    act(() => {
      mocks.updateOptions?.onError(new Error(EPIC_UPDATE_ERROR));
    });

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith({
      severity: 'error',
      title: 'Utils.Error',
      description: `Error.Server.${EPIC_UPDATE_ERROR}`,
    });
  });
});
