import { FieldNode, GraphQLResolveInfo, Kind, SelectionSetNode } from 'graphql';

type SelectionInfo = Pick<GraphQLResolveInfo, 'fieldNodes' | 'fragments'>;

/**
 * Fields of a selection set, selected directly, through an inline fragment or
 * through a fragment spread.
 */
const collectFields = (
  info: SelectionInfo,
  selectionSet: SelectionSetNode | undefined,
  visited = new Set<string>()
): FieldNode[] =>
  (selectionSet?.selections ?? []).flatMap((selection) => {
    if (selection.kind === Kind.FIELD) {
      return [selection];
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return collectFields(info, selection.selectionSet, visited);
    }
    const fragmentName = selection.name.value;
    if (visited.has(fragmentName)) {
      return [];
    }
    visited.add(fragmentName);
    return collectFields(
      info,
      info.fragments?.[fragmentName]?.selectionSet,
      visited
    );
  });

/**
 * Names of the fields selected under the sub-field `name` of the resolved
 * field, fragments included, each name once; empty when `name` is not selected.
 */
export const selectedSubFieldNames = (
  info: SelectionInfo,
  name: string
): string[] => [
  ...new Set(
    (info.fieldNodes ?? [])
      .flatMap((node) => collectFields(info, node.selectionSet))
      .filter((field) => field.name.value === name)
      .flatMap((field) => collectFields(info, field.selectionSet))
      .map((field) => field.name.value)
  ),
];
