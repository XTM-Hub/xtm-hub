// Writes apps/frontend/schema.graphql from the backend schema, as the API does when it starts
// (apps/backend/src/index.ts), without starting it: an unattended session cannot run a server.
// Run it in the backend workspace of the checkout to print, wherever this file lives:
//   yarn workspace @xtm-hub/backend tsx <path of this file> [<output>]
// The schema and graphql both load from that workspace: graphql refuses a schema built by
// another copy of itself.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const backend = process.cwd();
const require = createRequire(resolve(backend, 'package.json'));
const { printSchema } = (await import(pathToFileURL(require.resolve('graphql')).href)) as typeof import('graphql');
const schemaModule = (await import(pathToFileURL(resolve(backend, 'src/server/graphql-schema.ts')).href)) as {
  default: () => import('graphql').GraphQLSchema;
};
const out = resolve(backend, process.argv[2] ?? '../frontend/schema.graphql');
writeFileSync(out, printSchema(schemaModule.default()));
