import { ApolloServer } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { contextSimpleUserFiligran2 } from '../../../tests/tests.const';
import {
  DocumentStatus,
  IntegrationType,
} from '../../__generated__/resolvers-types';
import { DocumentId } from '../../model/kanel/public/Document';
import { Context } from '../../server/apollo-plugins/log';
import { createApolloServer } from '../../server/apollo-server';
import createSchema from '../../server/graphql-schema';
import { OPENAEV_SCENARIO_DOCUMENT_TYPE } from '../shareable-resource/openaev/scenario/scenario.model';
import { OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE } from '../shareable-resource/opencti/custom-dashboard/custom-dashboard.model';
import { OPENCTI_INTEGRATION_DOCUMENT_TYPE } from '../shareable-resource/opencti/integration/integration.model';
import { DocumentApp } from './document.app';

const NEWEST_DOCUMENTS_QUERY = `{
  newestDocuments(limit: 10) {
    __typename
    active
    status
    children_documents { active status }
  }
}`;

interface NewestDocument {
  __typename: string;
  active: boolean | null;
  status: string;
  children_documents: Array<{ active: boolean | null; status: string }>;
}

describe('document GraphQL schema', () => {
  const server: ApolloServer<Context> = createApolloServer({
    schema: createSchema(),
    exposeSchemaDetails: false,
  });

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  const loadNewestDocuments = async (
    documents: Array<Record<string, unknown>>,
    children: Array<{ status: DocumentStatus }> = []
  ) => {
    vi.spyOn(DocumentApp, 'loadNewestDocuments').mockResolvedValue(
      documents as unknown as Awaited<
        ReturnType<typeof DocumentApp.loadNewestDocuments>
      >
    );
    vi.spyOn(
      contextSimpleUserFiligran2.dataLoaders.document.imagesByDocumentIdLoader,
      'load'
    ).mockResolvedValue(
      children as unknown as Awaited<
        ReturnType<
          typeof contextSimpleUserFiligran2.dataLoaders.document.imagesByDocumentIdLoader.load
        >
      >
    );

    const response = await server.executeOperation(
      { query: NEWEST_DOCUMENTS_QUERY },
      { contextValue: contextSimpleUserFiligran2 }
    );
    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    return (data as { newestDocuments: NewestDocument[] }).newestDocuments;
  };

  it.each`
    typeName             | type                                      | integrationType              | status                         | expectedActive
    ${'CustomDashboard'} | ${OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE} | ${undefined}                 | ${DocumentStatus.Published}    | ${true}
    ${'OpenAEVScenario'} | ${OPENAEV_SCENARIO_DOCUMENT_TYPE}         | ${undefined}                 | ${DocumentStatus.InValidation} | ${false}
    ${'Connector'}       | ${OPENCTI_INTEGRATION_DOCUMENT_TYPE}      | ${IntegrationType.Connector} | ${DocumentStatus.Draft}        | ${false}
    ${'CsvFeed'}         | ${OPENCTI_INTEGRATION_DOCUMENT_TYPE}      | ${IntegrationType.CsvFeed}   | ${DocumentStatus.Published}    | ${true}
  `(
    'should resolve the deprecated active of a $typeName from its $status status',
    async ({
      typeName,
      type,
      integrationType,
      status,
      expectedActive,
    }: {
      typeName: string;
      type: string;
      integrationType?: IntegrationType;
      status: DocumentStatus;
      expectedActive: boolean;
    }) => {
      // Given
      const document = {
        ...TestHelper.document.build({
          id: 'document-id' as DocumentId,
          type,
          status,
        }),
        integration_type: integrationType,
      };

      // When
      const [result] = await loadNewestDocuments([document]);

      // Then
      expect(result).toMatchObject({
        __typename: typeName,
        status,
        active: expectedActive,
      });
    }
  );

  it('should resolve the deprecated active of the children documents from their status', async () => {
    // Given
    const document = TestHelper.document.build({
      id: 'document-id' as DocumentId,
      type: OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE,
    });

    // When
    const [result] = await loadNewestDocuments(
      [document],
      [{ status: DocumentStatus.Published }, { status: DocumentStatus.Draft }]
    );

    // Then
    expect(result?.children_documents).toEqual([
      { status: DocumentStatus.Published, active: true },
      { status: DocumentStatus.Draft, active: false },
    ]);
  });
});
