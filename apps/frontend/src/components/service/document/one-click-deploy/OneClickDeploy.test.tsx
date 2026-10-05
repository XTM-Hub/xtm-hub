import OneClickDeploy from '@/components/service/document/one-click-deploy/OneClickDeploy';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '@/components/service/document/one-click-deploy/UseOneClickDeployTab',
  () => ({
    useOneClickDeployTab: () => ({ openTab: vi.fn() }),
  })
);

vi.mock(
  '@/components/service/document/one-click-deploy/EeLearnMoreSheet',
  () => ({
    default: () => null,
  })
);

const huntPack = {
  __typename: 'OpenCTIHuntPack',
  id: 'hunt-pack-1',
  name: 'Initial access hunts',
  type: 'opencti_hunt_pack',
  service_instance: { id: 'service-instance-1' },
} as unknown as documentItem_fragment$data;

const platform = (id: string, title: string, version: string) =>
  ({
    id,
    title,
    version,
    url: `https://${id}.example.com`,
  }) as unknown as useRegisteredPlatformsFragment$data;

const renderWithPlatforms = (
  platforms: useRegisteredPlatformsFragment$data[],
  documentData = huntPack
) => {
  vi.mocked(useRegisteredPlatforms).mockReturnValue({ platforms });
  return testRender(
    <OneClickDeploy
      documentData={documentData}
      requiredProductVersion="7.261003.0"
    />
  );
};

const deployButton = () =>
  screen
    .getByText('Service.ShareableResources.Deploy.DeployPlatform')
    .closest('button');

describe('OneClickDeploy - version floor of a hunt pack', () => {
  it('should disable deployment when the only OpenCTI is older than the pack', () => {
    renderWithPlatforms([platform('production', 'Production', '7.261002.0')]);

    expect(deployButton()).toBeDisabled();
  });

  it('should disable deployment when every connected OpenCTI is older than the pack', () => {
    renderWithPlatforms([
      platform('production', 'Production', '7.261002.0'),
      platform('staging', 'Staging', '7.261002.0-lts'),
    ]);

    expect(deployButton()).toBeDisabled();
  });

  it('should allow deployment when the only OpenCTI meets the pack version', async () => {
    const { user } = renderWithPlatforms([
      platform('production', 'Production', '7.261003.0'),
    ]);

    expect(deployButton()).toBeEnabled();
    await user.click(deployButton()!);
    expect(
      screen.getByText(
        'Service.ShareableResources.Deploy.DeployHuntPackDescription'
      )
    ).toBeInTheDocument();
  });

  it('should only offer the OpenCTI platforms that meet the pack version', async () => {
    const { user } = renderWithPlatforms([
      platform('production', 'Production', '7.261002.0'),
      platform('staging', 'Staging', '7.261003.0'),
    ]);

    await user.click(deployButton()!);

    expect(
      screen.getByText(
        'Service.ShareableResources.Deploy.DeployHuntPackDescription'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Production')).toBeDisabled();
    expect(screen.getByLabelText('Staging')).toBeEnabled();
  });

  it('should explain under a product too old for the pack why it cannot be picked', async () => {
    const { user } = renderWithPlatforms([
      platform('production', 'Production', '7.261002.0'),
      platform('staging', 'Staging', '7.261003.0'),
    ]);

    await user.click(deployButton()!);

    expect(screen.getByLabelText('Production')).toHaveAccessibleDescription(
      'Service.ShareableResources.Deploy.DeployHuntPackIncompatibleVersion'
    );
    expect(screen.getByLabelText('Staging')).not.toHaveAttribute(
      'aria-describedby'
    );
  });

  it('should keep the shared deployment sentence for other resources', async () => {
    const customDashboard = {
      ...huntPack,
      __typename: 'CustomDashboard',
      type: 'opencti_custom_dashboard',
    } as unknown as documentItem_fragment$data;
    const { user } = renderWithPlatforms(
      [
        platform('production', 'Production', '7.261003.0'),
        platform('staging', 'Staging', '7.261003.0'),
      ],
      customDashboard
    );

    await user.click(deployButton()!);

    expect(
      screen.getByText(
        'Service.ShareableResources.Deploy.DeployResourceDescription'
      )
    ).toBeInTheDocument();
  });
});
