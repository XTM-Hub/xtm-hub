import config from 'config';
import path from 'node:path';

// Object storage settings: `s3` section, S3_* environment variables. The former `minio` section and its MINIO_*
// variables are still read as an alias.
const SECTION = 's3';
const LEGACY_SECTION = 'minio';

const STORAGE_SETTINGS = [
  { key: 'bucketName', variable: 'BUCKET_NAME' },
  { key: 'region', variable: 'REGION' },
  { key: 'endpoint', variable: 'ENDPOINT' },
  { key: 'port', variable: 'PORT' },
  { key: 'accessKeyId', variable: 'ACCESS_KEY' },
  { key: 'secretAccessKey', variable: 'SECRET_KEY' },
  { key: 'useSsl', variable: 'USE_SSL' },
] as const;

export type StorageSettingKey = (typeof STORAGE_SETTINGS)[number]['key'];

export interface StorageConfigSource {
  name: string;
  parsed: unknown;
}

const isSetIn = (
  source: StorageConfigSource,
  section: string,
  key: string
): boolean => {
  const parsed = source.parsed as
    Record<string, Record<string, unknown> | undefined> | undefined;
  return parsed?.[section]?.[key] !== undefined;
};

const configSources = (): StorageConfigSource[] =>
  config.util.getConfigSources();

// node-config lists its sources from the lowest to the highest priority: configuration files, NODE_CONFIG, then the
// environment variables of custom-environment-variables.json (it skips empty variables). The highest source setting
// either name decides, and the new name wins inside a same source.
export const resolveStorageSection = (
  key: StorageSettingKey,
  sources: StorageConfigSource[] = configSources()
): string => {
  const source = [...sources]
    .reverse()
    .find((s) => isSetIn(s, SECTION, key) || isSetIn(s, LEGACY_SECTION, key));
  return source && !isSetIn(source, SECTION, key) ? LEGACY_SECTION : SECTION;
};

export const getStorageConfig = <T>(key: StorageSettingKey): T =>
  config.get<T>(`${resolveStorageSection(key)}.${key}`);

// Former names read (used), former names hidden by a new name (ignored), new names hidden by a former name of higher
// priority (shadowed). Names only, never values.
export const storageConfigDeprecations = (
  sources: StorageConfigSource[] = configSources()
) => {
  const userSources = sources.filter(
    (s) => !path.basename(s.name).startsWith('default.')
  );
  const used: string[] = [];
  const ignored: string[] = [];
  const shadowed: string[] = [];
  STORAGE_SETTINGS.forEach(({ key, variable }) => {
    const legacyName = `${LEGACY_SECTION}.${key} (MINIO_${variable})`;
    if (resolveStorageSection(key, sources) === LEGACY_SECTION) {
      used.push(legacyName);
      if (userSources.some((s) => isSetIn(s, SECTION, key))) {
        shadowed.push(`${SECTION}.${key} (S3_${variable})`);
      }
    } else if (sources.some((s) => isSetIn(s, LEGACY_SECTION, key))) {
      ignored.push(legacyName);
    }
  });
  return { used, ignored, shadowed };
};
