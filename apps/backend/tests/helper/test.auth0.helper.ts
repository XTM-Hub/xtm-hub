import { ManagementError } from 'auth0';

type RawResponse = NonNullable<
  ConstructorParameters<typeof ManagementError>[0]
>['rawResponse'];

const rawResponse = (
  status: number,
  headers: Record<string, string> = {}
): NonNullable<RawResponse> => ({
  headers: new Headers(headers),
  redirected: false,
  status,
  statusText: '',
  type: 'basic',
  url: 'https://filigran.eu.auth0.com/api/v2/users',
});

export const TestAuth0Helper = {
  auth0: {
    rawResponse,
    managementError: (
      statusCode: number,
      headers: Record<string, string> = {}
    ) =>
      new ManagementError({
        message: 'Auth0 error',
        statusCode,
        body: {},
        rawResponse: rawResponse(statusCode, headers),
      }),
  },
};
