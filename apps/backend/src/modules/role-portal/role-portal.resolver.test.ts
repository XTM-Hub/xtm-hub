import { GraphQLError } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import {
  AddSsoGroupRolePortalInput,
  DeleteSsoGroupRolePortalInput,
  PortalCapability,
  SsoGroupRolePortal,
  UpdateSsoGroupRolePortalInput,
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

describe('rolePortals GraphQL query', () => {
  it('should delegate to RolePortalDomain.loadRolePortals and return result', async () => {
    // Given
    const rolePortal = {
      ...ROLE_ADMIN,
      capabilities: [CAPABILITY_BYPASS],
    } as Awaited<ReturnType<typeof RolePortalDomain.loadRolePortals>>[number];
    vi.spyOn(RolePortalDomain, 'loadRolePortals').mockResolvedValue([
      rolePortal,
    ]);

    // When
    const result = await rolePortalResolver.Query!.rolePortals!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RolePortalDomain.loadRolePortals).toHaveBeenCalledWith();
    expect(result).toEqual([rolePortal]);
  });

  it('should map errors with mapToGraphQLError', async () => {
    // Given
    const error = new Error('boom');
    vi.spyOn(RolePortalDomain, 'loadRolePortals').mockRejectedValue(error);
    const mappedError = new GraphQLError('mapped error');
    const mapToGraphQLErrorSpy = vi
      .spyOn(errorMapping, 'mapToGraphQLError')
      .mockReturnValue(mappedError);

    // When
    const result = rolePortalResolver.Query!.rolePortals!(
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

describe('updateSSOGroupRolePortal GraphQL mutation', () => {
  const args = {
    ssoGroup: 'pancake-lovers',
    rolePortal: ROLE_ADMIN.name,
  };
  const input: UpdateSsoGroupRolePortalInput = {
    ssoGroup: 'waffle-lovers',
    rolePortal: ROLE_ADMIN.name,
    capabilities: [PortalCapability.Bypass],
  };

  it('should delegate to RolePortalApp.updateSSOGroupRolePortal and return result', async () => {
    // Given
    vi.spyOn(RolePortalApp, 'updateSSOGroupRolePortal').mockResolvedValue(
      ssoGroupRolePortal
    );

    // When
    const result = await rolePortalResolver.Mutation!.updateSSOGroupRolePortal!(
      {},
      { ...args, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RolePortalApp.updateSSOGroupRolePortal).toHaveBeenCalledWith(
      args,
      input
    );
    expect(result).toEqual(ssoGroupRolePortal);
  });

  it('should map errors with mapToGraphQLError', async () => {
    // Given
    const error = new Error('boom');
    vi.spyOn(RolePortalApp, 'updateSSOGroupRolePortal').mockRejectedValue(
      error
    );
    const mappedError = new GraphQLError('mapped error');
    const mapToGraphQLErrorSpy = vi
      .spyOn(errorMapping, 'mapToGraphQLError')
      .mockReturnValue(mappedError);

    // When
    const result = rolePortalResolver.Mutation!.updateSSOGroupRolePortal!(
      {},
      { ...args, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(result).rejects.toBe(mappedError);
    expect(mapToGraphQLErrorSpy).toHaveBeenCalledWith(error);
  });
});

describe('deleteSSOGroupRolePortal GraphQL mutation', () => {
  const input: DeleteSsoGroupRolePortalInput = {
    ssoGroup: 'pancake-lovers',
    rolePortal: ROLE_ADMIN.name,
  };

  it('should delegate to RolePortalDomain.deleteSSOGroupRolePortal and return result', async () => {
    // Given
    vi.spyOn(RolePortalDomain, 'deleteSSOGroupRolePortal').mockResolvedValue(
      ssoGroupRolePortal
    );

    // When
    const result = await rolePortalResolver.Mutation!.deleteSSOGroupRolePortal!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RolePortalDomain.deleteSSOGroupRolePortal).toHaveBeenCalledWith({
      ssoGroup: input.ssoGroup,
      rolePortalName: input.rolePortal,
    });
    expect(result).toEqual(ssoGroupRolePortal);
  });

  it('should map errors with mapToGraphQLError', async () => {
    // Given
    const error = new Error('boom');
    vi.spyOn(RolePortalDomain, 'deleteSSOGroupRolePortal').mockRejectedValue(
      error
    );
    const mappedError = new GraphQLError('mapped error');
    const mapToGraphQLErrorSpy = vi
      .spyOn(errorMapping, 'mapToGraphQLError')
      .mockReturnValue(mappedError);

    // When
    const result = rolePortalResolver.Mutation!.deleteSSOGroupRolePortal!(
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
