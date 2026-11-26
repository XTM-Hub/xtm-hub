import { ManageTrialRoleDescriptions } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialRoleDescriptions';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ManageTrialRoleDescriptions', () => {
  it('renders a role panel title for every given product', () => {
    testRender(
      <ManageTrialRoleDescriptions
        products={Object.values(PlatformIdentifier)}
      />
    );

    expect(
      screen.getByText('Service.Bundle.ManageTrial.Roles.opencti.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Bundle.ManageTrial.Roles.openaev.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Bundle.ManageTrial.Roles.xtmone.Title')
    ).toBeInTheDocument();
  });

  it('only renders role panel titles for the given products', () => {
    testRender(
      <ManageTrialRoleDescriptions products={[PlatformIdentifier.Xtmone]} />
    );

    expect(
      screen.getByText('Service.Bundle.ManageTrial.Roles.xtmone.Title')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Service.Bundle.ManageTrial.Roles.opencti.Title')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.Bundle.ManageTrial.Roles.openaev.Title')
    ).not.toBeInTheDocument();
  });

  it('renders no role panel when no products are given', () => {
    testRender(<ManageTrialRoleDescriptions products={[]} />);

    expect(
      screen.queryByText('Service.Bundle.ManageTrial.Roles.opencti.Title')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.Bundle.ManageTrial.Roles.openaev.Title')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.Bundle.ManageTrial.Roles.xtmone.Title')
    ).not.toBeInTheDocument();
  });
});
