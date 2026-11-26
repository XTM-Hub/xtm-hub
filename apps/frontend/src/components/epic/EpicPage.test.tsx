import { buildEpicListVariables } from '@/components/epic/epic-list-query';
import { EpicPage } from '@/components/epic/EpicPage';
import testRender from '@/utils/test/test-render';
import {
  CurrentVotingRoundCalloutQuery,
  EpicsQuery,
  Timeline,
} from '@graphql/generated';
import { mockEpic, mockSeoServiceInstance } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useEpicsQuery: vi.fn(),
  useCurrentVotingRoundCalloutQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useEpicsQuery: mocks.useEpicsQuery,
    useCurrentVotingRoundCalloutQuery: mocks.useCurrentVotingRoundCalloutQuery,
  });
});

const NO_VOTING_ROUND: CurrentVotingRoundCalloutQuery = {
  currentVotingRound: null,
};
const SEARCH_TERM = 'road';
const ROADMAP_HEADING = 'Epic.XTMRoadmap';
const LOADING_LABEL = 'Utils.Loading';
const NOW_EPIC = mockEpic({
  id: 'epic-1',
  title: 'Now epic',
  timeline: Timeline.Now,
  active: true,
});

const serviceInstance = mockSeoServiceInstance({ id: 'service-instance-1' });

const EPICS: EpicsQuery = {
  epics: { totalCount: 1, edges: [{ node: NOW_EPIC }] },
};

const lastEpicsQueryCall = () => mocks.useEpicsQuery.mock.lastCall;

describe('EpicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useEpicsQuery.mockReturnValue({ data: EPICS });
    mocks.useCurrentVotingRoundCalloutQuery.mockReturnValue({
      data: NO_VOTING_ROUND,
      isLoading: false,
    });
  });

  it('should render the epics once they are loaded', () => {
    // When
    testRender(<EpicPage serviceInstance={serviceInstance} />);

    // Then
    expect(screen.getByText(NOW_EPIC.title)).toBeInTheDocument();
  });

  it('should not render the roadmap while the epics are loading', () => {
    // Given
    mocks.useEpicsQuery.mockReturnValue({ data: undefined });

    // When
    testRender(<EpicPage serviceInstance={serviceInstance} />);

    // Then
    expect(
      screen.queryByRole('heading', { name: ROADMAP_HEADING })
    ).not.toBeInTheDocument();
  });

  it('should announce a loading status while the epics are loading', () => {
    // Given
    mocks.useEpicsQuery.mockReturnValue({ data: undefined });

    // When
    testRender(<EpicPage serviceInstance={serviceInstance} />);

    // Then
    expect(
      screen.getByRole('status', { name: LOADING_LABEL })
    ).toBeInTheDocument();
  });

  it('should load the epics matching the search when user types a search', async () => {
    // Given
    const { user } = testRender(<EpicPage serviceInstance={serviceInstance} />);

    // When
    await user.type(
      screen.getByPlaceholderText('GenericActions.Search'),
      SEARCH_TERM
    );

    // Then
    await waitFor(() =>
      expect(lastEpicsQueryCall()?.[1]).toEqual(
        buildEpicListVariables(SEARCH_TERM)
      )
    );
  });
});
