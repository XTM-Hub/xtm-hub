import { GraphQLResolveInfo, Kind, SelectionSetNode } from 'graphql';

/**
 * Whether the resolved field selects the sub-field `name`, directly, through
 * an inline fragment or through a fragment spread.
 */
export const isFieldSelected = (
  info: Pick<GraphQLResolveInfo, 'fieldNodes' | 'fragments'>,
  name: string
): boolean => {
  const visited = new Set<string>();
  const selects = (selectionSet: SelectionSetNode | undefined): boolean =>
    (selectionSet?.selections ?? []).some((selection) => {
      if (selection.kind === Kind.FIELD) {
        return selection.name.value === name;
      }
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        return selects(selection.selectionSet);
      }
      const fragmentName = selection.name.value;
      if (visited.has(fragmentName)) {
        return false;
      }
      visited.add(fragmentName);
      return selects(info.fragments?.[fragmentName]?.selectionSet);
    });
  return (info.fieldNodes ?? []).some((node) => selects(node.selectionSet));
};
