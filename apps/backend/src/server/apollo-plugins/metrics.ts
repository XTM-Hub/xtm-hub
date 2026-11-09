import { ApolloServerPlugin } from '@apollo/server';
import {
  ExecutionArgs,
  getOperationAST,
  Kind,
  OperationDefinitionNode,
} from 'graphql';
import client, { Counter, Gauge, Histogram } from 'prom-client';

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

export const graphqlOperationDuration = new Histogram({
  name: 'graphql_operation_duration_seconds',
  help: 'Duration of GraphQL operations in seconds',
  labelNames: ['operation', 'name'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
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

// The schema bounds root field names, unlike the operation name the client sends: an unchecked name would add new
// time series to the registry on every request. An alias keeps the real field name.
export const getRootFieldLabel = (operation: OperationDefinitionNode) => {
  const [selection, ...otherSelections] = operation.selectionSet.selections;
  if (selection?.kind !== Kind.FIELD || otherSelections.length > 0) {
    return MULTIPLE_ROOT_FIELDS_LABEL;
  }
  return selection.name.value;
};

// Keyed on the per-request context, so the gauge goes down under the label it went up with
const sseOperationLabels = new WeakMap<object, string>();

// onOperation runs after validation, unlike onSubscribe, which gets the raw request
export const sseOperationMetrics = {
  onOperation(context: object, { document, operationName }: ExecutionArgs) {
    const operation = getOperationAST(document, operationName);
    if (!operation) return;
    const subscription = getRootFieldLabel(operation);
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

export const operationMetricsPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    let endTimer: (() => void) | null = null;

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
      async didResolveOperation({ operation }) {
        if (!operation) return;
        const { operation: operationKind } = operation;
        if (operationKind !== 'query' && operationKind !== 'mutation') return;

        const name = getRootFieldLabel(operation);
        const operationType = operationMapping[operationKind](name);
        endTimer = graphqlOperationDuration.startTimer({
          operation: operationType,
          name,
        });
      },

      async willSendResponse() {
        if (endTimer) {
          endTimer();
        }
      },
    };
  },
};
