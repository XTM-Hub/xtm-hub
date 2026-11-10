import { DocumentNode, Kind, OperationDefinitionNode, parse } from 'graphql';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logApp } from '../../utils/app-logger.util';
import { getRootFieldLabel } from './metrics';

// apps/backend/test.Dockerfile copies this folder so the check also runs in CI
const FRONTEND_OPERATIONS_DIRECTORY = fileURLToPath(
  new URL('../../../../frontend/graphql/', import.meta.url)
);

// One document holds every file, so an operation finds a fragment defined in another file
const FRONTEND_DOCUMENT: DocumentNode = {
  kind: Kind.DOCUMENT,
  definitions: readdirSync(FRONTEND_OPERATIONS_DIRECTORY, {
    recursive: true,
    encoding: 'utf8',
  })
    .filter((file) => file.endsWith('.graphql'))
    .flatMap(
      (file) =>
        parse(readFileSync(join(FRONTEND_OPERATIONS_DIRECTORY, file), 'utf8'))
          .definitions
    ),
};

const FRONTEND_OPERATIONS = FRONTEND_DOCUMENT.definitions.filter(
  (definition): definition is OperationDefinitionNode =>
    definition.kind === Kind.OPERATION_DEFINITION
);

describe('frontend GraphQL operations', () => {
  beforeEach(() => {
    vi.spyOn(logApp, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be found', () => {
    expect(FRONTEND_OPERATIONS.length).toBeGreaterThan(0);
  });

  it('should each get their own metrics label', () => {
    // When
    const operationsCountedAsMultiple = FRONTEND_OPERATIONS.filter(
      (operation) =>
        getRootFieldLabel(FRONTEND_DOCUMENT, operation) === 'multiple'
    ).map((operation) => operation.name?.value);

    // Then
    expect(
      operationsCountedAsMultiple,
      'Add their root fields, sorted and joined with +, to KNOWN_ROOT_FIELD_COMBINATIONS in metrics.ts'
    ).toEqual([]);
  });
});
