import { ApolloServerPlugin } from '@apollo/server';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { isInstance as isCustomApolloError } from 'apollo-errors';
import {
  DocumentNode,
  ExecutionArgs,
  FragmentDefinitionNode,
  getOperationAST,
  GraphQLError,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';
import client, { Counter, Gauge, Histogram } from 'prom-client';
import { AppLogsCategory, logApp } from '../../utils/app-logger.util';
import { isClientErrorCode } from '../../utils/error/error.mapping';
import { CustomApolloError } from '../../utils/error/error.type';
import { REQUEST_DURATION_BUCKETS_SECONDS } from '../metrics.const';

export const registry = client.register;

client.collectDefaultMetrics();

export const graphqlMutationCounter = new Counter({
  name: 'graphql_mutation_total',
  help: 'Total number of GraphQL mutations called on XTM Hub',
  labelNames: ['mutation'],
});

export const graphqlQueryCounter = new Counter({
  name: 'graphql_query_total',
  help: 'Total number of GraphQL queries called on XTM Hub',
  labelNames: ['query'],
});

export const OPERATION_RESULT = {
  success: 'success',
  clientError: 'client_error',
  serverError: 'server_error',
} as const;

export const graphqlOperationDuration = new Histogram({
  name: 'graphql_operation_duration_seconds',
  help: 'Duration of GraphQL operations in seconds',
  labelNames: ['operation', 'name', 'result'],
  buckets: REQUEST_DURATION_BUCKETS_SECONDS,
});

export const sseSubscriptionCounter = new Counter({
  name: 'sse_subscription_total',
  help: 'Total number of GraphQL subscriptions called on XTM Hub',
  labelNames: ['subscription'],
});
export const sseMessageCounter = new Counter({
  name: 'sse_message_total',
  help: 'Total number of SSE message sent by XTM Hub',
  labelNames: ['subscription'],
});
export const sseActiveConnectionsGauge = new Gauge({
  name: 'sse_active_connections',
  help: 'Total number of active sse connections on XTM Hub',
  labelNames: ['subscription'],
});

const MULTIPLE_ROOT_FIELDS_LABEL = 'multiple';
const ROOT_FIELD_COMBINATION_SEPARATOR = '+';

// Root fields the frontend groups in one request, sorted, so each call keeps its own series. Joining any combination
// would let a client create series without limit; a combination missing here is counted as multiple.
const KNOWN_ROOT_FIELD_COMBINATIONS = new Set([
  'contentTranslationDrafts+contentTranslations',
  'currentVotingRound+me',
]);

const collectFieldNames = (
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  visitedFragments: Set<string>,
  fieldNames: Set<string>
) => {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      fieldNames.add(selection.name.value);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectFieldNames(
        selection.selectionSet,
        fragments,
        visitedFragments,
        fieldNames
      );
    } else {
      const fragmentName = selection.name.value;
      const fragment = fragments.get(fragmentName);
      if (!fragment || visitedFragments.has(fragmentName)) continue;
      visitedFragments.add(fragmentName);
      collectFieldNames(
        fragment.selectionSet,
        fragments,
        visitedFragments,
        fieldNames
      );
    }
  }
};

// The schema bounds root field names, unlike the operation name the client sends: an unchecked name would add new
// time series to the registry on every request. An alias keeps the real field name; a fragment counts by its fields.
export const getRootFieldLabel = (
  document: DocumentNode,
  operation: OperationDefinitionNode
) => {
  const fragments = new Map(
    document.definitions
      .filter(
        (definition): definition is FragmentDefinitionNode =>
          definition.kind === Kind.FRAGMENT_DEFINITION
      )
      .map((fragment) => [fragment.name.value, fragment])
  );
  const fieldNames = new Set<string>();
  collectFieldNames(operation.selectionSet, fragments, new Set(), fieldNames);
  const [fieldName, ...otherFieldNames] = fieldNames;
  if (fieldName && otherFieldNames.length === 0) {
    return fieldName;
  }
  const sortedFieldNames = [...fieldNames].sort();
  const combination = sortedFieldNames.join(ROOT_FIELD_COMBINATION_SEPARATOR);
  if (KNOWN_ROOT_FIELD_COMBINATIONS.has(combination)) {
    return combination;
  }
  // The metric cannot hold the combination, the log tells which one to add to the list
  logApp.warn(
    'GraphQL operation counted as multiple',
    { rootFields: sortedFieldNames },
    AppLogsCategory.GRAPHQL
  );
  return MULTIPLE_ROOT_FIELDS_LABEL;
};

// Keyed on the per-request context, so the gauge goes down under the label it went up with
const sseOperationLabels = new WeakMap<object, string>();

// onOperation runs after validation, unlike onSubscribe, which gets the raw request
export const sseOperationMetrics = {
  onOperation(context: object, { document, operationName }: ExecutionArgs) {
    const operation = getOperationAST(document, operationName);
    if (!operation) return;
    const subscription = getRootFieldLabel(document, operation);
    sseOperationLabels.set(context, subscription);
    sseSubscriptionCounter.inc({ subscription });
    sseActiveConnectionsGauge.inc({ subscription });
  },
  onNext(context: object) {
    const subscription = sseOperationLabels.get(context);
    if (!subscription) return;
    sseMessageCounter.inc({ subscription });
  },
  onComplete(context: object) {
    const subscription = sseOperationLabels.get(context);
    if (!subscription) return;
    sseActiveConnectionsGauge.dec({ subscription });
    sseOperationLabels.delete(context);
  },
};

// Client errors are the typed ones below 500 and the codes mapToGraphQLError maps to them; anything else is a server
// error. The resolver's error is read directly: unwrapResolverError's instanceof fails when two copies of graphql load.
// Not isClientSafeError from apollo-server.ts: that one tells which message a client may read, and lets through the
// unknown errors, which are the server's fault. The only request error left once the timer runs is a variable that
// fails coercion, parsing and validation failing before the operation resolves.
const isClientError = (error: GraphQLError) => {
  if (
    !error.path &&
    error.extensions?.code === ApolloServerErrorCode.BAD_USER_INPUT
  ) {
    return true;
  }
  const originalError =
    error.path && error.originalError ? error.originalError : error;
  if (isCustomApolloError(originalError)) {
    const httpStatus = (originalError as CustomApolloError).data?.http_status;
    return httpStatus !== undefined && httpStatus < 500;
  }
  return (
    originalError instanceof Error && isClientErrorCode(originalError.message)
  );
};

export const operationMetricsPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    let endTimer: ((labels: { result: string }) => void) | null = null;
    let result: string = OPERATION_RESULT.success;

    const operationMapping = {
      mutation: (name: string) => {
        graphqlMutationCounter.inc({ mutation: name });
        return 'mutation';
      },
      query: (name: string) => {
        graphqlQueryCounter.inc({ query: name });
        return 'query';
      },
    } as const;

    return {
      async didResolveOperation({ document, operation }) {
        if (!operation) return;
        const { operation: operationKind } = operation;
        if (operationKind !== 'query' && operationKind !== 'mutation') return;

        const name = getRootFieldLabel(document, operation);
        const operationType = operationMapping[operationKind](name);
        endTimer = graphqlOperationDuration.startTimer({
          operation: operationType,
          name,
        });
      },

      // A GraphQL error is answered with HTTP 200: only the error tells a failed operation
      async didEncounterErrors({ errors }) {
        result = errors.every(isClientError)
          ? OPERATION_RESULT.clientError
          : OPERATION_RESULT.serverError;
      },

      async willSendResponse() {
        if (endTimer) {
          endTimer({ result });
        }
      },
    };
  },
};
