import {
  type ASTNode,
  type DocumentNode,
  Kind,
  parse,
  print,
  type StringValueNode,
  visit,
} from 'graphql';

export const REDACTED_VALUE = '[REDACTED]';

// Matches the names of values that must never reach a log line: platform and user tokens, passwords, client secrets.
const SECRET_KEY_PATTERN = /token|password|secret/i;

const REDACTED_LITERAL: StringValueNode = {
  kind: Kind.STRING,
  value: REDACTED_VALUE,
};

const isSecretName = (name: string) => SECRET_KEY_PATTERN.test(name);

/**
 * Returns a copy of the value where every property whose name looks like a secret is replaced by `REDACTED_VALUE`,
 * at any depth, so GraphQL variables such as `input.token` or `input.tenants[].token` can be logged safely.
 */
export const redactSecrets = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSecretName(key) ? REDACTED_VALUE : redactSecrets(entry),
    ])
  );
};

const parseOrUndefined = (query: string): DocumentNode | undefined => {
  try {
    return parse(query);
  } catch {
    return undefined;
  }
};

/**
 * Variable names are chosen by the client, so `login(password: $p)` would slip past a name-based filter: a variable
 * is secret when it feeds a secret argument or input field, wherever it sits in that value.
 */
const collectSecretVariables = (document: DocumentNode): Set<string> => {
  const secretVariables = new Set<string>();
  const collectVariables = (value: ASTNode) =>
    visit(value, {
      Variable: (variable) => {
        secretVariables.add(variable.name.value);
      },
    });
  visit(document, {
    Argument: (argument) => {
      if (isSecretName(argument.name.value)) {
        collectVariables(argument.value);
      }
    },
    ObjectField: (field) => {
      if (isSecretName(field.name.value)) {
        collectVariables(field.value);
      }
    },
  });
  return secretVariables;
};

// Replaces the secrets written inline in the document: argument and input field literals, variable default values.
const redactDocument = (
  document: DocumentNode,
  secretVariables: Set<string>
): DocumentNode =>
  visit(document, {
    Argument: (argument) =>
      isSecretName(argument.name.value) && argument.value.kind !== Kind.VARIABLE
        ? { ...argument, value: REDACTED_LITERAL }
        : undefined,
    ObjectField: (field) =>
      isSecretName(field.name.value) && field.value.kind !== Kind.VARIABLE
        ? { ...field, value: REDACTED_LITERAL }
        : undefined,
    VariableDefinition: (definition) =>
      definition.defaultValue &&
      secretVariables.has(definition.variable.name.value)
        ? { ...definition, defaultValue: REDACTED_LITERAL }
        : undefined,
  });

const redactEveryValue = (variables: unknown): unknown =>
  variables && typeof variables === 'object' && !Array.isArray(variables)
    ? Object.fromEntries(
        Object.keys(variables).map((key) => [key, REDACTED_VALUE])
      )
    : variables;

const redactVariables = (
  variables: unknown,
  secretVariables: Set<string>
): unknown =>
  variables && typeof variables === 'object' && !Array.isArray(variables)
    ? Object.fromEntries(
        Object.entries(variables).map(([key, value]) => [
          key,
          secretVariables.has(key) || isSecretName(key)
            ? REDACTED_VALUE
            : redactSecrets(value),
        ])
      )
    : redactSecrets(variables);

/**
 * Returns the query and variables of a GraphQL request with every secret redacted, keeping the other values readable.
 * When the query is missing (persisted query hash) or does not parse, the secret variables cannot be told apart: the
 * query is dropped and every variable value is redacted.
 */
export const redactGraphQLRequest = ({
  query,
  variables,
}: {
  query?: string;
  variables: unknown;
}): { query?: string; variables: unknown } => {
  const document = query ? parseOrUndefined(query) : undefined;
  if (!document) {
    return { query: undefined, variables: redactEveryValue(variables) };
  }
  const secretVariables = collectSecretVariables(document);
  const redactedDocument = redactDocument(document, secretVariables);
  return {
    // `visit` returns the same node when nothing was edited: keep the query as the client wrote it.
    query: redactedDocument === document ? query : print(redactedDocument),
    variables: redactVariables(variables, secretVariables),
  };
};
