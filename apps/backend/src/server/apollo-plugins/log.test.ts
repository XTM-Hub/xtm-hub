import type { GraphQLRequestContext } from '@apollo/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLogsCategory, logApp } from '../../utils/app-logger.util';
import { REDACTED_VALUE } from '../../utils/redact-secrets.util';
import { type Context, errorLoggingPlugin } from './log';

const REFRESH_VARIABLES = {
  input: {
    platformId: 'c9e8fee1-8cb4-4fff-b335-5ea350615df4',
    token: 'b6a1d0c2-3f4e-4a5b-9c8d-7e6f5a4b3c2d',
    platformVersion: '6.9.0',
  },
};

const buildRequestContext = (variables: unknown) =>
  ({
    request: {
      operationName: 'RefreshPlatformRegistrationConnectivityStatus',
      query: 'mutation { refreshPlatformRegistrationConnectivityStatus }',
    },
    contextValue: { req: { body: { variables } } },
  }) as unknown as GraphQLRequestContext<Context>;

describe('errorLoggingPlugin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the GraphQL variables with their secrets redacted', async () => {
    // Given
    const infoSpy = vi.spyOn(logApp, 'info').mockImplementation(() => {});

    // When
    await errorLoggingPlugin().requestDidStart!(
      buildRequestContext(REFRESH_VARIABLES)
    );

    // Then
    expect(infoSpy).toHaveBeenCalledWith(
      'GraphQL request received',
      expect.objectContaining({
        variables: {
          input: { ...REFRESH_VARIABLES.input, token: REDACTED_VALUE },
        },
      }),
      AppLogsCategory.GRAPHQL
    );
  });

  it('logs the GraphQL variables with their secrets redacted on errors', async () => {
    // Given
    vi.spyOn(logApp, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {});
    const requestContext = buildRequestContext(REFRESH_VARIABLES);
    const listener =
      await errorLoggingPlugin().requestDidStart!(requestContext);

    // When
    await listener!.didEncounterErrors!({
      ...requestContext,
      errors: [{ message: 'Invalid token provided', originalError: null }],
    } as unknown as Parameters<
      NonNullable<typeof listener.didEncounterErrors>
    >[0]);

    // Then
    expect(errorSpy).toHaveBeenCalledWith(
      'Invalid token provided',
      expect.objectContaining({
        variables: {
          input: { ...REFRESH_VARIABLES.input, token: REDACTED_VALUE },
        },
      }),
      AppLogsCategory.GRAPHQL
    );
  });
});
