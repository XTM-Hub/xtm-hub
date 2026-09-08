import {
  IntegrationType,
  Resolvers,
  ServiceInstance as ServiceInstanceModel,
  ShareableResource,
  SubscriptionModel,
} from '../../__generated__/resolvers-types';
import { DocumentId } from '../../model/kanel/public/Document';
import { logApp } from '../../utils/app-logger.util';
import { toError } from '../../utils/error/error-guard.util';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { AlreadyExistsError } from '../../utils/error/error.util';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { stripNulls } from '../../utils/typescript';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { OPENAEV_SCENARIO_DOCUMENT_TYPE } from '../shareable-resource/openaev/scenario/scenario.model';
import { OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE } from '../shareable-resource/opencti/custom-dashboard/custom-dashboard.model';
import { OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE } from '../shareable-resource/opencti/custom-view/custom-view.model';
import { OPENCTI_INTEGRATION_DOCUMENT_TYPE } from '../shareable-resource/opencti/integration/integration.model';
import { OPENCTI_PLAYBOOK_DOCUMENT_TYPE } from '../shareable-resource/opencti/playbook/playbook.model';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryHelper } from '../telemetry/telemetry.helper';
import { DocumentApp } from './document.app';
import { subscriptionByServiceInstanceLoaderKey } from './document.dataloader';
import { DocumentHelper } from './document.helper';
import { DocumentDomain } from './domain/document.domain';

const resolvers: Resolvers = {
  DocumentId: createRelayIdScalar<DocumentId>('Document'),

  Mutation: {
    createDocument: async (_, input) => {
      try {
        return await DocumentApp.createDocument({
          ...stripNulls(input),
          serviceInstanceId: input.serviceInstanceId,
        });
      } catch (error) {
        const normalizedError = toError(error);
        if (normalizedError.message.includes('document_type_slug_unique')) {
          throw AlreadyExistsError(ErrorCode.DocumentUniqueSlugError, {
            detail: normalizedError,
          });
        }
        throw mapToGraphQLError(error, UnknownErrorCode.DocumentCreateError);
      }
    },
    updateDocument: async (_, input) => {
      try {
        return await DocumentApp.updateDocument({
          ...stripNulls(input),
          parentDocumentId: input.documentId,
          serviceInstanceId: input.serviceInstanceId,
          existingImageIds: input.existingImageIds ?? [],
        });
      } catch (error) {
        const normalizedError = toError(error);
        if (normalizedError.message.includes('document_type_slug_unique')) {
          throw AlreadyExistsError(ErrorCode.DocumentUniqueSlugError, {
            detail: normalizedError,
          });
        }
        throw mapToGraphQLError(error, UnknownErrorCode.DocumentUpdateError);
      }
    },
    deleteDocument: async (
      _,
      { documentId, forceDelete, service_instance_id }
    ) => {
      try {
        return await DocumentApp.deleteDocument(
          documentId,
          service_instance_id,
          forceDelete ?? false
        );
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.DeleteDocumentError);
      }
    },
    incrementShareNumberDocument: async (_, { documentId }, context) => {
      try {
        const document = await DocumentDomain.loadDocumentWithMetadataById(
          documentId,
          []
        );
        const documentWithCounters =
          await DocumentHelper.updateDocumentWithCounters(document);
        try {
          if (!document.service_instance_id) {
            throw new Error(ErrorCode.ServiceInstanceNotFound);
          }
          const serviceDefinition =
            await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
              document.service_instance_id
            );
          if (!serviceDefinition) {
            throw new Error(ErrorCode.ServiceDefinitionNotFound);
          }

          if (
            TelemetryHelper.shouldSendEventForService(
              serviceDefinition.identifier
            )
          ) {
            const selectedOrga = context.user
              ? await OrganizationDomain.loadOrganizationBy({
                  id: context.user.selected_organization_id,
                })
              : undefined;

            const shareEvent = await TelemetryHelper.buildShareEvent(
              selectedOrga,
              context.user?.id,
              serviceDefinition.identifier,
              document.id,
              document.name ?? ''
            );
            await TelemetryApp.sendTelemetryEvent(shareEvent);
          }
        } catch (error) {
          logApp.error('Unable to send telemetry event', {
            error,
          });
        }
        return documentWithCounters;
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.IncrementShareNumberError
        );
      }
    },
  },
  Document: {
    async __resolveType(document, context) {
      const TYPE_MAPPINGS = {
        [OPENCTI_CUSTOM_DASHBOARD_DOCUMENT_TYPE]: 'CustomDashboard',
        [OPENCTI_CUSTOM_VIEW_DOCUMENT_TYPE]: 'CustomView',
        [OPENAEV_SCENARIO_DOCUMENT_TYPE]: 'OpenAEVScenario',
        [OPENCTI_PLAYBOOK_DOCUMENT_TYPE]: 'OpenCTIPlaybook',
      } as const;
      const INTEGRATION_MAPPINGS = {
        [IntegrationType.Connector]: 'Connector',
        [IntegrationType.CsvFeed]: 'CsvFeed',
        [IntegrationType.TaxiiFeed]: 'TaxiiFeed',
        [IntegrationType.RssFeed]: 'RssFeed',
        [IntegrationType.Stream]: 'Stream',
        [IntegrationType.ThirdPartyIntegration]: 'ThirdPartyIntegration',
      } as const;
      const mappedType =
        TYPE_MAPPINGS[document.type as keyof typeof TYPE_MAPPINGS];
      if (mappedType) {
        return mappedType;
      } else if (document.type === OPENCTI_INTEGRATION_DOCUMENT_TYPE) {
        const hydratedIntegrationType = (
          document as { integration_type?: IntegrationType }
        ).integration_type;
        const integrationType =
          hydratedIntegrationType ??
          (await context.dataLoaders.document.integrationTypeLoader.load(
            document.id
          ));
        if (integrationType) {
          const responseType =
            INTEGRATION_MAPPINGS[
              integrationType as keyof typeof INTEGRATION_MAPPINGS
            ];
          if (responseType) {
            return responseType;
          }
        }
      }
      logApp.warn(
        `Document resolver type - Unresolved document type ${document.type}`
      );
      return 'DefaultDocument';
    },

    children_documents: async ({ id }, _, context) =>
      (await context.dataLoaders.document.childrenDocumentsLoader.load(
        id
      )) as ShareableResource[],
    use_cases: ({ id }, _, context) =>
      context.dataLoaders.document.useCasesByDocumentIdLoader.load(id),
    uploader: ({ id }, _, context) =>
      context.dataLoaders.document.uploaderLoader.load(id),
    uploader_organization: ({ id }, _, context) =>
      context.dataLoaders.document.uploaderOrganizationLoader.load(id),
    service_instance: async ({ service_instance_id }, _, context) => {
      if (!service_instance_id) return null;
      const serviceInstance =
        await context.dataLoaders.document.serviceInstanceByIdLoader.load(
          service_instance_id
        );
      return serviceInstance as unknown as ServiceInstanceModel;
    },
    subscription: async ({ service_instance_id }, _, context) => {
      if (!service_instance_id) return null;
      const subscription =
        await context.dataLoaders.document.subscriptionByServiceInstanceLoader.load(
          subscriptionByServiceInstanceLoaderKey.create({
            organizationId: context.user.selected_organization_id,
            serviceInstanceId: service_instance_id,
          })
        );

      return subscription as unknown as SubscriptionModel;
    },
  },
  DeployedResource: {
    deployedBy: (parent, _, context) => {
      const { deployedById } = parent as unknown as {
        deployedById: string | null;
      };
      return deployedById
        ? context.dataLoaders.document.userLoader.load(deployedById)
        : null;
    },
  },
  Query: {
    documentExists: async (_, input) => {
      try {
        return await DocumentHelper.checkDocumentExists(
          input.documentName ?? '',
          input.service_instance_id
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    publicDocuments: async (_, input) => {
      try {
        return await DocumentApp.loadPublicDocuments(input);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    publicDocumentsByServiceSlug: async (_, { serviceInstanceSlug }) => {
      try {
        return await DocumentApp.loadPublicDocumentsByServiceSlug(
          serviceInstanceSlug
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    publicDocumentBySlug: async (_, { serviceInstanceId, slug }) => {
      try {
        return await DocumentApp.loadPublicDocumentBySlug(
          serviceInstanceId,
          slug
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    documents: async (_, input) => {
      try {
        return await DocumentApp.loadDocuments(input);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    document: async (_, { documentId }) => DocumentApp.loadDocument(documentId),
    mostDeployedDocuments: async (_, { limit, platformIdentifiers }) => {
      try {
        return await DocumentApp.loadMostDeployedDocuments(
          limit,
          platformIdentifiers ?? undefined
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    newestDocuments: async (_, { limit, platformIdentifiers }) => {
      try {
        return await DocumentApp.loadNewestDocuments(
          limit,
          platformIdentifiers ?? undefined
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    lastDeployedOverview: async (_, { limit, serviceInstanceId }) => {
      try {
        return await DocumentApp.loadLastDeployedOverview(
          limit,
          serviceInstanceId
        );
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default resolvers;
