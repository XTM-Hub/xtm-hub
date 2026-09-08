import type { Request } from 'express';
import {
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import {
  MANIFEST_VERSION_PATTERN,
  ManifestFragmentHelper,
} from '../../../modules/shareable-resource/manifest-fragment/manifest-fragment.helper';
import { MANIFEST_LIST_DEFAULT_COUNT } from '../../../modules/shareable-resource/manifest/manifest.consts';
import { isProduct } from '../shared/product.util';

const MANIFEST_NAME_PATTERN = new RegExp(
  `^connector-manifest-(?:${MANIFEST_VERSION_PATTERN})-\\d{12}$`,
  'i'
);

export const buildManifestETag = (name: string): string => `"${name}"`;

export const isIntegrationType = (value: unknown): value is ManifestType =>
  typeof value === 'string' &&
  (Object.values(ManifestType) as string[]).includes(value);

export const parseCount = (raw: unknown): number | undefined => {
  if (raw === undefined) return MANIFEST_LIST_DEFAULT_COUNT;
  if (typeof raw !== 'string') return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return parsed;
};

export const isValidManifestName = (value: string): boolean =>
  MANIFEST_NAME_PATTERN.test(value);

export type ManifestParamsResult =
  | {
      ok: true;
      product: PlatformIdentifier;
      version: string;
      integrationType: ManifestType;
    }
  | { ok: false; message: string };

export const validateManifestParams = (
  params: Request['params']
): ManifestParamsResult => {
  const { product, version, integrationType } = params;

  if (!isProduct(product)) return { ok: false, message: 'Invalid product' };
  if (!isIntegrationType(integrationType))
    return { ok: false, message: 'Invalid integrationType' };
  if (typeof version !== 'string')
    return { ok: false, message: 'Invalid version' };
  try {
    ManifestFragmentHelper.validateAndFormatManifestVersion(version);
  } catch {
    return { ok: false, message: 'Invalid version format' };
  }

  return { ok: true, product, version, integrationType };
};
