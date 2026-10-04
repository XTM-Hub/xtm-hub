import { ApolloServerPlugin } from '@apollo/server';
import client, { Counter, Gauge, Histogram } from 'prom-client';
import { isRedactedOperation, REDACTED } from './log';

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
      async didResolveOperation({
        request,
        document,
        operationName: operationNameFromParameters,
      }) {
        const { operationName: operationNameFromRequest } = request;
        const clientOperationName =
          operationNameFromRequest ?? operationNameFromParameters;
        if (!clientOperationName) return;
        // Classified like the logs: the name of a Threat Pulse operation is
        // chosen by the client and can carry a hash, so it never becomes a
        // label (nor a new time series per name).
        const operationName = isRedactedOperation(request.query)
          ? REDACTED
          : clientOperationName;

        for (const def of document.definitions) {
          if (def.kind === 'OperationDefinition') {
            const operation = def.operation as keyof typeof operationMapping;
            if (operationMapping[operation]) {
              const operationType = operationMapping[operation](operationName);
              endTimer = graphqlOperationDuration.startTimer({
                operation: operationType,
                name: operationName,
              });
              break;
            }
          }
        }
      },

      async willSendResponse() {
        if (endTimer) {
          endTimer();
        }
      },
    };
  },
};
