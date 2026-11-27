import cors from 'cors';
import { Express, Request } from 'express';
import { Readable } from 'stream';
import { PlatformConfigurationStatus } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { DocumentId } from '../../../model/kanel/public/Document';
import { UserLoadUserBy } from '../../../model/user';
import { DocumentDomain } from '../../../modules/document/domain/document.domain';
import { OrganizationDomain } from '../../../modules/organization-management/organization/organization.domain';
import { UserDomain } from '../../../modules/organization-management/user/user-domain/user.domain';
import {
  authenticatePlatform,
  PLATFORM_ASSERTION_HEADER,
  PlatformAuthenticationErrorCode,
} from '../../../modules/security-management/token/platform-authentication.util';
import { extractPlatformToken } from '../../../modules/security-management/token/platform-token.util';
import { ServiceInstanceDomain } from '../../../modules/service/instance/service-instance.domain';
import { TelemetryApp } from '../../../modules/telemetry/telemetry.app';
import { TelemetryHelper } from '../../../modules/telemetry/telemetry.helper';
import { MinIOClient } from '../../../thirdparty/minio/client';
import { logApp } from '../../../utils/app-logger.util';
import {
  ErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { NotFoundError } from '../../../utils/error/error.util';
import {
  documentDownloadIpRateLimiter,
  documentDownloadUserRateLimiter,
  USER_PLATFORM_TOKEN_HEADER,
} from '../../../utils/rate-limit.util';
import { extractId } from '../../../utils/utils';

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

  const user_platform_token = req.header(USER_PLATFORM_TOKEN_HEADER);
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

/**
 * Checks the platform that downloads for its user, if any. An assertion must be signed for this very path (htu), so
 * an assertion for one document opens no other. Without one, the platform token is checked only when present, to keep
 * old OpenCTI versions compatible. Returns the refusal, or undefined when the download may go on.
 */
const checkPlatformOfRequest = async (
  req: Request,
  isLoadedFromUserPlatformToken: boolean | undefined
): Promise<{ code?: PlatformAuthenticationErrorCode } | undefined> => {
  if (req.headers[PLATFORM_ASSERTION_HEADER] !== undefined) {
    const authentication = await authenticatePlatform(req, { htu: req.path });
    if (authentication.outcome === 'authenticated') {
      return undefined;
    }
    return {
      code:
        authentication.outcome === 'refused'
          ? authentication.code
          : UnauthenticatedErrorCode.PlatformAssertionInvalid,
    };
  }

  if (!isLoadedFromUserPlatformToken || !extractPlatformToken(req)) {
    return undefined;
  }
  const authentication = await authenticatePlatform(req);
  if (authentication.outcome === 'refused') {
    return { code: authentication.code };
  }
  const isActiveRegistration =
    authentication.outcome === 'token' &&
    authentication.match?.credential === 'registration' &&
    authentication.match.registration.platformConfiguration.status ===
      PlatformConfigurationStatus.Active;
  return isActiveRegistration ? undefined : {};
};

export const documentDownloadEndpoint = (app: Express) => {
  app
    .options(`/document/get/:serviceInstanceId/:filename`, cors())
    .get(
      `/document/get/:serviceInstanceId/:filename`,
      cors(),
      documentDownloadIpRateLimiter,
      documentDownloadUserRateLimiter,
      async (req: Request, res) => {
        const { attach } = req.query;
        const { user, isLoadedFromUserPlatformToken } = await loadUser(req);
        if (!user) {
          res.status(401).json({ message: 'You must be logged in' });
          return;
        }

        requestContext.update({ user });
        const refusal = await checkPlatformOfRequest(
          req,
          isLoadedFromUserPlatformToken
        );
        if (refusal) {
          return res.status(403).json({
            message: 'platform registration is not valid',
            ...(refusal.code && { code: refusal.code }),
          });
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
