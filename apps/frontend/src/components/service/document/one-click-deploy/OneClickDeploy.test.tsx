import OneClickDeploy from '@/components/service/document/one-click-deploy/OneClickDeploy';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { DocumentItemFragment, PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DOCUMENT_ID = 'doc-1';
const DOCUMENT_NAME = 'Feed';
const SERVICE_INSTANCE_ID = 'service-instance-1';
const PLATFORM_ID = 'platform-1';
const PLATFORM_URL = 'https://platform-1.example.com';

const mocks = vi.hoisted(() => ({
  sendTelemetry: vi.fn(),
  openTab: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useOneClickDeployMutation: () => ({ mutate: mocks.sendTelemetry }),
}));

vi.mock(
  '@/components/service/document/one-click-deploy/UseOneClickDeployTab',
  () => ({ useOneClickDeployTab: () => ({ openTab: mocks.openTab }) })
);

const documentData = {
  __typename: 'CsvFeed',
  id: DOCUMENT_ID,
  name: DOCUMENT_NAME,
  type: ShareableResourceType.OPENCTI_INTEGRATION,
  service_instance: { id: SERVICE_INSTANCE_ID, slug: 'opencti-integrations' },
} as unknown as DocumentItemFragment;

const platform = {
  id: PLATFORM_ID,
  title: 'Platform',
  url: PLATFORM_URL,
  version: '6.0.0',
  contract: 'EE',
} as unknown as useRegisteredPlatformsFragment$data;

describe('OneClickDeploy', () => {
  beforeEach(() => {
    mocks.sendTelemetry.mockReset();
    mocks.openTab.mockReset();
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [platform],
    } as unknown as ReturnType<typeof useRegisteredPlatforms>);
  });

  it('should send the one-click deploy telemetry event and open the platform when the deployment is confirmed', async () => {
    // Given
    const { user } = testRender(<OneClickDeploy documentData={documentData} />);

    // When
    await user.click(
      screen.getByRole('button', {
        name: 'Service.ShareableResources.Deploy.DeployPlatform',
      })
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Continue' }));

    // Then
    expect(mocks.sendTelemetry).toHaveBeenCalledWith({
      input: {
        platform_identifier: PlatformIdentifier.Opencti,
        service_instance_id: SERVICE_INSTANCE_ID,
        resource_id: DOCUMENT_ID,
        resource_title: DOCUMENT_NAME,
        platform_service_instance_id: PLATFORM_ID,
      },
    });
    expect(mocks.openTab).toHaveBeenCalled();
  });

  it('should not send the telemetry event when the deployment is cancelled', async () => {
    // Given
    const { user } = testRender(<OneClickDeploy documentData={documentData} />);

    // When
    await user.click(
      screen.getByRole('button', {
        name: 'Service.ShareableResources.Deploy.DeployPlatform',
      })
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(mocks.sendTelemetry).not.toHaveBeenCalled();
  });
});
