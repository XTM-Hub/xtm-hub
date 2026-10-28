import { MockInstance } from '@vitest/spy';
import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  requestContextRegistererUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  NewsFeedItemType,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  PlatformRegistrationConnectivityStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode, ErrorCode } from '../../utils/error/error.code';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { NewsFeedDomain } from '../news-feed/news-feed.domain';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import { RegistrationApp } from './registration.app';
import { RegistrationConnectivityApp } from './registration.connectivity.app';

describe('registration connectivity app', () => {
  beforeEach(() => {
    requestContext.set(requestContextRegistererUserSecondOrga);
  });

  afterAll(async () => {
    vi.useRealTimers();
  });

  describe('refreshPlatformRegistrationConnectivityStatus', () => {
    it('should throw an error when version is not formatted as a semantic version', async () => {
      const call =
        RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId: uuidv4(),
            token: uuidv4(),
            platformVersion: '9.Y.Z',
          }
        );

      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformVersion);
    });

    it('should throw TENANT_ID_MANDATORY when no tenantId is provided but the platform version requires one', async () => {
      const call =
        RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId: uuidv4(),
            token: uuidv4(),
            platformVersion: '2.4.0',
            platformIdentifier: PlatformIdentifier.Openaev,
          }
        );

      await expect(call).rejects.toThrow(BadRequestErrorCode.TenantIdMandatory);
    });

    it('should return inactive when platform is not registered but identifier is not provided', async () => {
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId: uuidv4(),
            token: uuidv4(),
            platformVersion: '7.0.0',
          }
        );

      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.Inactive
      );
    });

    it('should return not found when platform is not registered and has version below compatibility version', async () => {
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId: uuidv4(),
            token: uuidv4(),
            platformVersion: '7.0.0',
            platformIdentifier: PlatformIdentifier.Opencti,
          }
        );

      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.NotFound
      );
    });

    it('should return inactive when platform is not registered and has version above compatibility version', async () => {
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId: uuidv4(),
            token: uuidv4(),
            platformVersion: '6.0.0',
          }
        );

      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.Inactive
      );
    });

    it('should return not found when an XTM One platform is not registered', async () => {
      // Given
      const platformId = uuidv4();

      // When
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId,
            token: uuidv4(),
            platformVersion: '1.0.0',
            platformIdentifier: PlatformIdentifier.Xtmone,
          }
        );

      // Then
      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.NotFound
      );
    });

    it('should return active when an XTM One platform is registered', async () => {
      // Given
      const platformId = uuidv4();
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://xtmone.example.com',
          contract: PlatformContract.Ee,
          title: 'XTM One',
          version: '1.0.0',
        },
        identifier: PlatformIdentifier.Xtmone,
      });

      // When
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId,
            token,
            platformVersion: '1.0.1',
            platformIdentifier: PlatformIdentifier.Xtmone,
          }
        );

      // Then
      expect(result.status).toBe(PlatformRegistrationConnectivityStatus.Active);
    });

    it('should return active when platform is registered and update version', async () => {
      const platformId = uuidv4();
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
        },
        identifier: PlatformIdentifier.Opencti,
      });

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId,
            token,
            platformVersion: '6.7.18',
          }
        );

      const getPlatforms = await RegistrationApp.loadRegisteredPlatforms({
        identifier: PlatformIdentifier.Opencti,
      });
      const currentPlatform = getPlatforms.find(
        (registeredPlatform) => platformId === registeredPlatform.platform_id
      );
      expect(currentPlatform?.version).toBe('6.7.18');
      expect(result.status).toBe(PlatformRegistrationConnectivityStatus.Active);
    });

    it.each([
      [PlatformContract.Ee, PlatformContract.Ce, PlatformContract.Ee],
      [PlatformContract.Ce, PlatformContract.Ee, PlatformContract.Ce],
      [PlatformContract.Ce, PlatformContract.Ce, undefined],
      [PlatformContract.Trial, PlatformContract.Trial, PlatformContract.Ee],
    ])(
      'should store the %s contract when a platform registered as %s refreshes with %s',
      async (expectedContract, registeredContract, refreshedContract) => {
        // Given
        const platformId = uuidv4();
        const platformVersion = '6.7.18';
        const token = await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            url: 'http://example.com',
            contract: registeredContract,
            title: 'Fake title',
            version: platformVersion,
          },
          identifier: PlatformIdentifier.Opencti,
        });

        // When
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId,
            token,
            platformVersion,
            platformContract: refreshedContract,
          }
        );

        // Then
        const config =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId
          );
        expect(config?.platform_contract).toBe(expectedContract);
      }
    );
  });

  describe('refreshPlatformRegistrationConnectivityStatusSingleTenant', () => {
    it('should throw an error when version is not formatted as a semantic version', async () => {
      const call =
        RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
          {
            platformId: uuidv4(),
            token: uuidv4(),
            platformVersion: '9.Y.Z',
            url: 'http://example.com/tenant',
            tenantId: uuidv4(),
            tenantName: 'My tenant',
            platformIdentifier: PlatformIdentifier.Openaev,
          }
        );

      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformVersion);
    });

    it('should return active when platform is registered with tenant_id and correct tenant_id is provided', async () => {
      const platformId = uuidv4();
      const tenantId = uuidv4();
      const tenantName = 'My tenant';
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com/tenant',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId,
          tenantName,
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
          {
            platformId,
            token,
            platformVersion: '6.7.18',
            url: 'http://example.com/tenant',
            tenantId,
            tenantName,
            platformIdentifier: PlatformIdentifier.Openaev,
          }
        );

      expect(result.status).toBe(PlatformRegistrationConnectivityStatus.Active);
    });

    it('should update the url in the configuration when url changes', async () => {
      const platformId = uuidv4();
      const tenantId = uuidv4();
      const tenantName = 'My tenant';
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId,
          tenantName,
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const newUrl = 'http://example.com/tenantId';
      await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
        {
          platformId,
          token,
          platformVersion: '6.7.18',
          url: newUrl,
          tenantId,
          tenantName,
          platformIdentifier: PlatformIdentifier.Openaev,
        }
      );

      const config =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId,
          { tenantId }
        );
      expect(config?.platform_url).toBe(newUrl);
    });

    it('should update the tenant_name in the configuration when tenant_name changes', async () => {
      const platformId = uuidv4();
      const tenantId = uuidv4();
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId,
          tenantName: 'Old tenant name',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const updatedTenantName = 'Updated tenant name';
      await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
        {
          platformId,
          token,
          platformVersion: '1.0.0',
          url: 'http://example.com',
          tenantId,
          tenantName: updatedTenantName,
          platformIdentifier: PlatformIdentifier.Openaev,
        }
      );

      const config =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId,
          { tenantId }
        );
      expect(config?.tenant_name).toBe(updatedTenantName);
    });

    it('should return not found when platform is registered with tenant_id but wrong tenant_id is provided', async () => {
      const platformId = uuidv4();
      const tenantId = uuidv4();
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com/tenantId',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId,
          tenantName: 'My tenant',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
          {
            platformId,
            token,
            platformVersion: '6.7.18',
            url: 'http://example.com/tenantId',
            tenantId: uuidv4(),
            tenantName: 'Other tenant',
            platformIdentifier: PlatformIdentifier.Openaev,
          }
        );

      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.NotFound
      );
    });

    it('should return active and update config with tenantId when a legacy platform (registered without tenantId on an old version) upgrades to a version that requires it', async () => {
      const platformId = uuidv4();
      const tenantId = uuidv4();
      const tenantName = 'My tenant';
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
          {
            platformId,
            token,
            platformVersion: '2.4.0',
            url: 'http://example.com/tenantId',
            tenantId,
            tenantName,
            platformIdentifier: PlatformIdentifier.Openaev,
          }
        );

      expect(result.status).toBe(PlatformRegistrationConnectivityStatus.Active);
      const updatedConfig =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId,
          { tenantId }
        );
      expect(updatedConfig).toMatchObject({
        tenant_id: tenantId,
        tenant_name: tenantName,
      });
    });

    it('should update the contract of the refreshed tenant only when the platform sends a new contract', async () => {
      // Given
      const platformId = uuidv4();
      const refreshedTenantId = uuidv4();
      const otherTenantId = uuidv4();
      const refreshedTenantName = 'Refreshed tenant';
      const refreshedTenantUrl = 'http://example.com/refreshed';
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: refreshedTenantUrl,
          contract: PlatformContract.Ce,
          title: 'Fake title',
          version: '1.0.0',
          tenantId: refreshedTenantId,
          tenantName: refreshedTenantName,
        },
        identifier: PlatformIdentifier.Openaev,
      });
      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com/other',
          contract: PlatformContract.Ce,
          title: 'Fake title',
          version: '1.0.0',
          tenantId: otherTenantId,
          tenantName: 'Other tenant',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      // When
      await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusSingleTenant(
        {
          platformId,
          token,
          platformVersion: '1.0.0',
          url: refreshedTenantUrl,
          tenantId: refreshedTenantId,
          tenantName: refreshedTenantName,
          platformIdentifier: PlatformIdentifier.Openaev,
          platformContract: PlatformContract.Ee,
        }
      );

      // Then
      const [refreshedConfig, otherConfig] = await Promise.all([
        PlatformConfigurationDomain.loadConfigurationByPlatform(platformId, {
          tenantId: refreshedTenantId,
        }),
        PlatformConfigurationDomain.loadConfigurationByPlatform(platformId, {
          tenantId: otherTenantId,
        }),
      ]);
      expect({
        refreshed: refreshedConfig?.platform_contract,
        other: otherConfig?.platform_contract,
      }).toEqual({
        refreshed: PlatformContract.Ee,
        other: PlatformContract.Ce,
      });
    });
  });

  describe('refreshPlatformRegistrationConnectivityStatusAllTenants', () => {
    it('should return inactive for all tenants when version is not formatted as a semantic version', async () => {
      const tenantId = uuidv4();
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
          {
            platformId: uuidv4(),
            platformVersion: '9.Y.Z',
            platformIdentifier: PlatformIdentifier.Openaev,
            tenants: [
              {
                tenantId,
                tenantName: 'My tenant',
                token: uuidv4(),
                url: 'http://example.com/tenant1',
              },
            ],
          }
        );

      expect(result.statuses).toHaveLength(1);
      expect(result.statuses[0]).toEqual({
        tenantId,
        status: PlatformRegistrationConnectivityStatus.Inactive,
      });
    });

    it('should return statuses for each tenant', async () => {
      const platformId = uuidv4();
      const tenantId1 = uuidv4();
      const tenantId2 = uuidv4();
      const tenantName1 = 'Tenant One';
      const tenantName2 = 'Tenant Two';

      const token1 = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com/tenantId1',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId: tenantId1,
          tenantName: tenantName1,
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const token2 = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com/tenantId2',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId: tenantId2,
          tenantName: tenantName2,
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
          {
            platformId,
            platformVersion: '6.7.18',
            platformIdentifier: PlatformIdentifier.Openaev,
            tenants: [
              {
                tenantId: tenantId1,
                tenantName: tenantName1,
                token: token1,
                url: 'http://example.com/tenant1',
              },
              {
                tenantId: tenantId2,
                tenantName: tenantName2,
                token: token2,
                url: 'http://example.com/tenant2',
              },
            ],
          }
        );

      expect(result.statuses).toHaveLength(2);
      expect(result.statuses).toEqual(
        expect.arrayContaining([
          {
            tenantId: tenantId1,
            status: PlatformRegistrationConnectivityStatus.Active,
          },
          {
            tenantId: tenantId2,
            status: PlatformRegistrationConnectivityStatus.Active,
          },
        ])
      );
    });

    it('should return not found for a tenant with wrong token', async () => {
      const platformId = uuidv4();
      const tenantId = uuidv4();

      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId,
          tenantName: 'My tenant',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
          {
            platformId,
            platformVersion: '6.7.18',
            platformIdentifier: PlatformIdentifier.Openaev,
            tenants: [
              {
                tenantId,
                tenantName: 'My tenant',
                token: uuidv4(),
                url: 'http://example.com/tenant',
              },
            ],
          }
        );

      expect(result.statuses).toHaveLength(1);
      expect(result.statuses).toEqual([
        { tenantId, status: PlatformRegistrationConnectivityStatus.NotFound },
      ]);
    });

    it('should return empty statuses when no tenants are provided', async () => {
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
          {
            platformId: uuidv4(),
            platformVersion: '6.7.18',
            platformIdentifier: PlatformIdentifier.Openaev,
            tenants: [],
          }
        );

      expect(result.statuses).toHaveLength(0);
    });

    it('should return inactive for a failed tenant and active for a successful one', async () => {
      const platformId = uuidv4();
      const tenantId = uuidv4();

      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId,
          tenantName: 'My tenant',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const failingTenantId = uuidv4();

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
          {
            platformId,
            platformVersion: '6.7.18',
            platformIdentifier: PlatformIdentifier.Openaev,
            tenants: [
              {
                tenantId,
                tenantName: 'My tenant',
                token,
                url: 'http://example.com/tenant1',
              },
              {
                tenantId: failingTenantId,
                tenantName: 'Failing tenant',
                token: uuidv4(),
                url: 'http://example.com/tenant2',
              },
            ],
          }
        );

      expect(result.statuses).toHaveLength(2);
      expect(result.statuses).toEqual(
        expect.arrayContaining([
          { tenantId, status: PlatformRegistrationConnectivityStatus.Active },
          {
            tenantId: failingTenantId,
            status: PlatformRegistrationConnectivityStatus.NotFound,
          },
        ])
      );
    });

    it('should deactivate tenants with the same platformId that were not provided in the call', async () => {
      const platformId = uuidv4();
      const tenantId1 = uuidv4();
      const tenantId2 = uuidv4();

      const token1 = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com/tenantId1',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId: tenantId1,
          tenantName: 'Tenant One',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com/tenantId2',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
          tenantId: tenantId2,
          tenantName: 'Tenant Two',
        },
        identifier: PlatformIdentifier.Openaev,
      });

      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
          {
            platformId,
            platformVersion: '6.7.18',
            platformIdentifier: PlatformIdentifier.Openaev,
            tenants: [
              {
                tenantId: tenantId1,
                tenantName: 'Tenant One',
                token: token1,
                url: 'http://example.com/tenantId1',
              },
            ],
          }
        );

      expect(result.statuses).toHaveLength(1);
      expect(result.statuses[0]).toEqual({
        tenantId: tenantId1,
        status: PlatformRegistrationConnectivityStatus.Active,
      });

      const staleConfig =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId,
          { tenantId: tenantId2 }
        );
      expect(staleConfig?.status).toBe(PlatformConfigurationStatus.Inactive);
    });

    it('should update the contract of every refreshed tenant when the platform sends a new contract', async () => {
      // Given
      const platformId = uuidv4();
      const tenants = [
        {
          tenantId: uuidv4(),
          tenantName: 'Tenant One',
          url: 'http://example.com/tenantId1',
        },
        {
          tenantId: uuidv4(),
          tenantName: 'Tenant Two',
          url: 'http://example.com/tenantId2',
        },
      ];
      const tenantsWithTokens = [];
      for (const tenant of tenants) {
        const token = await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            url: tenant.url,
            contract: PlatformContract.Ce,
            title: 'Fake title',
            version: '1.0.0',
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
          },
          identifier: PlatformIdentifier.Openaev,
        });
        tenantsWithTokens.push({ ...tenant, token });
      }

      // When
      await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatusAllTenants(
        {
          platformId,
          platformVersion: '1.0.0',
          platformIdentifier: PlatformIdentifier.Openaev,
          platformContract: PlatformContract.Ee,
          tenants: tenantsWithTokens,
        }
      );

      // Then
      const configs = await Promise.all(
        tenants.map(({ tenantId }) =>
          PlatformConfigurationDomain.loadConfigurationByPlatform(platformId, {
            tenantId,
          })
        )
      );
      expect(configs.map((config) => config?.platform_contract)).toEqual([
        PlatformContract.Ee,
        PlatformContract.Ee,
      ]);
    });
  });

  describe('blogpost backfill when the platform version changes', () => {
    const BLOGPOST_REQUIRED_VERSION = '7.260901.0';
    const BELOW_VERSION = '7.260831.0';
    const ABOVE_VERSION = '7.260902.0';
    let replacedProperty: ReturnType<typeof vi.replaceProperty>;
    let registrationBackfillSpy: MockInstance;
    let versionBackfillSpy: MockInstance;

    beforeEach(() => {
      replacedProperty = vi.replaceProperty(
        RequiredPlatformVersions,
        'NewsFeedBlogpostSupport',
        {
          [PlatformIdentifier.Opencti]: BLOGPOST_REQUIRED_VERSION,
          [PlatformIdentifier.Openaev]: null,
          [PlatformIdentifier.Xtmone]: null,
        }
      );
      registrationBackfillSpy = vi.spyOn(
        NewsFeedApp,
        'backfillBlogpostsForPlatform'
      );
      versionBackfillSpy = vi.spyOn(
        NewsFeedApp,
        'backfillBlogpostsOnVersionChange'
      );
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      replacedProperty.restore();
      await TestHelper.newsFeed.deleteItem();
    });

    // The backfills are fire and forget: waits for the ones that were started
    const waitForBackfills = (spy: MockInstance) =>
      Promise.all(spy.mock.results.map((result) => result.value));

    // Registers an OpenCTI platform, then creates the blogposts once the registration backfill is over: only the
    // backfill of the version change can provision them
    const registerPlatformThenCreateBlogposts = async (
      registeredVersion: string
    ) => {
      const platformId = uuidv4();
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: registeredVersion,
        },
        identifier: PlatformIdentifier.Opencti,
      });
      await waitForBackfills(registrationBackfillSpy);
      const blogposts = await Promise.all(
        [1, 2].map((number) =>
          TestHelper.newsFeed.createItem({
            title: `Blogpost ${number}`,
            type: NewsFeedItemType.BlogPost,
            platform_identifier: PlatformIdentifier.Opencti,
            creation_date: new Date(Date.now() - number * 24 * 60 * 60 * 1000),
          })
        )
      );
      return {
        platformId,
        token,
        blogpostIds: blogposts.map(({ id }) => id).sort(),
      };
    };

    const loadProvisionedItemIds = async (platformId: string) =>
      (await TestHelper.newsFeed.loadProvisioned({ platform_id: platformId }))
        .map((row) => row.news_feed_item_id)
        .sort();

    it.each`
      description                     | registeredVersion            | refreshedVersion             | expectedBackfill
      ${'below to above'}             | ${BELOW_VERSION}             | ${ABOVE_VERSION}             | ${true}
      ${'below to equal'}             | ${BELOW_VERSION}             | ${BLOGPOST_REQUIRED_VERSION} | ${true}
      ${'above to above'}             | ${BLOGPOST_REQUIRED_VERSION} | ${ABOVE_VERSION}             | ${false}
      ${'above to below (downgrade)'} | ${ABOVE_VERSION}             | ${BELOW_VERSION}             | ${false}
      ${'below to below'}             | ${'7.260801.0'}              | ${BELOW_VERSION}             | ${false}
    `(
      'should provision the blogposts: $expectedBackfill when the version goes $description',
      async ({ registeredVersion, refreshedVersion, expectedBackfill }) => {
        // Given
        const { platformId, token, blogpostIds } =
          await registerPlatformThenCreateBlogposts(registeredVersion);

        // When
        const result =
          await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
            {
              platformId,
              token,
              platformVersion: refreshedVersion,
              platformIdentifier: PlatformIdentifier.Opencti,
            }
          );
        await waitForBackfills(versionBackfillSpy);

        // Then
        expect(result.status).toBe(
          PlatformRegistrationConnectivityStatus.Active
        );
        expect(await loadProvisionedItemIds(platformId)).toEqual(
          expectedBackfill ? blogpostIds : []
        );
      }
    );

    it('should resolve the platform identifier from the service definition when the refresh does not give it', async () => {
      // Given
      const { platformId, token, blogpostIds } =
        await registerPlatformThenCreateBlogposts(BELOW_VERSION);

      // When
      await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
        {
          platformId,
          token,
          platformVersion: ABOVE_VERSION,
        }
      );
      await waitForBackfills(versionBackfillSpy);

      // Then
      expect(await loadProvisionedItemIds(platformId)).toEqual(blogpostIds);
    });

    it('should not backfill when the version does not change', async () => {
      // Given
      const { platformId, token } =
        await registerPlatformThenCreateBlogposts(ABOVE_VERSION);

      // When
      await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
        {
          platformId,
          token,
          platformVersion: ABOVE_VERSION,
          platformIdentifier: PlatformIdentifier.Opencti,
        }
      );

      // Then
      expect(versionBackfillSpy).not.toHaveBeenCalled();
      expect(await loadProvisionedItemIds(platformId)).toEqual([]);
    });

    it('should not backfill an unregistered platform', async () => {
      // Given
      const { platformId, token } =
        await registerPlatformThenCreateBlogposts(BELOW_VERSION);
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId
        );
      await PlatformConfigurationDomain.updateConfiguration(
        configuration!.service_instance_id,
        { status: PlatformConfigurationStatus.Inactive }
      );

      // When
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId,
            token,
            platformVersion: ABOVE_VERSION,
            platformIdentifier: PlatformIdentifier.Opencti,
          }
        );

      // Then
      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.Inactive
      );
      expect(versionBackfillSpy).not.toHaveBeenCalled();
      expect(await loadProvisionedItemIds(platformId)).toEqual([]);
    });

    it('should refresh the connectivity when the backfill fails', async () => {
      // Given
      const { platformId, token } =
        await registerPlatformThenCreateBlogposts(BELOW_VERSION);
      vi.spyOn(
        NewsFeedDomain,
        'provisionLatestBlogpostsToPlatform'
      ).mockRejectedValue(new Error('database unavailable'));
      vi.spyOn(logApp, 'error').mockImplementation(() => logApp);

      // When
      const result =
        await RegistrationConnectivityApp.refreshPlatformRegistrationConnectivityStatus(
          {
            platformId,
            token,
            platformVersion: ABOVE_VERSION,
            platformIdentifier: PlatformIdentifier.Opencti,
          }
        );
      await waitForBackfills(versionBackfillSpy);

      // Then
      expect(result.status).toBe(PlatformRegistrationConnectivityStatus.Active);
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId
        );
      expect(configuration).toMatchObject({
        platform_id: platformId,
        platform_version: ABOVE_VERSION,
      });
      expect(await loadProvisionedItemIds(platformId)).toEqual([]);
    });
  });
});
