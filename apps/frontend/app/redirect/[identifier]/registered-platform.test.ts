import { loadMeUser } from '@/utils/load-me-user';
import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectToRegisteredPlatform } from './registered-platform';
import {
  loadBaseUrlFront,
  loadPlatformOrganizationId,
  loadRegisteredPlatformRedirectTargets,
} from './utils/load';
import { switchOrganization } from './utils/switch-organization';

vi.mock('./utils/load');
vi.mock('./utils/switch-organization');
vi.mock('../../../src/utils/load-me-user');

const BASE_URL = 'http://localhost:3002';
const PLATFORM_ID = 'platform-1';
const SERVICE_INSTANCE_GLOBAL_ID = btoa(
  'ServiceInstance:1e18c47c-4c03-4ae7-a401-378cde286370'
);
const REGISTRATION_URL = `${BASE_URL}/app/service/openaev_registration/${encodeURIComponent(SERVICE_INSTANCE_GLOBAL_ID)}`;
const HOME_URL = `${BASE_URL}/app`;

type LoadMeUserResult = Awaited<ReturnType<typeof loadMeUser>>;
type RegisteredPlatformRedirectTarget = Awaited<
  ReturnType<typeof loadRegisteredPlatformRedirectTargets>
>[number];

const defaultUser: LoadMeUserResult = {
  id: 'user-1',
  selected_organization_id: 'organization-id',
  organizations: [],
  capabilities: [],
  selected_org_capabilities: [],
};

const buildPlatform = (
  overrides: Partial<RegisteredPlatformRedirectTarget> = {}
): RegisteredPlatformRedirectTarget => ({
  service_instance_id: SERVICE_INSTANCE_GLOBAL_ID,
  platform_id: PLATFORM_ID,
  tenant_id: null,
  identifier: ServiceDefinitionIdentifier.OpenaevRegistration,
  deployment_request: null,
  ...overrides,
});

const makeRequest = (query = `?platform_id=${PLATFORM_ID}`) =>
  new NextRequest(`${BASE_URL}/redirect/openaev-registration${query}`);

describe('redirectToRegisteredPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadBaseUrlFront).mockResolvedValue(BASE_URL);
    vi.mocked(loadMeUser).mockResolvedValue(defaultUser);
    vi.mocked(loadPlatformOrganizationId).mockResolvedValue(undefined);
    vi.mocked(loadRegisteredPlatformRedirectTargets).mockResolvedValue([
      buildPlatform(),
    ]);
  });

  it('should redirect to login when the user is not authenticated', async () => {
    // Given
    const query = `?platform_id=${PLATFORM_ID}`;
    vi.mocked(loadMeUser).mockResolvedValue(null);

    // When
    const response = await redirectToRegisteredPlatform(
      makeRequest(query),
      PlatformIdentifier.Openaev
    );

    // Then
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/login?redirect=${encodeURIComponent(btoa(`/redirect/openaev-registration${query}`))}`
    );
    expect(loadRegisteredPlatformRedirectTargets).not.toHaveBeenCalled();
  });

  it('should redirect to the home page when no platform id is given', async () => {
    // When
    const response = await redirectToRegisteredPlatform(
      makeRequest(''),
      PlatformIdentifier.Openaev
    );

    // Then
    expect(response.headers.get('location')).toBe(HOME_URL);
    expect(loadRegisteredPlatformRedirectTargets).not.toHaveBeenCalled();
  });

  it('should redirect to the registration page of the platform', async () => {
    // When
    const response = await redirectToRegisteredPlatform(
      makeRequest(),
      PlatformIdentifier.Openaev
    );

    // Then
    expect(loadRegisteredPlatformRedirectTargets).toHaveBeenCalledWith(
      PlatformIdentifier.Openaev
    );
    expect(response.headers.get('location')).toBe(REGISTRATION_URL);
  });

  it('should switch to the organization the platform is registered in before loading it', async () => {
    // Given
    vi.mocked(loadPlatformOrganizationId).mockResolvedValue(
      'platform-organization-id'
    );

    // When
    await redirectToRegisteredPlatform(
      makeRequest(`?platform_id=${PLATFORM_ID}&tenant_id=tenant-1`),
      PlatformIdentifier.Openaev
    );

    // Then
    expect(loadPlatformOrganizationId).toHaveBeenCalledWith(
      PLATFORM_ID,
      'tenant-1'
    );
    expect(switchOrganization).toHaveBeenCalledWith('platform-organization-id');
    expect(
      vi.mocked(switchOrganization).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(loadRegisteredPlatformRedirectTargets).mock
        .invocationCallOrder[0]!
    );
  });

  it.each`
    organizationId                           | description
    ${undefined}                             | ${'no organization is associated with the platform'}
    ${defaultUser!.selected_organization_id} | ${'the platform belongs to the selected organization'}
  `(
    'should not switch organization when $description',
    async ({ organizationId }: { organizationId: string | undefined }) => {
      // Given
      vi.mocked(loadPlatformOrganizationId).mockResolvedValue(organizationId);

      // When
      await redirectToRegisteredPlatform(
        makeRequest(),
        PlatformIdentifier.Openaev
      );

      // Then
      expect(switchOrganization).not.toHaveBeenCalled();
    }
  );

  it('should redirect to the registration page of the requested tenant', async () => {
    // Given
    const tenantGlobalId = btoa('ServiceInstance:tenant-2-instance');
    vi.mocked(loadRegisteredPlatformRedirectTargets).mockResolvedValue([
      buildPlatform({ tenant_id: 'tenant-1' }),
      buildPlatform({
        tenant_id: 'tenant-2',
        service_instance_id: tenantGlobalId,
      }),
    ]);

    // When
    const response = await redirectToRegisteredPlatform(
      makeRequest(`?platform_id=${PLATFORM_ID}&tenant_id=tenant-2`),
      PlatformIdentifier.Openaev
    );

    // Then
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/app/service/openaev_registration/${encodeURIComponent(tenantGlobalId)}`
    );
  });

  it('should redirect to the home page when the user cannot see the platform registration', async () => {
    // Given
    vi.mocked(loadRegisteredPlatformRedirectTargets).mockResolvedValue([
      buildPlatform({ platform_id: 'another-platform' }),
    ]);

    // When
    const response = await redirectToRegisteredPlatform(
      makeRequest(),
      PlatformIdentifier.Openaev
    );

    // Then
    expect(response.headers.get('location')).toBe(HOME_URL);
  });
});
