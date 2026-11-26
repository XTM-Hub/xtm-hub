import type { Query } from '@graphql/generated';
import type { QueryKey } from '@tanstack/react-query';

type EdgeOf<TQuery, K extends keyof TQuery> =
  NonNullable<TQuery[K]> extends { edges: Array<infer E> } ? E : never;

type EdgeWithNodeIdOf<TQuery, K extends keyof TQuery> = Extract<
  EdgeOf<TQuery, K>,
  { node: { id: string } }
>;

type NodeOf<TQuery, K extends keyof TQuery> =
  EdgeWithNodeIdOf<TQuery, K> extends { node: infer N } ? N : never;

type Connection<TEdge> =
  | {
      __typename?: string;
      totalCount: number;
      edges: TEdge[];
    }
  | null
  | undefined;

export const prependToQueryCache =
  <TQuery extends object, K extends keyof TQuery & keyof Query>(
    connectionKey: K,
    newEdge: EdgeOf<TQuery, K>
  ) =>
  (previous: TQuery | undefined): TQuery | undefined => {
    if (!previous) return previous;
    const connection = previous[connectionKey] as Connection<EdgeOf<TQuery, K>>;
    if (!connection) return previous;
    return {
      ...previous,
      [connectionKey]: {
        ...connection,
        totalCount: connection.totalCount + 1,
        edges: [newEdge, ...connection.edges],
      },
    };
  };

export const appendToQueryCache =
  <TQuery extends object, K extends keyof TQuery & keyof Query>(
    connectionKey: K,
    newEdge: EdgeOf<TQuery, K>
  ) =>
  (previous: TQuery | undefined): TQuery | undefined => {
    if (!previous) return previous;
    const connection = previous[connectionKey] as Connection<EdgeOf<TQuery, K>>;
    if (!connection) return previous;
    return {
      ...previous,
      [connectionKey]: {
        ...connection,
        totalCount: connection.totalCount + 1,
        edges: [...connection.edges, newEdge],
      },
    };
  };

export const updateInQueryCache =
  <TQuery extends object, K extends keyof TQuery & keyof Query>(
    connectionKey: K,
    updatedNode: NodeOf<TQuery, K> & { id: string }
  ) =>
  (previous: TQuery | undefined): TQuery | undefined => {
    if (!previous) return previous;
    const connection = previous[connectionKey] as Connection<EdgeOf<TQuery, K>>;
    if (!connection) return previous;
    return {
      ...previous,
      [connectionKey]: {
        ...connection,
        edges: connection.edges.map((edge) => {
          const typedEdge = edge as EdgeWithNodeIdOf<TQuery, K>;
          if (typedEdge.node.id !== updatedNode.id) {
            return edge;
          }
          return {
            ...typedEdge,
            node: updatedNode,
          } as EdgeOf<TQuery, K>;
        }),
      },
    };
  };

export const removeFromQueryCache =
  <TQuery extends object, K extends keyof TQuery & keyof Query>(
    connectionKey: K,
    deletedId: string
  ) =>
  (previous: TQuery | undefined): TQuery | undefined => {
    if (!previous) return previous;
    const connection = previous[connectionKey] as Connection<EdgeOf<TQuery, K>>;
    if (!connection) return previous;
    const filteredEdges = connection.edges.filter(
      (edge) => (edge as EdgeWithNodeIdOf<TQuery, K>).node.id !== deletedId
    );
    if (filteredEdges.length === connection.edges.length) return previous;
    return {
      ...previous,
      [connectionKey]: {
        ...connection,
        totalCount: Math.max(connection.totalCount - 1, 0),
        edges: filteredEdges,
      },
    };
  };

export type { QueryKey };
