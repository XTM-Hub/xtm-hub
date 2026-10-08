import ChoosePlatformForm from '@/components/service/document/one-click-deploy/ChoosePlatformForm';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const documentData = {
  id: 'doc-1',
  name: 'Feed',
  type: ShareableResourceType.OPENCTI_INTEGRATION,
} as unknown as documentItem_fragment$data;

const buildPlatform = (id: string, title: string) =>
  ({
    id,
    title,
    url: `https://${id}.example.com`,
    version: '6.0.0',
    contract: 'EE',
  }) as unknown as useRegisteredPlatformsFragment$data;

describe('ChoosePlatformForm', () => {
  it('should deploy on the picked platform and close when Continue is clicked', async () => {
    const oneClickDeploy = vi.fn();
    const setIsOpen = vi.fn();
    testRender(
      <ChoosePlatformForm
        documentData={documentData}
        platforms={[
          buildPlatform('first', 'First platform'),
          buildPlatform('second', 'Second platform'),
        ]}
        translatedPlatformIdentifier="OpenCTI"
        oneClickDeploy={oneClickDeploy}
        setIsOpen={setIsOpen}
      />
    );

    await userEvent.click(
      screen.getByRole('radio', { name: 'Second platform' })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Utils.Continue' })
    );

    await waitFor(() =>
      expect(oneClickDeploy).toHaveBeenCalledWith('https://second.example.com')
    );
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it('should stay open without deploying when no platform is picked', async () => {
    const oneClickDeploy = vi.fn();
    const setIsOpen = vi.fn();
    testRender(
      <ChoosePlatformForm
        documentData={documentData}
        platforms={[
          buildPlatform('first', 'First platform'),
          buildPlatform('second', 'Second platform'),
        ]}
        translatedPlatformIdentifier="OpenCTI"
        oneClickDeploy={oneClickDeploy}
        setIsOpen={setIsOpen}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Utils.Continue' })
    );

    await waitFor(() =>
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    );
    expect(oneClickDeploy).not.toHaveBeenCalled();
    expect(setIsOpen).not.toHaveBeenCalled();
  });
});
