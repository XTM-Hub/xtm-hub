import cors from 'cors';
import { Express, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { Readable } from 'stream';
import { requestContext } from '../../../context/request.context';
import { DocumentId } from '../../../model/kanel/public/Document';
import { UserLoadUserBy } from '../../../model/user';
import { DocumentDomain } from '../../../modules/document/domain/document.domain';
import { OrganizationDomain } from '../../../modules/organization-management/organization/organization.domain';
import { UserDomain } from '../../../modules/organization-management/user/user-domain/user.domain';
import {
  extractPlatformToken,
  validateActivePlatformToken,
} from '../../../modules/security-management/token/platform-token.util';
import { ServiceInstanceDomain } from '../../../modules/service/instance/service-instance.domain';
import { TelemetryApp } from '../../../modules/telemetry/telemetry.app';
import { TelemetryHelper } from '../../../modules/telemetry/telemetry.helper';
import { MinIOClient } from '../../../thirdparty/minio/client';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { NotFoundError } from '../../../utils/error/error.util';
import { extractId } from '../../../utils/utils';
const documentDownloadRateLimiter = rateLimit({
  windowMs: 180 * 1000, // 3 minutes
  max: 10, // max 10 request per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const loadUser = async (
  req: Request
): Promise<{
  user: UserLoadUserBy | null;
  isLoadedFromUserPlatformToken?: boolean;
}> => {
  const userLoadFromCookie: UserLoadUserBy | undefined = req.session.user;
  if (userLoadFromCookie) {
    return { user: userLoadFromCookie };
  }

  const user_platform_token = req.header('XTM-Hub-User-Platform-Token');
  if (!user_platform_token) {
    return { user: null };
  }

  const userLoadFromUserPlatformToken = await UserDomain.loadUserBy({
    'User.platform_token': user_platform_token,
  });
  return {
    user: userLoadFromUserPlatformToken ?? null,
    isLoadedFromUserPlatformToken: true,
  };
};

export const documentDownloadEndpoint = (app: Express) => {
  app
    .options(`/document/get/:serviceInstanceId/:filename`, cors())
    .get(
      `/document/get/:serviceInstanceId/:filename`,
      cors(),
      documentDownloadRateLimiter,
      async (req: Request, res) => {
        const { attach } = req.query;
        const { user, isLoadedFromUserPlatformToken } = await loadUser(req);
        if (!user) {
          res.status(401).json({ message: 'You must be logged in' });
          return;
        }

        requestContext.update({ user });
        const token = extractPlatformToken(req);
        // check only if token is present to keep old OpenCTI versions compatibility
        if (isLoadedFromUserPlatformToken && token) {
          const isPlatformTokenValid = await validateActivePlatformToken(req);

          if (!isPlatformTokenValid) {
            return res
              .status(403)
              .json({ message: 'platform registration is not valid' });
          }
        }

        const filename = Array.isArray(req.params.filename)
          ? req.params.filename[0]
          : req.params.filename;

        if (!filename) {
          logApp.error(
            'Error while retrieving document: filename not provided'
          );
          res.status(400).json({ message: 'Missing filename parameter' });
          return;
        }

        logApp.info('Downloading file:', { filename });

        try {
          const document = await DocumentDomain.loadDocumentBy({
            id: extractId<DocumentId>(filename),
          });

          if (!document) {
            logApp.error(
              'Error while retrieving document: document not found.'
            );
            res.status(404).json({ message: 'Document not found' });
            throw NotFoundError('DOCUMENT_NOT_FOUND_ERROR');
          }

          if (!document.minio_name) {
            logApp.error(
              `Download Error - Invalid document - Missing name for ${document.id}`
            );
            return res.status(404).json({ message: 'Invalid document' });
          }

          const stream = (await MinIOClient.downloadFile(
            document.minio_name
          )) as Readable;
          if (attach) {
            res.attachment(document.file_name ?? undefined);
          }
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
          try {
            if (
              TelemetryHelper.shouldSendEventForService(
                serviceDefinition.identifier
              )
            ) {
              const selectedOrga = await OrganizationDomain.loadOrganizationBy({
                id: user.selected_organization_id,
              });

              if (!selectedOrga) {
                throw new Error(ErrorCode.OrganizationNotFound);
              }
              const downloadEvent = await TelemetryHelper.buildDownloadEvent(
                selectedOrga,
                user.id,
                serviceDefinition.identifier,
                document.id,
                document.name ?? ''
              );
              await TelemetryApp.sendTelemetryEvent(downloadEvent);
            }
          } catch (error) {
            logApp.error('Unable to send telemetry event for download', {
              error,
            });
          }

          stream.pipe(res);
        } catch (error) {
          logApp.error('Error while retrieving document: ', { error });
          res.status(404).json({ message: 'Document not found' });
          return;
        }
      }
    );
};
