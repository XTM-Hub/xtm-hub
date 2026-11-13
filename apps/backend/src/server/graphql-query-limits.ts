import {
  type ASTVisitor,
  GraphQLError,
  Kind,
  type SelectionSetNode,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';
// The CommonJS build, like graphql-sse: validate() rejects a schema built by another copy of graphql
import { specifiedRules, validate } from 'graphql/index.js';

// The deepest frontend operation has 7 levels and none uses aliases: the margin leaves room for new screens.
export const MAX_QUERY_DEPTH = 10;
export const MAX_QUERY_ALIASES = 10;

interface QueryCost {
  depth: number;
  aliases: number;
}

const NO_COST: QueryCost = { depth: 0, aliases: 0 };

/**
 * Measures an operation with its fragments expanded. Each fragment is measured once, so a fragment spread many times
 * costs nothing more to measure, and a fragment cycle (refused by NoFragmentCyclesRule) counts as empty.
 */
const createCostMeasurer = (context: ValidationContext) => {
  // null while the fragment is being measured, to stop at a cycle
  const fragmentCosts = new Map<string, QueryCost | null>();

  const measureFragment = (name: string): QueryCost => {
    if (fragmentCosts.has(name)) {
      return fragmentCosts.get(name) ?? NO_COST;
    }
    const fragment = context.getFragment(name);
    if (!fragment) {
      return NO_COST;
    }
    fragmentCosts.set(name, null);
    const cost = measureSelectionSet(fragment.selectionSet);
    fragmentCosts.set(name, cost);
    return cost;
  };

  const measureSelectionSet = (selectionSet: SelectionSetNode): QueryCost => {
    let depth = 0;
    let aliases = 0;
    for (const selection of selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        // Introspection and __typename are governed by the introspection settings, not by these limits
        if (selection.name.value.startsWith('__')) {
          continue;
        }
        if (selection.alias) {
          aliases += 1;
        }
        const child = selection.selectionSet
          ? measureSelectionSet(selection.selectionSet)
          : NO_COST;
        depth = Math.max(depth, child.depth + 1);
        aliases += child.aliases;
      } else {
        const child =
          selection.kind === Kind.INLINE_FRAGMENT
            ? measureSelectionSet(selection.selectionSet)
            : measureFragment(selection.name.value);
        depth = Math.max(depth, child.depth);
        aliases += child.aliases;
      }
    }
    return { depth, aliases };
  };

  return measureSelectionSet;
};

export const createQueryLimitsRule =
  ({
    maxDepth,
    maxAliases,
  }: {
    maxDepth: number;
    maxAliases: number;
  }): ValidationRule =>
  (context: ValidationContext): ASTVisitor => {
    const measure = createCostMeasurer(context);
    return {
      OperationDefinition(operation) {
        const { depth, aliases } = measure(operation.selectionSet);
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(
              `Query depth ${depth} exceeds the limit of ${maxDepth}`,
              { nodes: [operation] }
            )
          );
        }
        if (aliases > maxAliases) {
          context.reportError(
            new GraphQLError(
              `Query uses ${aliases} aliases, more than the limit of ${maxAliases}`,
              { nodes: [operation] }
            )
          );
        }
      },
    };
  };

export const QUERY_LIMIT_RULES: ValidationRule[] = [
  createQueryLimitsRule({
    maxDepth: MAX_QUERY_DEPTH,
    maxAliases: MAX_QUERY_ALIASES,
  }),
];

/** Adds the query limits to a graphql-sse `validate`, which runs outside Apollo and its `validationRules`. */
export const withQueryLimitRules =
  (validateFn: typeof validate = validate): typeof validate =>
  (schema, documentAST, rules = specifiedRules, options) =>
    validateFn(schema, documentAST, [...rules, ...QUERY_LIMIT_RULES], options);
