import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadDocumentsMock,
  loadServiceDefinitionByServiceInstanceMock,
  loadOrganizationByMock,
  sendTelemetryEventMock,
  useCasesByDocumentIdLoaderLoadManyMock,
  solutionCategoriesByDocumentIdLoaderLoadManyMock,
  requestContextUpdateMock,
} = vi.hoisted(() => ({
  loadDocumentsMock: vi.fn(),
  loadServiceDefinitionByServiceInstanceMock: vi.fn(),
  loadOrganizationByMock: vi.fn(),
  sendTelemetryEventMock: vi.fn(),
  useCasesByDocumentIdLoaderLoadManyMock: vi.fn(),
  solutionCategoriesByDocumentIdLoaderLoadManyMock: vi.fn(),
  requestContextUpdateMock: vi.fn(),
}));

vi.mock('../../../document/document.app', () => ({
  DocumentApp: { loadDocuments: loadDocumentsMock },
}));
vi.mock('../../../document/document.dataloader', () => ({
  DocumentDataLoader: {
    create: () => ({
      useCasesByDocumentIdLoader: {
        loadMany: useCasesByDocumentIdLoaderLoadManyMock,
      },
      solutionCategoriesByDocumentIdLoader: {
        loadMany: solutionCategoriesByDocumentIdLoaderLoadManyMock,
      },
    }),
  },
}));
vi.mock('../../../service/instance/service-instance.domain', () => ({
  ServiceInstanceDomain: {
    loadServiceDefinitionByServiceInstance:
      loadServiceDefinitionByServiceInstanceMock,
  },
}));
vi.mock(
  '../../../organization-management/organization/organization.domain',
  () => ({
    OrganizationDomain: { loadOrganizationBy: loadOrganizationByMock },
  })
);
vi.mock('../../../telemetry/telemetry.app', () => ({
  TelemetryApp: { sendTelemetryEvent: sendTelemetryEventMock },
}));
vi.mock('../../../../context/request.context', () => ({
  requestContext: { update: requestContextUpdateMock },
}));
vi.mock('../../../../utils/app-logger.util', () => ({
  logApp: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { ServiceDefinitionIdentifier } from '../../../../__generated__/resolvers-types';
import { IntegrationCsvExportEndpoint } from './integration-csv-export-endpoint';

const buildResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
});

const buildRequest = (
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
  user: Record<string, unknown> | null = {
    id: 'user-1',
    selected_organization_id: 'org-1',
  }
) =>
  ({
    params,
    query,
    session: { user: user ?? undefined },
  }) as unknown as Request;

const VALID_PARAMS = { serviceInstanceId: 'U2VydmljZUluc3RhbmNlOnNlcnZpY2Ux' };

const INTEGRATIONS_SERVICE_DEFINITION = {
  id: 'sd-1',
  identifier: ServiceDefinitionIdentifier.OpenctiIntegrations,
};

const OTHER_SERVICE_DEFINITION = {
  id: 'sd-2',
  identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
};

const buildDocumentEdge = (overrides: Record<string, unknown> = {}) => ({
  node: {
    id: 'doc-1',
    name: 'My Integration',
    integration_type: 'connector',
    manager_supported: true,
    verified: true,
    license_type: 'Apache 2.0',
    ...overrides,
  },
});

describe('integrationCsvExportEndpoint.exportCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadServiceDefinitionByServiceInstanceMock.mockResolvedValue(
      INTEGRATIONS_SERVICE_DEFINITION
    );
    loadDocumentsMock.mockResolvedValue({ edges: [] });
    useCasesByDocumentIdLoaderLoadManyMock.mockResolvedValue([]);
    solutionCategoriesByDocumentIdLoaderLoadManyMock.mockResolvedValue([]);
    loadOrganizationByMock.mockResolvedValue({ id: 'org-1' });
    sendTelemetryEventMock.mockResolvedValue(undefined);
  });

  it('returns 401 when the user is not logged in', async () => {
    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS, {}, null),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(loadServiceDefinitionByServiceInstanceMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the service instance does not exist', async () => {
    loadServiceDefinitionByServiceInstanceMock.mockResolvedValue(undefined);

    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(loadDocumentsMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the service instance is not the integrations library', async () => {
    loadServiceDefinitionByServiceInstanceMock.mockResolvedValue(
      OTHER_SERVICE_DEFINITION
    );

    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(loadDocumentsMock).not.toHaveBeenCalled();
  });

  it('downloads a header-only CSV when there are no integrations', async () => {
    loadDocumentsMock.mockResolvedValue({ edges: [] });

    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8'
    );
    const [csv] = res.send.mock.calls[0];
    expect(csv).toContain('Name,Integration type');
    expect(csv.trim().split('\r\n')).toHaveLength(1);
  });

  it('builds one CSV row per integration, including use cases and solution categories', async () => {
    loadDocumentsMock.mockResolvedValue({
      edges: [buildDocumentEdge({ id: 'doc-1', name: 'My Integration' })],
    });
    useCasesByDocumentIdLoaderLoadManyMock.mockResolvedValue([
      [{ name: 'Threat Intel' }],
    ]);
    solutionCategoriesByDocumentIdLoaderLoadManyMock.mockResolvedValue([
      [{ name: 'Detection' }],
    ]);

    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const [csv] = res.send.mock.calls[0];
    expect(csv).toContain('My Integration');
    expect(csv).toContain('Threat Intel');
    expect(csv).toContain('Detection');
    expect(csv).toContain('Verified');
  });

  it('sets a Content-Disposition header with the expected filename format', async () => {
    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS),
      res as unknown as Response
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringMatching(
        /^attachment; filename="integrations-library-export-\d{4}-\d{2}-\d{2}\.csv"$/
      )
    );
  });

  it('sends a telemetry export event with the export format', async () => {
    loadDocumentsMock.mockResolvedValue({
      edges: [buildDocumentEdge(), buildDocumentEdge({ id: 'doc-2' })],
    });
    useCasesByDocumentIdLoaderLoadManyMock.mockResolvedValue([[], []]);
    solutionCategoriesByDocumentIdLoaderLoadManyMock.mockResolvedValue([
      [],
      [],
    ]);

    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS, { columns: 'integration_type,license_type' }),
      res as unknown as Response
    );

    expect(sendTelemetryEventMock).toHaveBeenCalledTimes(1);
    const [event] = sendTelemetryEventMock.mock.calls[0];
    expect(event).toMatchObject({
      event_type: 'export',
      export_format: 'csv',
    });
  });

  it('does not fail the download when telemetry sending throws', async () => {
    sendTelemetryEventMock.mockRejectedValue(new Error('telemetry down'));

    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });

  it('returns 500 when loading the documents fails', async () => {
    loadDocumentsMock.mockRejectedValue(new Error('database down'));

    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest(VALID_PARAMS),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 400 when the serviceInstanceId param is missing', async () => {
    const res = buildResponse();
    await IntegrationCsvExportEndpoint.exportCsv(
      buildRequest({}),
      res as unknown as Response
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(loadServiceDefinitionByServiceInstanceMock).not.toHaveBeenCalled();
  });
});
