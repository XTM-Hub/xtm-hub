import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DocumentMetadataKeyCode,
  ServiceDefinitionIdentifier,
} from '../../../../__generated__/resolvers-types';
import type { DocumentId } from '../../../../model/kanel/public/Document';
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
      id: 'hunt--3f9b2a64-8d1c-4e57-9a0b-6c2d1e4f5a73',
      name: 'Encoded PowerShell',
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

  it('rethrows the validation error of a rejected upload', async () => {
    await expect(
      HuntPackApp.buildDocumentMetadata({
        serviceDefinitionIdentifier:
          ServiceDefinitionIdentifier.OpenctiHuntPacks,
        metadata: [],
        sourceDocumentFile: huntPackFile({ type: 'bundle', objects: [] }),
      })
    ).rejects.toThrow(BadRequestErrorCode.HuntPackEmpty);
  });

  it('reads a hunt pack file as JSON of at most the 20 MiB the OpenCTI import accepts', () => {
    expect(
      HuntPackApp.uploadRules(ServiceDefinitionIdentifier.OpenctiHuntPacks)
    ).toEqual({
      limit: {
        maxBytes: 20 * 1024 * 1024,
        errorCode: BadRequestErrorCode.HuntPackFileTooLarge,
      },
      json: true,
    });
    expect(
      HuntPackApp.uploadRules(ServiceDefinitionIdentifier.OpenctiCustomViews)
    ).toBeUndefined();
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

  it('leaves the summary of an edit without a new file to withKeptMetadata', async () => {
    const loadMetadataValueByKey = vi.spyOn(
      DocumentMetadataDomain,
      'loadMetadataValueByKey'
    );

    const result = await HuntPackApp.buildDocumentMetadata({
      serviceDefinitionIdentifier: ServiceDefinitionIdentifier.OpenctiHuntPacks,
      metadata: [
        { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
        { key: DocumentMetadataKeyCode.HuntCount, value: '999' },
      ],
      existingDocumentId: 'existing-hunt-pack' as DocumentId,
    });

    expect(result).toEqual([
      { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
    ]);
    expect(loadMetadataValueByKey).not.toHaveBeenCalled();
  });
});

describe('huntPackApp.withKeptMetadata', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the summary of the current version to an edit without a new file', async () => {
    const storedValues: Record<string, string | null> = {
      [DocumentMetadataKeyCode.HuntCount]: '4',
      [DocumentMetadataKeyCode.AttackTechniques]: '["T1003"]',
      [DocumentMetadataKeyCode.HuntPlatforms]: null,
    };
    vi.spyOn(
      DocumentMetadataDomain,
      'loadMetadataValueByKey'
    ).mockImplementation(async (_id, key) => storedValues[key] ?? null);

    const result = await HuntPackApp.withKeptMetadata({
      serviceDefinitionIdentifier: ServiceDefinitionIdentifier.OpenctiHuntPacks,
      metadata: [
        { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
      ],
      documentId: 'existing-hunt-pack' as DocumentId,
    });

    expect(result).toEqual([
      { key: DocumentMetadataKeyCode.ProductVersion, value: '7.261010.0' },
      { key: DocumentMetadataKeyCode.HuntCount, value: '4' },
      { key: DocumentMetadataKeyCode.AttackTechniques, value: '["T1003"]' },
    ]);
  });

  it('leaves the metadata of other libraries untouched', async () => {
    const loadMetadataValueByKey = vi.spyOn(
      DocumentMetadataDomain,
      'loadMetadataValueByKey'
    );
    const metadata = [
      { key: DocumentMetadataKeyCode.ProductVersion, value: '6.8.0' },
    ];

    await expect(
      HuntPackApp.withKeptMetadata({
        serviceDefinitionIdentifier:
          ServiceDefinitionIdentifier.OpenctiCustomViews,
        metadata,
        documentId: 'custom-view' as DocumentId,
      })
    ).resolves.toBe(metadata);
    expect(loadMetadataValueByKey).not.toHaveBeenCalled();
  });
});
