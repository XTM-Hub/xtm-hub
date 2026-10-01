import { PrivateXtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestHubStatus,
  HasRepliedSatisfaction,
  PlatformTrialStatusQueryVariables,
} from '@graphql/generated';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  usePlatformTrialStatusQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables: PlatformTrialStatusQueryVariables) => [
      'PlatformTrialStatus',
      variables,
    ]),
    getRootKey: vi.fn(() => ['PlatformTrialStatus']),
  }),
  giveDeploymentFeedback: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    usePlatformTrialStatusQuery: graphqlMocks.usePlatformTrialStatusQuery,
    useGiveDeploymentFeedbackMutation: () => ({
      mutate: graphqlMocks.giveDeploymentFeedback,
    }),
  };
});

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

const FEEDBACK_QUESTION = 'Service.Trials.XtmPlatform.Feedback.Question';
const FEEDBACK_NO = 'Service.Trials.XtmPlatform.Feedback.No';
const FEEDBACK_YES = 'Service.Trials.XtmPlatform.Feedback.Yes';
const FEEDBACK_JUSTIFICATION =
  'Service.Trials.XtmPlatform.Feedback.Justification';
const FEEDBACK_SUBMIT = 'Service.Trials.XtmPlatform.Feedback.Submit';
const JUSTIFICATION_TEXT = 'Deployment took too long';

const mockActiveTrialWithDaysLeft = (daysLeft: number) => {
  graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
    data: {
      platformTrialStatus: {
        isBlacklisted: false,
        hub_status: DeploymentRequestHubStatus.Active,
        end_date: new Date(
          Date.now() + daysLeft * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    },
    isLoading: false,
    isPending: false,
  });
};

describe('PrivateXtmPlatformTrialBanner', () => {
  beforeEach(() => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReset();
    graphqlMocks.giveDeploymentFeedback.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('should render nothing while the query is loading', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
    });

    const { container } = testRender(<PrivateXtmPlatformTrialBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render the active banner and open the feedback dialog when there are 15 days left', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: {
        platformTrialStatus: {
          isBlacklisted: false,
          hub_status: DeploymentRequestHubStatus.Active,
          end_date: new Date(
            Date.now() + 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      },
      isLoading: false,
      isPending: false,
    });

    const { getByText, getByRole } = testRender(
      <PrivateXtmPlatformTrialBanner />
    );

    expect(
      getByText('Service.Trials.XtmPlatform.Active.Text')
    ).toBeInTheDocument();
    expect(
      getByRole('dialog', {
        name: FEEDBACK_QUESTION,
      })
    ).toBeInTheDocument();
  });

  it('should render nothing when the organization is blacklisted', () => {
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: {
        platformTrialStatus: {
          isBlacklisted: true,
          hub_status: DeploymentRequestHubStatus.Active,
          end_date: new Date(
            Date.now() + 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      },
      isLoading: false,
      isPending: false,
    });

    const { container } = testRender(<PrivateXtmPlatformTrialBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  describe('feedback dialog', () => {
    beforeEach(() => {
      mockActiveTrialWithDaysLeft(15);
    });

    it('should keep the submit button disabled when no answer is selected', () => {
      // Given
      const { getByRole } = testRender(<PrivateXtmPlatformTrialBanner />);

      // Then
      expect(getByRole('button', { name: FEEDBACK_SUBMIT })).toBeDisabled();
    });

    it('should not display the justification field when the answer is yes', async () => {
      // Given
      const { getByRole, queryByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />
      );

      // When
      await user.click(getByRole('radio', { name: FEEDBACK_YES }));

      // Then
      expect(
        queryByRole('textbox', { name: FEEDBACK_JUSTIFICATION })
      ).not.toBeInTheDocument();
    });

    it('should display the justification field when the answer is no', async () => {
      // Given
      const { getByRole, user } = testRender(<PrivateXtmPlatformTrialBanner />);

      // When
      await user.click(getByRole('radio', { name: FEEDBACK_NO }));

      // Then
      expect(
        getByRole('textbox', { name: FEEDBACK_JUSTIFICATION })
      ).toBeInTheDocument();
    });

    it('should send the answer and the justification when submitting a no answer', async () => {
      // Given
      const { getByRole, user } = testRender(<PrivateXtmPlatformTrialBanner />);
      await user.click(getByRole('radio', { name: FEEDBACK_NO }));
      await user.type(
        getByRole('textbox', { name: FEEDBACK_JUSTIFICATION }),
        JUSTIFICATION_TEXT
      );

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(graphqlMocks.giveDeploymentFeedback).toHaveBeenCalledWith({
        input: expect.objectContaining({
          answer: DeploymentFeedbackAnswer.No,
          justification: JUSTIFICATION_TEXT,
        }),
      });
    });

    it('should not send the justification when submitting a yes answer after typing one', async () => {
      // Given
      const { getByRole, user } = testRender(<PrivateXtmPlatformTrialBanner />);
      await user.click(getByRole('radio', { name: FEEDBACK_NO }));
      await user.type(
        getByRole('textbox', { name: FEEDBACK_JUSTIFICATION }),
        JUSTIFICATION_TEXT
      );
      await user.click(getByRole('radio', { name: FEEDBACK_YES }));

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(graphqlMocks.giveDeploymentFeedback).toHaveBeenCalledWith({
        input: expect.objectContaining({
          answer: DeploymentFeedbackAnswer.Yes,
          justification: null,
        }),
      });
    });

    it('should close the dialog when submitting the feedback', async () => {
      // Given
      const { getByRole, queryByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />
      );
      await user.click(getByRole('radio', { name: FEEDBACK_YES }));

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(
        queryByRole('dialog', { name: FEEDBACK_QUESTION })
      ).not.toBeInTheDocument();
    });
  });
});
