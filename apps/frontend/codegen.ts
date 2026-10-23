import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: './schema.graphql',
  documents: ['graphql/**/*.graphql', 'graphql/**/*.gql'],
  ignoreNoDocuments: true,
  generates: {
    'graphql/generated.ts': {
      hooks: {
        afterOneFileWrite: ['node scripts/postprocess-codegen.mjs'],
      },
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-query',
      ],
      config: {
        fetcher: 'graphql-request',
        exposeQueryKeys: true,
        exposeMutationKeys: true,
        exposeFetcher: true,
        addInfiniteQuery: true,
        reactQueryVersion: 5,
        avoidOptionals: true,
      },
    },
    'graphql/mocks.ts': {
      plugins: ['typescript-mock-data'],
      config: {
        typesFile: './generated.ts',
        addTypename: true,
        terminateCircularRelationships: true,
        prefix: 'mock',
      },
    },
  },
};

export default config;
