import type { ExecutionPatchResult, ExecutionResult } from 'graphql-sse';
// The CommonJS build, like graphql-sse: validate() rejects a schema built by another copy of graphql
import {
  GraphQLError,
  NoSchemaIntrospectionCustomRule,
  specifiedRules,
  validate,
} from 'graphql/index.js';

// Linear on purpose: the message can echo a client-controlled literal, so a regex here would be a ReDoS vector
export const removeSuggestionHint = (message: string) => {
  if (!message.endsWith('?')) {
    return message;
  }
  const hintStart = message.lastIndexOf('Did you mean');
  if (
    hintStart === -1 ||
    message.indexOf('?', hintStart) !== message.length - 1
  ) {
    return message;
  }
  return message.slice(0, hintStart).trimEnd();
};

const scrubGraphQLError = (error: GraphQLError) => {
  const message = removeSuggestionHint(error.message);
  if (message === error.message) {
    return error;
  }
  return new GraphQLError(message, {
    nodes: error.nodes,
    source: error.source,
    positions: error.positions,
    path: error.path,
    originalError: error.originalError,
    extensions: error.extensions,
  });
};

const validateWithoutSchemaDetails: typeof validate = (
  schema,
  documentAST,
  rules = specifiedRules,
  options
) =>
  validate(
    schema,
    documentAST,
    [...rules, NoSchemaIntrospectionCustomRule],
    options
  ).map(scrubGraphQLError);

const scrubExecutionResult = (
  result: ExecutionResult | ExecutionPatchResult
) => {
  if (!result.errors) {
    return result;
  }
  return {
    ...result,
    errors: result.errors.map(scrubGraphQLError),
  };
};

// graphql-sse runs outside Apollo: its validation and execution errors reach the client as they are
export const createSseSchemaDetailsOptions = (exposeSchemaDetails: boolean) =>
  exposeSchemaDetails
    ? {}
    : {
        validate: validateWithoutSchemaDetails,
        onNext: (
          _ctx: unknown,
          _req: unknown,
          result: ExecutionResult | ExecutionPatchResult
        ) => scrubExecutionResult(result),
      };
