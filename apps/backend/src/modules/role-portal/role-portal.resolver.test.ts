import { GraphQLError } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import {
  AddSsoGroupRolePortalInput,
  PortalCapability,
  SsoGroupRolePortal,
} from '../../__generated__/resolvers-types';
import { CAPABILITY_BYPASS, ROLE_ADMIN } from '../../portal.const';
import * as errorMapping from '../../utils/error/error.mapping';
import { RolePortalApp } from './role-portal.app';
import { RolePortalDomain } from './role-portal.domain';
import rolePortalResolver from './role-portal.resolver';

const ssoGroupRolePortal = {
  ssoGroup: 'pancake-lovers',
  rolePortal: {
    ...ROLE_ADMIN,
    capabilities: [CAPABILITY_BYPASS],
  },
} as SsoGroupRolePortal;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ssoGroupRolePortals GraphQL query', () => {
  it('should delegate to RolePortalDomain.loadSSOGroupRolePortals and return result', async () => {
    // Given
    vi.spyOn(RolePortalDomain, 'loadSSOGroupRolePortals').mockResolvedValue([
      ssoGroupRolePortal,
    ]);

    // When
    const result = await rolePortalResolver.Query!.ssoGroupRolePortals!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RolePortalDomain.loadSSOGroupRolePortals).toHaveBeenCalledWith();
    expect(result).toEqual([ssoGroupRolePortal]);
  });

  it('should map errors with mapToGraphQLError', async () => {
    // Given
    const error = new Error('boom');
    vi.spyOn(RolePortalDomain, 'loadSSOGroupRolePortals').mockRejectedValue(
      error
    );
    const mappedError = new GraphQLError('mapped error');
    const mapToGraphQLErrorSpy = vi
      .spyOn(errorMapping, 'mapToGraphQLError')
      .mockReturnValue(mappedError);

    // When
    const result = rolePortalResolver.Query!.ssoGroupRolePortals!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(result).rejects.toBe(mappedError);
    expect(mapToGraphQLErrorSpy).toHaveBeenCalledWith(error);
  });
});

describe('addSSOGroupRolePortal GraphQL mutation', () => {
  const input: AddSsoGroupRolePortalInput = {
    ssoGroup: 'pancake-lovers',
    rolePortal: ROLE_ADMIN.name,
    capabilities: [PortalCapability.Bypass],
  };

  it('should delegate to RolePortalApp.addSSOGroupRolePortal and return result', async () => {
    // Given
    vi.spyOn(RolePortalApp, 'addSSOGroupRolePortal').mockResolvedValue(
      ssoGroupRolePortal
    );

    // When
    const result = await rolePortalResolver.Mutation!.addSSOGroupRolePortal!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RolePortalApp.addSSOGroupRolePortal).toHaveBeenCalledWith(input);
    expect(result).toEqual(ssoGroupRolePortal);
  });

  it('should map errors with mapToGraphQLError', async () => {
    // Given
    const error = new Error('boom');
    vi.spyOn(RolePortalApp, 'addSSOGroupRolePortal').mockRejectedValue(error);
    const mappedError = new GraphQLError('mapped error');
    const mapToGraphQLErrorSpy = vi
      .spyOn(errorMapping, 'mapToGraphQLError')
      .mockReturnValue(mappedError);

    // When
    const result = rolePortalResolver.Mutation!.addSSOGroupRolePortal!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(result).rejects.toBe(mappedError);
    expect(mapToGraphQLErrorSpy).toHaveBeenCalledWith(error);
  });
});
