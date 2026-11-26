import { PrivateXtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestHubStatus,
  GiveDeploymentFeedbackMutation,
  GiveDeploymentFeedbackMutationVariables,
  HasRepliedSatisfaction,
  PlatformTrialStatusQueryVariables,
} from '@graphql/generated';
import { UseMutationOptions } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type GiveDeploymentFeedbackOptions = UseMutationOptions<
  GiveDeploymentFeedbackMutation,
  unknown,
  GiveDeploymentFeedbackMutationVariables,
  unknown
>;

const graphqlMocks = vi.hoisted(() => ({
  usePlatformTrialStatusQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables: PlatformTrialStatusQueryVariables) => [
      'PlatformTrialStatus',
      variables,
    ]),
    getRootKey: vi.fn(() => ['PlatformTrialStatus']),
  }),
  giveDeploymentFeedback: vi.fn(),
  useGiveDeploymentFeedbackMutation: vi.fn(),
}));

const showSnackbarMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    usePlatformTrialStatusQuery: graphqlMocks.usePlatformTrialStatusQuery,
    useGiveDeploymentFeedbackMutation:
      graphqlMocks.useGiveDeploymentFeedbackMutation,
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
const FEEDBACK_CLOSE = 'Close';
const JUSTIFICATION_TEXT = 'Deployment took too long';
const USER_WITHOUT_FEEDBACK = { has_replied_satisfaction: null };
const USER_WITH_FEEDBACK = {
  has_replied_satisfaction: HasRepliedSatisfaction.Yes,
};
const DEPLOYMENT_REQUEST_ID = 'deployment-request-id';

const mockActiveTrialWithDaysLeft = (
  daysLeft: number,
  deploymentRequestId: string | null = DEPLOYMENT_REQUEST_ID
) => {
  graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
    data: {
      platformTrialStatus: {
        deploymentRequestId,
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
    graphqlMocks.useGiveDeploymentFeedbackMutation.mockReturnValue({
      mutate: graphqlMocks.giveDeploymentFeedback,
    });
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
      <PrivateXtmPlatformTrialBanner />,
      {
        me: USER_WITHOUT_FEEDBACK,
      }
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

  it('should render the ending banner in warning with the days left when 7 days or less are left', () => {
    // Given
    mockActiveTrialWithDaysLeft(5);

    // When
    const { getByText } = testRender(<PrivateXtmPlatformTrialBanner />, {
      me: USER_WITH_FEEDBACK,
    });

    // Then
    expect(
      getByText('Service.Trials.XtmPlatform.Ending.Text').closest(
        '[data-variant]'
      )
    ).toHaveAttribute('data-variant', 'warning');
    expect(
      getByText('Service.Trials.XtmPlatform.DaysLeft')
    ).toBeInTheDocument();
  });

  it('should render the no-trial banner with a learn more link to the trial page when the organization has no trial', () => {
    // Given
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: {
        platformTrialStatus: {
          isBlacklisted: false,
          hub_status: null,
          end_date: null,
        },
      },
      isLoading: false,
      isPending: false,
    });

    // When
    const { getByText, getByRole } = testRender(
      <PrivateXtmPlatformTrialBanner />
    );

    // Then
    expect(
      getByText('Service.Trials.XtmPlatform.NoTrial.Text').closest(
        '[data-variant]'
      )
    ).toHaveAttribute('data-variant', 'default');
    expect(
      getByRole('link', { name: 'Service.Trials.LearnMore.Link' })
    ).toHaveAttribute(
      'href',
      'http://localhost:3002/app/service/xtm-platform-trial'
    );
  });

  it.each([
    DeploymentRequestHubStatus.Expired,
    DeploymentRequestHubStatus.Cancelled,
  ])('should render nothing when the trial is %s', (hubStatus) => {
    // Given
    graphqlMocks.usePlatformTrialStatusQuery.mockReturnValue({
      data: {
        platformTrialStatus: {
          isBlacklisted: false,
          hub_status: hubStatus,
          end_date: new Date(
            Date.now() + 20 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      },
      isLoading: false,
      isPending: false,
    });

    // When
    const { container } = testRender(<PrivateXtmPlatformTrialBanner />);

    // Then
    expect(container).toBeEmptyDOMElement();
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
      const { getByRole } = testRender(<PrivateXtmPlatformTrialBanner />, {
        me: USER_WITHOUT_FEEDBACK,
      });

      // Then
      expect(getByRole('button', { name: FEEDBACK_SUBMIT })).toBeDisabled();
    });

    it('should not display the justification field when the answer is yes', async () => {
      // Given
      const { getByRole, queryByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
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
      const { getByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );

      // When
      await user.click(getByRole('radio', { name: FEEDBACK_NO }));

      // Then
      expect(
        getByRole('textbox', { name: FEEDBACK_JUSTIFICATION })
      ).toBeInTheDocument();
    });

    it('should send the answer and the justification when submitting a no answer', async () => {
      // Given
      const { getByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );
      await user.click(getByRole('radio', { name: FEEDBACK_NO }));
      await user.type(
        getByRole('textbox', { name: FEEDBACK_JUSTIFICATION }),
        JUSTIFICATION_TEXT
      );

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(graphqlMocks.giveDeploymentFeedback).toHaveBeenCalledWith({
        input: {
          deploymentRequestId: DEPLOYMENT_REQUEST_ID,
          answer: HasRepliedSatisfaction.No,
          justification: JUSTIFICATION_TEXT,
        },
      });
    });

    it('should not send the justification when submitting a yes answer after typing one', async () => {
      // Given
      const { getByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );
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
        input: {
          deploymentRequestId: DEPLOYMENT_REQUEST_ID,
          answer: HasRepliedSatisfaction.Yes,
          justification: null,
        },
      });
    });

    it('should close the dialog when submitting the feedback', async () => {
      // Given
      const { getByRole, queryByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );
      await user.click(getByRole('radio', { name: FEEDBACK_YES }));

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(
        queryByRole('dialog', { name: FEEDBACK_QUESTION })
      ).not.toBeInTheDocument();
    });

    it('should send a closed answer when closing the dialog without answering', async () => {
      // Given
      const { getByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );

      // When
      await user.click(getByRole('button', { name: FEEDBACK_CLOSE }));

      // Then
      expect(graphqlMocks.giveDeploymentFeedback).toHaveBeenCalledWith({
        input: {
          deploymentRequestId: DEPLOYMENT_REQUEST_ID,
          answer: HasRepliedSatisfaction.Closed,
          justification: null,
        },
      });
    });

    it('should not send a closed answer when submitting the feedback', async () => {
      // Given
      const { getByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );
      await user.click(getByRole('radio', { name: FEEDBACK_YES }));

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(graphqlMocks.giveDeploymentFeedback).toHaveBeenCalledOnce();
    });

    it('should show an error toast when the feedback cannot be sent', async () => {
      // Given
      graphqlMocks.useGiveDeploymentFeedbackMutation.mockImplementation(
        (_client: unknown, options?: GiveDeploymentFeedbackOptions) => ({
          mutate: (variables: GiveDeploymentFeedbackMutationVariables) =>
            options?.onError?.(
              new Error('UNKNOWN_ERROR'),
              variables,
              undefined
            ),
        })
      );
      const { getByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );
      await user.click(getByRole('radio', { name: FEEDBACK_YES }));

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
      });
    });

    it('should not send the feedback when the trial has no deployment request', async () => {
      // Given
      mockActiveTrialWithDaysLeft(15, null);
      const { getByRole, user } = testRender(
        <PrivateXtmPlatformTrialBanner />,
        {
          me: USER_WITHOUT_FEEDBACK,
        }
      );
      await user.click(getByRole('radio', { name: FEEDBACK_YES }));

      // When
      await user.click(getByRole('button', { name: FEEDBACK_SUBMIT }));

      // Then
      expect(graphqlMocks.giveDeploymentFeedback).not.toHaveBeenCalled();
    });

    it.each([
      HasRepliedSatisfaction.Yes,
      HasRepliedSatisfaction.No,
      HasRepliedSatisfaction.Closed,
    ])(
      'should not open the feedback dialog when the user already replied %s',
      (hasRepliedSatisfaction) => {
        // Given
        const { queryByRole } = testRender(<PrivateXtmPlatformTrialBanner />, {
          me: { has_replied_satisfaction: hasRepliedSatisfaction },
        });

        // Then
        expect(
          queryByRole('dialog', { name: FEEDBACK_QUESTION })
        ).not.toBeInTheDocument();
      }
    );
  });
});
