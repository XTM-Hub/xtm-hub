import {
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';

export enum ManifestRebuildQueueStatus {
  Pending = 'pending',
  Processing = 'processing',
}

export type ManifestKey = {
  platformIdentifier: PlatformIdentifier;
  version: string;
  type: ManifestType;
};

export const MANIFEST_LIST_DEFAULT_COUNT = 10;
export const MANIFEST_LIST_MAX_COUNT = 100;
