import { toGlobalId } from 'graphql-relay/node/node.js';
import { Resolvers } from '../__generated__/resolvers-types';

const resolvers: Resolvers = {
  Node: {
    id: (node) =>
      node.__typename ? toGlobalId(node.__typename, node.id) : node.id,
    __resolveType: (node) => {
      return node.__typename;
    },
  },
};

export default resolvers;
