import cors from 'cors';
import { Application, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  DocumentOrdering,
  OrderingMode,
  ServiceDefinitionIdentifier,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { UserId } from '../../../model/kanel/public/User';
import { DocumentApp } from '../../../modules/document/document.app';
import { DocumentDataLoader } from '../../../modules/document/document.dataloader';
import { OrganizationDomain } from '../../../modules/organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../../../modules/service/instance/service-instance.domain';
import { INTEGRATION_CSV_EXPORT_METADATA_KEYS } from '../../../modules/shareable-resource/opencti/integration/integration.model';
import { TelemetryApp } from '../../../modules/telemetry/telemetry.app';
import { TelemetryHelper } from '../../../modules/telemetry/telemetry.helper';
import { MARKETING_USER_CONTEXT } from '../../../portal.const';
import {
  isValidSystemToken,
  SYSTEM_TOKEN_HEADER,
} from '../../../security/directive-graphql/validator/system-token.validator';
import { logApp } from '../../../utils/app-logger.util';
import { extractId } from '../../../utils/utils';
import {
  buildIntegrationsCsv,
  buildIntegrationsExportFilename,
  IntegrationCsvExportRow,
  parseRequestedColumns,
  parseRequestedFilters,
} from './integration-csv-export-endpoint.utils';

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
    const sessionUser = req.session.user;
    // Marketing tooling (e.g. HubSpot) has no session: a valid system token exports as the capability-less
    // marketing user, never as the system user.
    const user =
      sessionUser ??
      (isValidSystemToken(req.header(SYSTEM_TOKEN_HEADER) ?? null)
        ? MARKETING_USER_CONTEXT.user
        : undefined);
    if (!user) {
      res.status(401).json({
        message: 'You must be logged in or provide a valid system token',
      });
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

      const documentsConnection = await DocumentApp.loadDocuments(
        {
          serviceInstanceId,
          orderBy: DocumentOrdering.Name,
          orderMode: OrderingMode.Asc,
          parentsOnly: true,
          activeOnly: true,
          logicalFilters,
        },
        INTEGRATION_CSV_EXPORT_METADATA_KEYS
      );

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
          // loadMany never rejects; it resolves per-key Errors instead. Re-throw them here so a
          // failed use-case/solution-category lookup fails the export instead of silently emptying the column.
          if (useCases instanceof Error) {
            throw useCases;
          }
          if (solutionCategories instanceof Error) {
            throw solutionCategories;
          }
          row.use_cases = useCases;
          row.solution_categories = solutionCategories;
        });
      }

      const csv = buildIntegrationsCsv(rows, columns);
      const filename = buildIntegrationsExportFilename();

      // An automated marketing pull is not a user export.
      if (sessionUser) {
        await sendTelemetry(
          serviceDefinition.identifier,
          sessionUser.id,
          sessionUser.selected_organization_id
        );
      }

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
