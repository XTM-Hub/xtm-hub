import { resolveGraphqlApiEndpoint } from '@/lib/graphql-client';
import { throwOnGraphqlErrors } from '@/lib/graphql-fetch.utils';

/**
 * Files to send, keyed by the name of the variable they belong to.
 * `{ document: [file] }` fills a `$document: [Upload!]` list variable and
 * `{ document: file }` fills a `$document: Upload` single-file variable.
 */
export type GraphqlUploads = Record<string, File[] | File>;

interface MultipartBody {
  operations: string;
  map: string;
  files: File[];
}

/**
 * Builds the three parts of the GraphQL multipart request specification: the
 * operation with every upload replaced by null, the map pointing each file
 * part at the variable path it belongs to, and the files themselves.
 */
export const buildMultipartBody = (
  query: string,
  variables: Record<string, unknown>,
  uploads: GraphqlUploads
): MultipartBody => {
  const files: File[] = [];
  const map: Record<string, string[]> = {};
  const nulledVariables = { ...variables };

  Object.entries(uploads).forEach(([variableName, variableFiles]) => {
    if (!Array.isArray(variableFiles)) {
      map[String(files.length)] = [`variables.${variableName}`];
      nulledVariables[variableName] = null;
      files.push(variableFiles);
      return;
    }
    if (variableFiles.length === 0) return;
    nulledVariables[variableName] = variableFiles.map(() => null);
    variableFiles.forEach((file, fileIndex) => {
      map[String(files.length)] = [`variables.${variableName}.${fileIndex}`];
      files.push(file);
    });
  });

  return {
    operations: JSON.stringify({ query, variables: nulledVariables }),
    map: JSON.stringify(map),
    files,
  };
};

/**
 * graphql-request serialises every variable as JSON, so a File would reach the
 * API as an empty object. Mutations carrying an upload go through this
 * multipart request instead. It takes the document and variables of any
 * generated mutation, e.g. `requestGraphqlWithUploads<MyMutation,
 * MyMutationVariables>(MyDocument, variables, { document: file })`.
 */
export const requestGraphqlWithUploads = async <
  TData,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  query: string,
  variables: TVariables,
  uploads: GraphqlUploads
): Promise<TData> => {
  const { operations, map, files } = buildMultipartBody(
    query,
    variables,
    uploads
  );

  const formData = new FormData();
  formData.append('operations', operations);
  formData.append('map', map);
  files.forEach((file, index) => formData.append(String(index), file));

  const response = await fetch(resolveGraphqlApiEndpoint(), {
    method: 'POST',
    credentials: 'include',
    // Apollo's CSRF prevention rejects multipart requests without this header.
    headers: { Accept: 'application/json', 'apollo-require-preflight': 'true' },
    body: formData,
  });

  const json = await response.json();
  throwOnGraphqlErrors(json.errors);
  return json.data as TData;
};
