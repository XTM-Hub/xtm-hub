import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../tests/tests.const';
import { NodeResolvers } from '../__generated__/resolvers-types';
import createSchema from '../server/graphql-schema';
import nodesResolver from './nodes.resolver';

describe('node GraphQL query', () => {
  it('should not expose a generic node(id) lookup on Query', () => {
    const queryFields = createSchema().getQueryType()!.getFields();
    expect(queryFields).not.toHaveProperty('node');
  });
});

describe('node type resolvers', () => {
  describe('node.id', () => {
    it('should encode id and __typename as a Relay global ID', () => {
      const node = {
        id: uuidv4(),
        __typename: 'Organization',
      } as unknown as Parameters<NonNullable<NodeResolvers['id']>>[0];
      const result = nodesResolver.Node!.id!(
        node,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );
      expect(result).toBe(toGlobalId('Organization', node.id));
    });
  });

  describe('node.__resolveType', () => {
    it('should return the __typename of the node', () => {
      const node = {
        id: uuidv4(),
        __typename: 'ServiceInstance',
      } as unknown as Parameters<NonNullable<NodeResolvers['id']>>[0];
      const result = (nodesResolver.Node as unknown as NodeResolvers)
        .__resolveType!(node, contextSimpleUserFiligran2, GRAPHQL_RESOLVE_INFO);
      expect(result).toBe('ServiceInstance');
    });
  });
});
