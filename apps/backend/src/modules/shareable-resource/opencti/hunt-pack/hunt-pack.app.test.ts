import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DocumentMetadataKeyCode,
  ServiceDefinitionIdentifier,
} from '../../../../__generated__/resolvers-types';
import type { DocumentId } from '../../../../model/kanel/public/Document';
import { MinIOClient } from '../../../../thirdparty/minio/client';
import {
  BadRequestErrorCode,
  ErrorCode,
} from '../../../../utils/error/error.code';
import { DocumentMetadataDomain } from '../../../document/domain/document.metadata.domain';
import { HuntPackApp } from './hunt-pack.app';

const huntPackFile = (jsonContent: Record<string, unknown> | undefined) => ({
  minioName: 'hunt-pack-minio-name',
  fileName: 'hunt-pack.json',
  mimeType: 'application/json',
  jsonContent,
});

const validPack = {
  type: 'bundle',
  objects: [
    { type: 'attack-pattern', id: 'attack-pattern--1', x_mitre_id: 'T1059' },
    {
      type: 'hunt',
      id: 'hunt--1',
      technique_refs: ['attack-pattern--1'],
      native_queries: [{ platform: 'splunk', language: 'spl', query: 'x' }],
    },
  ],
};

describe('huntPackApp.buildDocumentMetadata', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves the metadata of other libraries untouched', async () => {
    const metadata = [
      { key: DocumentMetadataKeyCode.ProductVersion, value: '6.8.0' },
    ];

    await expect(
      HuntPackApp.buildDocumentMetadata({
        serviceDefinitionIdentifier:
          ServiceDefinitionIdentifier.OpenctiCustomViews,
        metadata,
        sourceDocumentFile: huntPackFile(undefined),
      })
    ).resolves.toBe(metadata);
  });

  it('extracts the summary of an uploaded hunt pack and applies the version floor', async () => {
    const result = await HuntPackApp.buildDocumentMetadata({
      serviceDefinitionIdentifier: ServiceDefinitionIdentifier.OpenctiHuntPacks,
      metadata: [
        { key: DocumentMetadataKeyCode.ProductVersion, value: '6.8.0' },
        { key: DocumentMetadataKeyCode.HuntCount, value: '999' },
      ],
      sourceDocumentFile: huntPackFile(validPack),
    });

    expect(result).toEqual([
      { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261003.0' },
      { key: DocumentMetadataKeyCode.HuntCount, value: '1' },
      { key: DocumentMetadataKeyCode.AttackTechniques, value: '["T1059"]' },
      { key: DocumentMetadataKeyCode.HuntPlatforms, value: '["splunk"]' },
    ]);
  });

  it('deletes a rejected upload from storage and rethrows the validation error', async () => {
    const deleteFile = vi
      .spyOn(MinIOClient, 'deleteFile')
      .mockResolvedValue(undefined);

    await expect(
      HuntPackApp.buildDocumentMetadata({
        serviceDefinitionIdentifier:
          ServiceDefinitionIdentifier.OpenctiHuntPacks,
        metadata: [],
        sourceDocumentFile: huntPackFile({ type: 'bundle', objects: [] }),
      })
    ).rejects.toThrow(BadRequestErrorCode.HuntPackEmpty);
    expect(deleteFile).toHaveBeenCalledWith('hunt-pack-minio-name');
  });

  it('rejects a new hunt pack without a pack file', async () => {
    await expect(
      HuntPackApp.buildDocumentMetadata({
        serviceDefinitionIdentifier:
          ServiceDefinitionIdentifier.OpenctiHuntPacks,
        metadata: [
          { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
        ],
      })
    ).rejects.toThrow(ErrorCode.DocumentFileMissing);
  });

  it('keeps the extracted metadata of the current version when no new file is uploaded', async () => {
    const storedValues: Record<string, string | null> = {
      [DocumentMetadataKeyCode.HuntCount]: '4',
      [DocumentMetadataKeyCode.AttackTechniques]: '["T1003"]',
      [DocumentMetadataKeyCode.HuntPlatforms]: null,
    };
    vi.spyOn(
      DocumentMetadataDomain,
      'loadMetadataValueByKey'
    ).mockImplementation(async (_id, key) => storedValues[key] ?? null);

    const result = await HuntPackApp.buildDocumentMetadata({
      serviceDefinitionIdentifier: ServiceDefinitionIdentifier.OpenctiHuntPacks,
      metadata: [
        { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
      ],
      existingDocumentId: 'existing-hunt-pack' as DocumentId,
    });

    expect(result).toEqual([
      { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
      { key: DocumentMetadataKeyCode.HuntCount, value: '4' },
      { key: DocumentMetadataKeyCode.AttackTechniques, value: '["T1003"]' },
    ]);
  });
});
