import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getErrorNumberProperty,
  isErrorLikeRecord,
} from '../../utils/error/error-guard.util';
import { esDbClient } from './client';
import { withIndexPrefix } from './index-prefix';

// Run against a real Elasticsearch by `yarn test:es` (the "Elasticsearch
// tests" CI job, once per Elasticsearch major), skipped everywhere else
const describeEs = describe.runIf(process.env.RUN_ES_TESTS === 'true');

// Set by the CI job to the client its Elasticsearch major must get
const EXPECTED_CLIENT = process.env.ES_TESTS_EXPECTED_CLIENT;

const TEST_INDEX = withIndexPrefix('client-es-tests');
const DOCUMENT_ID = 'document-1';
const DOCUMENT_NAME = 'first';
const DOCUMENT_VALUE = 10;
const UPDATED_VALUE = 20;

interface TestDocument {
  name: string;
  value: number;
}

const makeDocument = (name: string, value: number): TestDocument => ({
  name,
  value,
});

const statusCodeOf = (error: unknown): number | undefined =>
  isErrorLikeRecord(error)
    ? (getErrorNumberProperty(error, 'statusCode') ??
      getErrorNumberProperty(error.meta, 'statusCode'))
    : undefined;

describeEs('ElasticSearchService against a real Elasticsearch', () => {
  beforeAll(async () => {
    await esDbClient.init();
  });

  // Every test starts from an empty test index
  beforeEach(async () => {
    await esDbClient
      .getIndices()
      .delete({ index: TEST_INDEX, ignore_unavailable: true });
    await esDbClient.getIndices().create({
      index: TEST_INDEX,
      mappings: {
        properties: {
          name: { type: 'keyword' },
          value: { type: 'integer' },
        },
      },
    });
  });

  afterAll(async () => {
    await esDbClient
      .getIndices()
      .delete({ index: TEST_INDEX, ignore_unavailable: true });
  });

  it.runIf(EXPECTED_CLIENT)(
    'should select the client of the Elasticsearch major when detecting the engine',
    async () => {
      // Given
      // the engine of the CI job, ELASTIC_ENGINE_CLIENT unset

      // When
      const decision = await esDbClient.init();

      // Then
      expect(decision).toMatchObject({
        client: EXPECTED_CLIENT,
        source: 'detection',
      });
    }
  );

  it('should find a document when it was indexed', async () => {
    // Given
    const document = makeDocument(DOCUMENT_NAME, DOCUMENT_VALUE);
    await esDbClient.index({
      index: TEST_INDEX,
      id: DOCUMENT_ID,
      document,
      refresh: true,
    });

    // When
    const documents = await esDbClient.simpleSearch<TestDocument>({
      index: TEST_INDEX,
      query: { term: { name: DOCUMENT_NAME } },
      size: 10,
    });

    // Then
    expect(documents).toEqual([document]);
  });

  it('should refuse with a 409 when creating a document that already exists', async () => {
    // Given
    const document = makeDocument(DOCUMENT_NAME, DOCUMENT_VALUE);
    await esDbClient.create({
      index: TEST_INDEX,
      id: DOCUMENT_ID,
      document,
      refresh: true,
    });

    // When
    const error = await esDbClient
      .create({ index: TEST_INDEX, id: DOCUMENT_ID, document, refresh: true })
      .catch((cause: unknown) => cause);

    // Then: the ES migration lock relies on this status code
    expect(statusCodeOf(error)).toBe(409);
  });

  it('should refuse with a 404 when searching an index that does not exist', async () => {
    // Given
    const missingIndex = withIndexPrefix('client-es-tests-missing');

    // When
    const error = await esDbClient
      .simpleSearch({ index: missingIndex, size: 10 })
      .catch((cause: unknown) => cause);

    // Then: the ES migration state store relies on this status code
    expect(statusCodeOf(error)).toBe(404);
  });

  it('should count the documents when they match the query', async () => {
    // Given
    await esDbClient.bulk({
      refresh: true,
      operations: [
        { index: { _index: TEST_INDEX } },
        makeDocument(DOCUMENT_NAME, DOCUMENT_VALUE),
        { index: { _index: TEST_INDEX } },
        makeDocument(DOCUMENT_NAME, UPDATED_VALUE),
        { index: { _index: TEST_INDEX } },
        makeDocument('other', DOCUMENT_VALUE),
      ],
    });

    // When
    const count = await esDbClient.count({
      index: TEST_INDEX,
      query: { term: { name: DOCUMENT_NAME } },
    });

    // Then
    expect(count).toBe(2);
  });

  it('should change the matching documents when updating by query', async () => {
    // Given
    await esDbClient.index({
      index: TEST_INDEX,
      id: DOCUMENT_ID,
      document: makeDocument(DOCUMENT_NAME, DOCUMENT_VALUE),
      refresh: true,
    });

    // When
    await esDbClient.updateByQuery({
      index: TEST_INDEX,
      query: { term: { name: DOCUMENT_NAME } },
      script: {
        source: 'ctx._source.value = params.value',
        params: { value: UPDATED_VALUE },
      },
      refresh: true,
    });

    // Then
    const documents = await esDbClient.simpleSearch<TestDocument>({
      index: TEST_INDEX,
      size: 10,
    });
    expect(documents).toEqual([makeDocument(DOCUMENT_NAME, UPDATED_VALUE)]);
  });

  it('should remove the matching documents when deleting by query', async () => {
    // Given
    await esDbClient.bulk({
      refresh: true,
      operations: [
        { index: { _index: TEST_INDEX } },
        makeDocument(DOCUMENT_NAME, DOCUMENT_VALUE),
        { index: { _index: TEST_INDEX } },
        makeDocument('other', DOCUMENT_VALUE),
      ],
    });

    // When
    await esDbClient.deleteByQuery({
      index: TEST_INDEX,
      query: { term: { name: DOCUMENT_NAME } },
      refresh: true,
    });

    // Then
    const documents = await esDbClient.simpleSearch<TestDocument>({
      index: TEST_INDEX,
      size: 10,
    });
    expect(documents).toEqual([makeDocument('other', DOCUMENT_VALUE)]);
  });

  it('should remove a document when deleting it by id', async () => {
    // Given
    await esDbClient.index({
      index: TEST_INDEX,
      id: DOCUMENT_ID,
      document: makeDocument(DOCUMENT_NAME, DOCUMENT_VALUE),
      refresh: true,
    });

    // When
    await esDbClient.delete({
      index: TEST_INDEX,
      id: DOCUMENT_ID,
      refresh: true,
    });

    // Then
    const count = await esDbClient.count({ index: TEST_INDEX });
    expect(count).toBe(0);
  });
});
