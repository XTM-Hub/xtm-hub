// Writes apps/frontend/schema.graphql from the backend schema, as the API does when it starts
// (apps/backend/src/index.ts), without starting it: an unattended session cannot run a server.
// Run from the repository root: yarn workspace @xtm-hub/backend tsx ../../rfc-delivery/print-schema.ts
import { writeFileSync } from 'node:fs';
import { printSchema } from 'graphql';
import createSchema from '../apps/backend/src/server/graphql-schema';

const out = process.argv[2] ?? '../frontend/schema.graphql';
writeFileSync(out, printSchema(createSchema()));
