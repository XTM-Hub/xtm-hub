import {
  DocumentMetadata as DocumentMetadataResolverType,
  ServiceDefinitionIdentifier,
} from '../../../../__generated__/resolvers-types';
import type { DocumentId } from '../../../../model/kanel/public/Document';
import type {
  MinioFile,
  UploadRules,
} from '../../../../thirdparty/minio/types';
import {
  BadRequestErrorCode,
  ErrorCode,
} from '../../../../utils/error/error.code';
import { DocumentMetadataDomain } from '../../../document/domain/document.metadata.domain';
import { HuntPackHelper } from './hunt-pack.helper';
import {
  HUNT_PACK_EXTRACTED_METADATA_KEYS,
  HUNT_PACK_MAX_BYTES,
} from './hunt-pack.model';

export const HuntPackApp = {
  /** How the file of a library is received, when it has its own rules. */
  uploadRules: (
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier
  ): UploadRules | undefined =>
    serviceDefinitionIdentifier === ServiceDefinitionIdentifier.OpenctiHuntPacks
      ? {
          limit: {
            maxBytes: HUNT_PACK_MAX_BYTES,
            errorCode: BadRequestErrorCode.HuntPackFileTooLarge,
          },
          json: true,
        }
      : undefined,

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
      const summary = HuntPackHelper.summarize(sourceDocumentFile.jsonContent);
      return [...declaredMetadata, ...HuntPackHelper.toMetadata(summary)];
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
