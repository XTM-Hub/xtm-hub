import { Kind, type OperationDefinitionNode, parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { ApiTokenScope } from '../../__generated__/resolvers-types';
import { ForbiddenErrorCode } from '../../utils/error/error.code';
import {
  apiTokenOperationRefusal,
  operationRootFields,
} from './api-token.plugin';

const rootFields = (source: string) => {
  const document = parse(source);
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION
  );
  if (!operation) {
    throw new Error('No operation in the document');
  }
  return operationRootFields(operation, document);
};

describe('operationRootFields', () => {
  it('should read the root fields of an operation', () => {
    expect(rootFields('query { settings { platform_url } me { id } }')).toEqual(
      ['settings', 'me']
    );
  });

  it('should read the root fields behind fragment spreads and inline fragments', () => {
    expect(
      rootFields(`
        mutation Hidden { ...Outer ... on Mutation { revokeApiToken(id: "x") { id } } }
        fragment Outer on Mutation { ...Inner }
        fragment Inner on Mutation { logout }
      `)
    ).toEqual(['logout', 'revokeApiToken']);
  });

  it('should read a fragment once and skip an unknown one', () => {
    expect(
      rootFields(`
        mutation { ...F ...F ...Unknown }
        fragment F on Mutation { createApiToken(input: {}) { token } }
      `)
    ).toEqual(['createApiToken']);
  });
});

describe('apiTokenOperationRefusal', () => {
  it.each(Object.values(ApiTokenScope))(
    'should let a %s token run a query',
    (scope) => {
      expect(apiTokenOperationRefusal(scope, 'query', ['me'])).toBeNull();
    }
  );

  it('should refuse any mutation to a read token', () => {
    expect(
      apiTokenOperationRefusal(ApiTokenScope.Read, 'mutation', [
        'revokeApiToken',
      ])
    ).toBe(ForbiddenErrorCode.ReadOnlyApiToken);
  });

  it.each([ApiTokenScope.ReadWrite, ApiTokenScope.Admin])(
    'should let a %s token run a mutation',
    (scope) => {
      expect(
        apiTokenOperationRefusal(scope, 'mutation', ['revokeApiToken'])
      ).toBeNull();
    }
  );

  it.each(['changeSelectedOrganization', 'createApiToken', 'logout'])(
    'should refuse %s to every token, admin included',
    (field) => {
      for (const scope of Object.values(ApiTokenScope)) {
        expect(apiTokenOperationRefusal(scope, 'mutation', ['me', field])).toBe(
          ForbiddenErrorCode.NotAllowedWithApiToken
        );
      }
    }
  );
});
