import { XtmPlatformTrialStatusPanel } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialStatusPanel';
import { XtmPlatformTrialStatusPanelState } from '@/components/service/trial-instances/xtm-platform-trial/xtm-platform-trial-panel.utils';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('XtmPlatformTrialStatusPanel', () => {
  it('renders the associated email, products, message, requested-on date and stepper for the in-progress state', () => {
    testRender(
      <XtmPlatformTrialStatusPanel
        state={XtmPlatformTrialStatusPanelState.RequestInProgress}
        requesterEmail="requester@acme.io"
        dateRows={[
          { labelKey: 'RequestedOn', date: '2025-01-01T00:00:00.000Z' },
        ]}
        products={[PlatformIdentifier.Opencti, PlatformIdentifier.Openaev]}
        stepIndex={0}
        actions={<button>cancel</button>}
      />
    );

    expect(screen.getByText('requester@acme.io')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Status.ProductsIncludedInRequest'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('PlatformIdentifier.opencti')).toBeInTheDocument();
    expect(screen.getByText('PlatformIdentifier.openaev')).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.RequestedOn:', {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Status.request-in-progress.Title'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Status.request-in-progress.Description'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.Stepper.Pending')
    ).toBeInTheDocument();
  });

  it('renders the started-on and cancelled-on date rows for the cancelled state', () => {
    testRender(
      <XtmPlatformTrialStatusPanel
        state={XtmPlatformTrialStatusPanelState.Cancelled}
        requesterEmail="requester@acme.io"
        dateRows={[
          { labelKey: 'StartedOn', date: '2025-01-01T00:00:00.000Z' },
          { labelKey: 'CancelledOn', date: '2025-01-15T00:00:00.000Z' },
        ]}
        products={[]}
        actions={<button>reach sales</button>}
      />
    );

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.StartedOn:', {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.CancelledOn:', {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.cancelled.Title')
    ).toBeInTheDocument();
  });

  it('renders the started-on and finished-on date rows for the expired state', () => {
    testRender(
      <XtmPlatformTrialStatusPanel
        state={XtmPlatformTrialStatusPanelState.Expired}
        requesterEmail="requester@acme.io"
        dateRows={[
          { labelKey: 'StartedOn', date: '2025-01-01T00:00:00.000Z' },
          { labelKey: 'FinishedOn', date: '2025-01-15T00:00:00.000Z' },
        ]}
        products={[]}
        actions={<button>reach sales</button>}
      />
    );

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.FinishedOn:', {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.expired.Title')
    ).toBeInTheDocument();
  });

  it('renders the products heading without "InRequest" for terminal states', () => {
    testRender(
      <XtmPlatformTrialStatusPanel
        state={XtmPlatformTrialStatusPanelState.Failed}
        requesterEmail="requester@acme.io"
        dateRows={[
          { labelKey: 'StartedOn', date: null },
          { labelKey: 'FinishedOn', date: null },
        ]}
        products={[PlatformIdentifier.Opencti]}
        actions={<button>reach sales</button>}
      />
    );

    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Status.ProductsIncluded'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Service.Trials.XtmPlatform.Page.Status.ProductsIncludedInRequest'
      )
    ).not.toBeInTheDocument();
  });

  it('does not render a stepper when stepIndex is not provided', () => {
    testRender(
      <XtmPlatformTrialStatusPanel
        state={XtmPlatformTrialStatusPanelState.Failed}
        requesterEmail="requester@acme.io"
        dateRows={[]}
        products={[]}
        actions={null}
      />
    );

    expect(
      screen.queryByText(
        'Service.Trials.XtmPlatform.Page.Status.Stepper.Pending'
      )
    ).not.toBeInTheDocument();
  });

  it('renders the given actions node', () => {
    testRender(
      <XtmPlatformTrialStatusPanel
        state={XtmPlatformTrialStatusPanelState.RequestInProgress}
        requesterEmail="requester@acme.io"
        dateRows={[{ labelKey: 'RequestedOn', date: null }]}
        products={[]}
        stepIndex={0}
        actions={<button>my-action</button>}
      />
    );

    expect(screen.getByText('my-action')).toBeInTheDocument();
  });
});
