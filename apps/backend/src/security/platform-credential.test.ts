import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../tests/tests.const';
import DeploymentRequest from '../model/kanel/public/DeploymentRequest';
import { DeploymentRequestDomain } from '../modules/deployment/deployment.domain';
import { OrganizationDomain } from '../modules/organization-management/organization/organization.domain';
import { ErrorCode } from '../utils/error/error.code';
import { loadPlatformCredentialMatch } from './platform-credential';

describe('loadPlatformCredentialMatch', () => {
  it('should match the resolved registration and its subscribed organization', async () => {
    // Given
    const caller = await TestHelper.platformCaller.create();

    try {
      // When
      const match = await loadPlatformCredentialMatch({
        platform_id: caller.platformId,
        token: caller.token,
      });

      // Then
      expect(match).toMatchObject({
        credential: 'registration',
        platformId: caller.platformId,
        registration: {
          platformConfiguration: {
            platform_id: caller.platformId,
            token: caller.token,
            service_instance_id: caller.serviceInstanceId,
          },
          platformIdentifier: 'opencti',
        },
        organization: { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID },
      });
    } finally {
      await caller.cleanup();
    }
  });

  it('should throw when the service definition of the registration has no mapped platform', async () => {
    // Given
    const caller = await TestHelper.platformCaller.create({
      serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_INTEGRATIONS.ID,
    });

    try {
      // When
      const call = loadPlatformCredentialMatch({
        platform_id: caller.platformId,
        token: caller.token,
      });

      // Then
      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformIdentifier);
    } finally {
      await caller.cleanup();
    }
  });

  it('should match nothing when the credentials are unknown', async () => {
    // When
    const match = await loadPlatformCredentialMatch({
      platform_id: uuidv4(),
      token: uuidv4(),
    });

    // Then
    expect(match).toBeUndefined();
  });

  it('should match the deployment request and the organization of its requester', async () => {
    // Given
    const platformId = uuidv4();
    const token = uuidv4();
    vi.spyOn(
      DeploymentRequestDomain,
      'loadDeploymentRequestBy'
    ).mockResolvedValue({
      platform_id: platformId,
      platform_token: token,
      organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
    } as DeploymentRequest);

    // When
    const match = await loadPlatformCredentialMatch({
      platform_id: platformId,
      token,
    });

    // Then
    expect(match).toMatchObject({
      credential: 'deploymentRequest',
      platformId,
      organization: { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID },
    });
  });

  it('should match nothing when the organization of the deployment request does not exist', async () => {
    // Given
    const platformId = uuidv4();
    const token = uuidv4();
    vi.spyOn(
      DeploymentRequestDomain,
      'loadDeploymentRequestBy'
    ).mockResolvedValue({
      platform_id: platformId,
      platform_token: token,
      organization_requester_id: uuidv4(),
    } as DeploymentRequest);
    vi.spyOn(OrganizationDomain, 'loadOrganizationBy').mockResolvedValue(
      undefined
    );

    // When
    const match = await loadPlatformCredentialMatch({
      platform_id: platformId,
      token,
    });

    // Then
    expect(match).toBeUndefined();
  });
});
