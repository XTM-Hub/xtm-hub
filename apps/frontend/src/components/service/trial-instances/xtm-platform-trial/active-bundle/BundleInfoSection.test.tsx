import { expectPaperWithTitleAbove } from '@/utils/test/paper';
import testRender from '@/utils/test/test-render';
import { XtmPlatformBundleDetailsFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BundleInfoSection } from './BundleInfoSection';

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

describe('BundleInfoSection', () => {
  it('renders the organization name, requester and license', () => {
    testRender(
      <BundleInfoSection
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
      <BundleInfoSection
        bundle={buildBundle()}
        canManage={false}
      />
    );
    expect(
      screen.queryByText('XtmPlatformTrial.CancelTrial')
    ).not.toBeInTheDocument();

    rerender(
      <BundleInfoSection
        bundle={buildBundle()}
        canManage={true}
      />
    );
    expect(
      screen.getByText('XtmPlatformTrial.CancelTrial')
    ).toBeInTheDocument();
  });

  it('should render the details on the design system Paper surface, with the title above it', () => {
    // Given / When
    testRender(
      <BundleInfoSection
        bundle={buildBundle()}
        canManage={false}
      />
    );

    // Then
    const title = screen.getByRole('heading', {
      level: 2,
      name: 'XtmPlatformTrial.BundleInfo.Title',
    });
    const surface = screen.getByText('ACME').closest('section');
    expectPaperWithTitleAbove(surface, title);
  });
});
