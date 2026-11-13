import { isServer } from '@tanstack/react-query';
import { Client, createClient } from 'graphql-sse';

let browserSseClient: Client<true> | undefined;

/**
 * The one graphql-sse client of the browser session, shared by every
 * subscription of the page. `singleConnection` multiplexes them all over a
 * single SSE connection.
 *
 * Browser only: a subscription is a live connection held by the page, the
 * server has no use for one.
 */
export const getSseClient = (): Client<true> => {
  if (isServer) {
    throw new Error('The graphql-sse client is only available in the browser');
  }
  browserSseClient ??= createClient({
    url: '/graphql-sse',
    singleConnection: true,
  });
  return browserSseClient;
};
