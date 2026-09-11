import ClientSection from '@app/(application)/app/(user)/service/xtm-platform-trial/[serviceInstanceId]/manage-users/client-section';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  use: <T,>(value: T) => value,
}));

const manageTrialHeaderProps = vi.hoisted(() => vi.fn());
vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialHeader',
  () => ({
    ManageTrialHeader: (props: {
      backHref?: string;
      backLabelKey?: string;
    }) => {
      manageTrialHeaderProps(props);
      return <div data-testid="manage-trial-header" />;
    },
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialRoleDescriptions',
  () => ({ ManageTrialRoleDescriptions: () => <div /> })
);
vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialTable',
  () => ({ ManageTrialTable: () => <div /> })
);
vi.mock('@/components/ui/BreadcrumbNav', () => ({
  BreadcrumbNav: () => <nav />,
}));

vi.mock('@graphql/service-group/service-group.keys', () => ({
  bundleProductsKeys: { list: () => ['bundleProducts'] },
  bundleUserServiceGroupsKeys: { list: () => ['bundleUserServiceGroups'] },
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useBundleUserServiceGroupsQuery: () => ({
    data: { bundleUserServiceGroups: [] },
  }),
  useBundleProductsQuery: () => ({
    data: { bundleProducts: [] },
    isLoading: false,
    isError: false,
  }),
}));

const renderClientSection = (fromDashboard: boolean) =>
  render(
    <ClientSection
      params={
        { serviceInstanceId: 'bundle-1' } as unknown as Promise<{
          serviceInstanceId: string;
        }>
      }
      fromDashboard={fromDashboard}
    />
  );

describe('manage-users ClientSection', () => {
  beforeEach(() => {
    manageTrialHeaderProps.mockReset();
  });

  it('overrides the back link when opened from the admin dashboard', () => {
    renderClientSection(true);

    expect(manageTrialHeaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        backHref: '/app/admin/manage-trials',
        backLabelKey: 'Service.Bundle.ManageTrial.BackToDashboardButton',
      })
    );
  });

  it('keeps the default back link for the standard trial flow', () => {
    renderClientSection(false);

    const props = manageTrialHeaderProps.mock.calls[0][0];
    expect(props).not.toHaveProperty('backHref');
    expect(props).not.toHaveProperty('backLabelKey');
  });
});
