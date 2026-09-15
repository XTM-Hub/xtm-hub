import testRender from '@/utils/test/test-render';
import { XtmPlatformBundleDetailsFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BundleInfoCard } from './BundleInfoCard';

const buildBundle = (
  overrides: Partial<XtmPlatformBundleDetailsFragment> = {}
): XtmPlatformBundleDetailsFragment => ({
  id: 'bundle-1',
  service_instance_id: 'service-instance-1',
  organization_name: 'ACME',
  start_date: '2025-01-01T00:00:00.000Z',
  end_date: '2025-01-31T00:00:00.000Z',
  requester_email: 'requester@acme.io',
  children: [],
  ...overrides,
});

describe('BundleInfoCard', () => {
  it('renders the organization name, requester and license', () => {
    testRender(
      <BundleInfoCard
        bundle={buildBundle()}
        canManage={false}
      />
    );

    expect(screen.getByText('ACME')).toBeInTheDocument();
    expect(screen.getByText('requester@acme.io')).toBeInTheDocument();
    expect(screen.getByText('Contracts.TRIAL')).toBeInTheDocument();
  });

  it('shows the management actions only when the user can manage', () => {
    const { rerender } = testRender(
      <BundleInfoCard
        bundle={buildBundle()}
        canManage={false}
      />
    );
    expect(
      screen.queryByText('XtmPlatformTrial.CancelTrial')
    ).not.toBeInTheDocument();

    rerender(
      <BundleInfoCard
        bundle={buildBundle()}
        canManage={true}
      />
    );
    expect(
      screen.getByText('XtmPlatformTrial.CancelTrial')
    ).toBeInTheDocument();
  });
});
