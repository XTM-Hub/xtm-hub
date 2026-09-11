import cors from 'cors';
import { Application, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  DocumentOrdering,
  OrderingMode,
  ServiceDefinitionIdentifier,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { OrganizationId } from '../../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import { UserId } from '../../../../model/kanel/public/User';
import { logApp } from '../../../../utils/app-logger.util';
import { extractId } from '../../../../utils/utils';
import { DocumentApp } from '../../../document/document.app';
import { DocumentDataLoader } from '../../../document/document.dataloader';
import { OrganizationDomain } from '../../../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../../../service/instance/service-instance.domain';
import { TelemetryApp } from '../../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../../telemetry/telemetry.helper';
import {
  buildIntegrationsCsv,
  buildIntegrationsExportFilename,
  IntegrationCsvExportRow,
  parseRequestedColumns,
  parseRequestedFilters,
} from './integration-csv-export.util';

// Realistic upper bound for the number of integrations in the library today;
// keeps the export a single unpaginated query while still bounding memory.
export const EXPORT_MAX_ROWS = 10_000;

const csvExportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 exports per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const sendTelemetry = async (
  serviceDefinitionIdentifier: ServiceDefinitionIdentifier,
  userId: UserId,
  selectedOrganizationId: OrganizationId
): Promise<void> => {
  try {
    if (
      !TelemetryHelper.shouldSendEventForService(serviceDefinitionIdentifier)
    ) {
      return;
    }
    const selectedOrga = await OrganizationDomain.loadOrganizationBy({
      id: selectedOrganizationId,
    });
    const exportEvent = TelemetryHelper.buildExportEvent(
      selectedOrga,
      userId,
      serviceDefinitionIdentifier
    );
    await TelemetryApp.sendTelemetryEvent(exportEvent);
  } catch (telemetryError) {
    logApp.error('Unable to send telemetry event for CSV export', {
      error: telemetryError,
    });
  }
};

export const IntegrationCsvExportEndpoint = {
  exportCsv: async (req: Request, res: Response): Promise<void> => {
    const { user } = req.session;
    if (!user) {
      res.status(401).json({ message: 'You must be logged in' });
      return;
    }

    try {
      requestContext.update({ user });

      const rawServiceInstanceId = req.params.serviceInstanceId;
      const serviceInstanceIdParam = Array.isArray(rawServiceInstanceId)
        ? rawServiceInstanceId[0]
        : rawServiceInstanceId;
      if (!serviceInstanceIdParam) {
        res
          .status(400)
          .json({ message: 'Missing serviceInstanceId parameter' });
        return;
      }
      const serviceInstanceId = extractId<ServiceInstanceId>(
        serviceInstanceIdParam
      );
      const serviceDefinition =
        await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
          serviceInstanceId
        );

      if (!serviceDefinition) {
        res.status(404).json({ message: 'Service instance not found' });
        return;
      }

      if (
        serviceDefinition.identifier !==
        ServiceDefinitionIdentifier.OpenctiIntegrations
      ) {
        res
          .status(400)
          .json({ message: 'CSV export is not available for this service' });
        return;
      }

      const columns = parseRequestedColumns(
        req.query.columns as string | string[] | undefined
      );
      const logicalFilters = parseRequestedFilters(
        req.query as Record<string, unknown>
      );

      const documentsConnection = await DocumentApp.loadDocuments({
        serviceInstanceId,
        first: EXPORT_MAX_ROWS,
        orderBy: DocumentOrdering.Name,
        orderMode: OrderingMode.Asc,
        parentsOnly: true,
        logicalFilters,
      });

      const rows = documentsConnection.edges.map(
        (edge) => edge.node as unknown as IntegrationCsvExportRow
      );

      if (rows.length > 0) {
        const dataLoaders = DocumentDataLoader.create();
        const documentIds = rows.map((row) => row.id);
        const [useCasesByDocument, solutionCategoriesByDocument] =
          await Promise.all([
            dataLoaders.useCasesByDocumentIdLoader.loadMany(documentIds),
            dataLoaders.solutionCategoriesByDocumentIdLoader.loadMany(
              documentIds
            ),
          ]);
        rows.forEach((row, index) => {
          const useCases = useCasesByDocument[index];
          const solutionCategories = solutionCategoriesByDocument[index];
          row.use_cases = useCases instanceof Error ? [] : useCases;
          row.solution_categories =
            solutionCategories instanceof Error ? [] : solutionCategories;
        });
      }

      const csv = buildIntegrationsCsv(rows, columns);
      const filename = buildIntegrationsExportFilename();

      await sendTelemetry(
        serviceDefinition.identifier,
        user.id,
        user.selected_organization_id
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.status(200).send(csv);
    } catch (error) {
      logApp.error('Error while generating integrations CSV export: ', {
        error,
      });
      res.status(500).json({
        message: 'We could not export the integrations list. Please try again.',
      });
    }
  },
};

export const integrationCsvExportEndpoint = (app: Application) => {
  app.get(
    '/document/csv-export/:serviceInstanceId',
    cors(),
    csvExportRateLimiter,
    IntegrationCsvExportEndpoint.exportCsv
  );
};
