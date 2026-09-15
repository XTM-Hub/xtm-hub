import cors from 'cors';
import { Application, Request, Response } from 'express';
import { fromGlobalId } from 'graphql-relay/node/node.js';
import { Readable } from 'stream';
import { requestContext } from '../../../context/request.context';
import { DocumentId } from '../../../model/kanel/public/Document';
import ServiceDefinition from '../../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { DocumentDomain } from '../../../modules/document/domain/document.domain';
import { ServiceInstanceDomain } from '../../../modules/service/instance/service-instance.domain';
import { MinIOClient } from '../../../thirdparty/minio/client';
import { logApp } from '../../../utils/app-logger.util';
import { NotFoundError } from '../../../utils/error/error.util';
import { extractId } from '../../../utils/utils';

export const documentVisualizeEndpoint = (app: Application) => {
  app.get(
    `/document/visualize/:serviceInstanceId/:filename`,
    cors(),
    async (req: Request, res: Response) => {
      const filename = Array.isArray(req.params.filename)
        ? req.params.filename[0]
        : req.params.filename;
      if (!filename) {
        res.status(400).json({ message: 'Missing filename parameter' });
        return;
      }
      const { user } = req.session;
      if (!user) {
        res.status(401).json({ message: 'You must be logged in' });
        return;
      }
      try {
        requestContext.update({ user });
        const document = await DocumentDomain.loadDocumentBy({
          id: extractId<DocumentId>(filename),
        });
        if (!document) {
          logApp.error(
            `VISUALIZE Error while retrieving document: document not found. Required documentId: ${fromGlobalId(filename).id}`
          );
          res.status(404).json({ message: 'Document not found' });
          throw NotFoundError('DOCUMENT_NOT_FOUND_ERROR');
        }
        if (!document.minio_name) {
          logApp.error(
            `VISUALIZE Error - Invalid document - Missing name for ${document.id}`
          );
          return res.status(404).json({ message: 'Invalid document' });
        }
        const stream = (await MinIOClient.downloadFile(
          document.minio_name
        )) as Readable;

        res.setHeader(
          'Content-Type',
          document.mime_type ?? 'application/octet-stream'
        );
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${document.file_name ?? 'document'}"`
        );

        stream.pipe(res);
      } catch (error) {
        logApp.error('Error while retrieving document VISUALIZE: ', { error });
        res.status(404).json({ message: 'Document not found' });
      }
    }
  );

  app.get(
    '/document/images/:serviceInstanceId/:documentId',
    cors(),
    async (req: Request, res: Response) => {
      try {
        const serviceInstanceIdParam = Array.isArray(
          req.params.serviceInstanceId
        )
          ? req.params.serviceInstanceId[0]
          : req.params.serviceInstanceId;
        const documentIdParam = Array.isArray(req.params.documentId)
          ? req.params.documentId[0]
          : req.params.documentId;
        if (!serviceInstanceIdParam || !documentIdParam) {
          return res.status(400).json({
            message: 'Missing serviceInstanceId or documentId parameter',
          });
        }
        const serviceInstanceId = extractId<ServiceInstanceId>(
          serviceInstanceIdParam
        );
        // Check if the user is authorized to access the document
        const serviceDefinition =
          (await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
            serviceInstanceId
          )) as ServiceDefinition;
        if (!serviceDefinition) {
          logApp.error(
            `Service definition not found. Required: ${serviceInstanceId}`
          );
          return res
            .status(404)
            .json({ message: 'Service definition not found' });
        }

        // Only allow requests on public services
        if (!serviceDefinition.public) {
          logApp.error(
            `Service definition not found. Required: ${serviceInstanceId}`
          );
          return res
            .status(404)
            .json({ message: 'Service definition not found' });
        }
        const documentId = extractId<DocumentId>(documentIdParam);
        const document = await DocumentDomain.loadDocumentBy({
          id: documentId,
        });

        if (!document?.mime_type?.startsWith('image/')) {
          logApp.error(
            `Document not found. Required documentId: ${documentId}`
          );
          return res.status(404).json({ message: 'Document not found' });
        }

        if (!document.minio_name) {
          logApp.error(`Invalid document - Missing name for ${documentId}`);
          return res.status(404).json({ message: 'Invalid document' });
        }
        const stream = (await MinIOClient.downloadFile(
          document.minio_name
        )) as Readable;

        res.setHeader(
          'Content-Type',
          document.mime_type ?? 'application/octet-stream'
        );
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${document.file_name ?? 'document'}"`
        );

        stream.pipe(res);
      } catch (error) {
        logApp.error('Error while retrieving document VISUALIZE: ', { error });
        res.status(404).json({ message: 'Document not found' });
      }
    }
  );
};
