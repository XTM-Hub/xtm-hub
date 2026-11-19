import { ApolloServer } from '@apollo/server';
import { toGlobalId } from 'graphql-relay/node/node.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { contextSimpleUserFiligran2 } from '../../../tests/tests.const';
import { ApiTokenScope } from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { Context } from '../../server/apollo-plugins/log';
import { createApolloServer } from '../../server/apollo-server';
import createSchema from '../../server/graphql-schema';
import { extractId } from '../../utils/utils';
import { ApiTokenApp } from './api-token.app';
import { ApiTokenWithNames } from './api-token.domain';

const TOKEN_ID = 'f7a1c0de-0000-4000-8000-000000000042' as ApiTokenId;

const stored = {
  id: TOKEN_ID,
  name: 'Copilot',
  token_prefix: 'xhp_abcdef',
  scope: ApiTokenScope.Read,
  organization_id: 'org-id',
  organization_name: 'Organization',
  user_email: 'user@example.com',
  expires_at: new Date('2027-01-01T00:00:00Z'),
  last_used_at: null,
  created_at: new Date('2026-11-18T00:00:00Z'),
  revoked_at: null,
} as unknown as ApiTokenWithNames;

describe('api token GraphQL schema', () => {
  const server: ApolloServer<Context> = createApolloServer({
    schema: createSchema(),
    exposeSchemaDetails: false,
  });

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should serve a Relay global id the request context decodes back to the token id', async () => {
    // Given
    vi.spyOn(ApiTokenApp, 'listOwn').mockResolvedValue([stored]);

    // When
    const response = await server.executeOperation(
      { query: '{ apiTokens { id } }' },
      { contextValue: contextSimpleUserFiligran2 }
    );

    // Then
    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    const [{ id }] = (data as { apiTokens: Array<{ id: string }> }).apiTokens;
    // The revoke button sends this id as the top-level $id variable, which the request context runs through extractId
    expect(id).toBe(toGlobalId('ApiToken', TOKEN_ID));
    expect(extractId(id)).toBe(TOKEN_ID);
  });
});
