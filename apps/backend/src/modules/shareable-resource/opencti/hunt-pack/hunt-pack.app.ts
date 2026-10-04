import {
  DocumentMetadata as DocumentMetadataResolverType,
  ServiceDefinitionIdentifier,
} from '../../../../__generated__/resolvers-types';
import type { DocumentId } from '../../../../model/kanel/public/Document';
import { MinIOClient } from '../../../../thirdparty/minio/client';
import type { MinioFile } from '../../../../thirdparty/minio/types';
import { logApp } from '../../../../utils/app-logger.util';
import { getErrorMessage } from '../../../../utils/error/error-guard.util';
import { ErrorCode } from '../../../../utils/error/error.code';
import { DocumentMetadataDomain } from '../../../document/domain/document.metadata.domain';
import { HuntPackHelper } from './hunt-pack.helper';
import { HUNT_PACK_EXTRACTED_METADATA_KEYS } from './hunt-pack.model';

export const HuntPackApp = {
  /**
   * Metadata of a hunt pack document: the declared fields of the form, the
   * product version floor, and the summary extracted from the uploaded pack,
   * or kept from the current version when no new file is uploaded. A new
   * hunt pack requires its pack file.
   */
  buildDocumentMetadata: async ({
    serviceDefinitionIdentifier,
    metadata,
    sourceDocumentFile,
    existingDocumentId,
  }: {
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
    metadata: DocumentMetadataResolverType[];
    sourceDocumentFile?: MinioFile;
    existingDocumentId?: DocumentId;
  }): Promise<DocumentMetadataResolverType[]> => {
    if (
      serviceDefinitionIdentifier !==
      ServiceDefinitionIdentifier.OpenctiHuntPacks
    ) {
      return metadata;
    }
    const declaredMetadata = HuntPackHelper.withMinimumProductVersion(
      HuntPackHelper.withoutExtractedMetadata(metadata)
    );

    if (sourceDocumentFile) {
      try {
        const summary = HuntPackHelper.summarize(
          sourceDocumentFile.jsonContent
        );
        return [...declaredMetadata, ...HuntPackHelper.toMetadata(summary)];
      } catch (error) {
        try {
          await MinIOClient.deleteFile(sourceDocumentFile.minioName);
        } catch (cleanupError) {
          logApp.error('[HUNT_PACK] Unable to delete a rejected hunt pack', {
            minioName: sourceDocumentFile.minioName,
            error: getErrorMessage(cleanupError),
          });
        }
        throw error;
      }
    }

    if (!existingDocumentId) {
      throw new Error(ErrorCode.DocumentFileMissing);
    }
    const keptMetadata = await Promise.all(
      HUNT_PACK_EXTRACTED_METADATA_KEYS.map(async (key) => ({
        key,
        value: await DocumentMetadataDomain.loadMetadataValueByKey(
          existingDocumentId,
          key
        ),
      }))
    );
    return [
      ...declaredMetadata,
      ...keptMetadata.filter(
        (entry): entry is DocumentMetadataResolverType => entry.value !== null
      ),
    ];
  },
};
