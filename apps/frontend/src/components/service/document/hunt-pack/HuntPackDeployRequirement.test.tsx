import { HuntPackDeployRequirement } from '@/components/service/document/hunt-pack/HuntPackDeployRequirement';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const huntPack = {
  id: 'hunt-pack-1',
  name: 'Initial access hunts',
  type: 'opencti_hunt_pack',
} as unknown as documentItem_fragment$data;

const platform = (id: string, title: string, version: string) =>
  ({ id, title, version }) as unknown as useRegisteredPlatformsFragment$data;

const renderWithPlatforms = (
  platforms: useRegisteredPlatformsFragment$data[]
) => {
  vi.mocked(useRegisteredPlatforms).mockReturnValue({ platforms });
  return testRender(
    <HuntPackDeployRequirement
      documentData={huntPack}
      requiredProductVersion="7.261003.0"
    />
  );
};

const WARNING =
  'Service.ShareableResources.Deploy.DeployHuntPackIncompatibleVersion';

describe('HuntPackDeployRequirement', () => {
  it('should say which product to update when the only one is older than the pack', () => {
    renderWithPlatforms([platform('production', 'Production', '7.261002.0')]);

    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it('should say it when every connected product is older than the pack', () => {
    renderWithPlatforms([
      platform('production', 'Production', '7.261002.0'),
      platform('staging', 'Staging', '7.261001.0'),
    ]);

    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it('should stay silent when one connected product can take the pack', () => {
    renderWithPlatforms([
      platform('production', 'Production', '7.261002.0'),
      platform('staging', 'Staging', '7.261003.0'),
    ]);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('should stay silent without a connected product', () => {
    renderWithPlatforms([]);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });
});
