import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('graphql-sse', () => ({
  createClient: vi.fn(() => ({ subscribe: vi.fn(), dispose: vi.fn() })),
}));

const loadSseClientModule = async (isServer: boolean) => {
  vi.resetModules();
  vi.doMock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    isServer,
  }));
  return {
    ...(await import('@/lib/sse-client')),
    // Same module registry as sse-client, so the call count is its own.
    createClient: (await import('graphql-sse')).createClient,
  };
};

describe('getSseClient', () => {
  afterEach(() => {
    vi.doUnmock('@tanstack/react-query');
  });

  it('should not create the client until it is first requested', async () => {
    // Given / When
    const { createClient } = await loadSseClientModule(false);

    // Then
    expect(createClient).not.toHaveBeenCalled();
  });

  it('should create the graphql-sse client with singleConnection enabled to multiplex all subscriptions over one SSE connection', async () => {
    // Given
    const { getSseClient, createClient } = await loadSseClientModule(false);

    // When
    getSseClient();

    // Then
    expect(createClient).toHaveBeenCalledWith({
      url: '/graphql-sse',
      singleConnection: true,
    });
  });

  it('should return the same client for the whole browser session', async () => {
    // Given
    const { getSseClient, createClient } = await loadSseClientModule(false);

    // When
    const first = getSseClient();
    const second = getSseClient();

    // Then
    expect(second).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('should throw on the server, where no subscription is ever opened', async () => {
    // Given
    const { getSseClient, createClient } = await loadSseClientModule(true);

    // When / Then
    expect(() => getSseClient()).toThrow(
      'The graphql-sse client is only available in the browser'
    );
    expect(createClient).not.toHaveBeenCalled();
  });
});
