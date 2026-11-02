import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStorageConfig,
  resolveStorageSection,
  storageConfigDeprecations,
  StorageConfigSource,
} from './storage-config';

const configMock = vi.hoisted(() => ({
  sources: [] as { name: string; parsed: unknown }[],
  values: {} as Record<string, unknown>,
}));

vi.mock('config', () => ({
  default: {
    get: (path: string) => configMock.values[path],
    util: { getConfigSources: () => configMock.sources },
  },
}));

const DEFAULT_FILE = '/app/config/default.json';
const LOCAL_FILE = '/app/config/local.json';
const EMPTY_YAML_FILE = '/app/config/local.yaml';
const NODE_CONFIG = '$NODE_CONFIG';
const ENV_VARIABLES = '/app/config/custom-environment-variables.json';
const PACKAGED_BUCKET = 'xtmhubbucket';
const PACKAGED_REGION = 'us-east-1';
const PACKAGED_ENDPOINT = 'localhost';
const PACKAGED_PORT = 9000;
const PACKAGED_ACCESS_KEY = 'changeme';
const PACKAGED_SECRET_KEY = 'changeme';
const PACKAGED_USE_SSL = false;
const NEW_ENDPOINT = 'rustfs-host';
const FORMER_ENDPOINT = 'legacy-host';
const NEW_ACCESS_KEY = 'new-access-key';
const FORMER_ACCESS_KEY = 'former-access-key';
const NEW_VALUE = 'new-value';
const FORMER_VALUE = 'former-value';
const NEW_PORT = '9002';
const FORMER_PORT = '9000';
const MIXED_PORT = '9100';

const source = (
  name: string,
  parsed: Record<string, Record<string, unknown>>
): StorageConfigSource => ({ name, parsed });

const packagedDefaults = source(DEFAULT_FILE, {
  s3: {
    bucketName: PACKAGED_BUCKET,
    region: PACKAGED_REGION,
    endpoint: PACKAGED_ENDPOINT,
    port: PACKAGED_PORT,
    accessKeyId: PACKAGED_ACCESS_KEY,
    secretAccessKey: PACKAGED_SECRET_KEY,
    useSsl: PACKAGED_USE_SSL,
  },
});

const allSettings = (value: string) => ({
  bucketName: value,
  region: value,
  endpoint: value,
  port: value,
  accessKeyId: value,
  secretAccessKey: value,
  useSsl: value,
});

beforeEach(() => {
  configMock.sources = [];
  configMock.values = {};
});

describe('resolveStorageSection', () => {
  it.each([
    {
      context: 'only the packaged defaults are set',
      sources: [packagedDefaults],
      expected: 's3',
    },
    {
      context: 'a former variable is set',
      sources: [
        packagedDefaults,
        source(ENV_VARIABLES, { minio: { endpoint: FORMER_ENDPOINT } }),
      ],
      expected: 'minio',
    },
    {
      context: 'both names are set in the same source',
      sources: [
        packagedDefaults,
        source(ENV_VARIABLES, {
          s3: { endpoint: NEW_ENDPOINT },
          minio: { endpoint: FORMER_ENDPOINT },
        }),
      ],
      expected: 's3',
    },
    {
      context: 'a former variable overrides a new name of local.json',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { s3: { endpoint: NEW_ENDPOINT } }),
        source(ENV_VARIABLES, { minio: { endpoint: FORMER_ENDPOINT } }),
      ],
      expected: 'minio',
    },
    {
      context: 'a new variable overrides a former name of local.json',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { minio: { endpoint: FORMER_ENDPOINT } }),
        source(ENV_VARIABLES, { s3: { endpoint: NEW_ENDPOINT } }),
      ],
      expected: 's3',
    },
    {
      context:
        'a former name of NODE_CONFIG overrides a new name of local.json',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { s3: { endpoint: NEW_ENDPOINT } }),
        source(NODE_CONFIG, { minio: { endpoint: FORMER_ENDPOINT } }),
      ],
      expected: 'minio',
    },
    {
      context: 'the former name is set for another setting only',
      sources: [
        packagedDefaults,
        source(ENV_VARIABLES, { minio: { port: FORMER_PORT } }),
      ],
      expected: 's3',
    },
    {
      context: 'the former value is an empty string',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { minio: { endpoint: '' } }),
      ],
      expected: 'minio',
    },
    {
      context: 'the former value is null',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { minio: { endpoint: null } }),
      ],
      expected: 'minio',
    },
    {
      context: 'an empty configuration file has no content',
      sources: [packagedDefaults, { name: EMPTY_YAML_FILE, parsed: null }],
      expected: 's3',
    },
  ])('should read $expected when $context', ({ sources, expected }) => {
    // Given
    // the sources, from the lowest to the highest priority

    // When
    const section = resolveStorageSection('endpoint', sources);

    // Then
    expect(section).toBe(expected);
  });
});

describe('getStorageConfig', () => {
  beforeEach(() => {
    configMock.values = {
      's3.endpoint': NEW_ENDPOINT,
      'minio.endpoint': FORMER_ENDPOINT,
    };
  });

  it.each([
    {
      context: 'a former variable is set above the packaged defaults',
      sources: [
        packagedDefaults,
        source(ENV_VARIABLES, { minio: { endpoint: FORMER_ENDPOINT } }),
      ],
      expected: FORMER_ENDPOINT,
    },
    {
      context: 'a new variable is set above a former name of local.json',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { minio: { endpoint: FORMER_ENDPOINT } }),
        source(ENV_VARIABLES, { s3: { endpoint: NEW_ENDPOINT } }),
      ],
      expected: NEW_ENDPOINT,
    },
  ])('should return $expected when $context', ({ sources, expected }) => {
    // Given
    configMock.sources = sources;

    // When
    const endpoint = getStorageConfig<string>('endpoint');

    // Then
    expect(endpoint).toBe(expected);
  });

  it('should read each setting from its own section when the sections differ', () => {
    // Given
    configMock.sources = [
      packagedDefaults,
      source(ENV_VARIABLES, { minio: { port: MIXED_PORT } }),
    ];
    configMock.values = {
      ...configMock.values,
      's3.port': NEW_PORT,
      'minio.port': MIXED_PORT,
    };

    // When
    const port = getStorageConfig<string>('port');

    // Then
    expect(port).toBe(MIXED_PORT);
  });
});

describe('storageConfigDeprecations', () => {
  it.each([
    {
      context: 'only the new names are set',
      sources: [
        packagedDefaults,
        source(ENV_VARIABLES, { s3: { endpoint: NEW_ENDPOINT } }),
      ],
      expected: { used: [], ignored: [], shadowed: [] },
    },
    {
      context: 'a former variable is read',
      sources: [
        packagedDefaults,
        source(ENV_VARIABLES, { minio: { endpoint: FORMER_ENDPOINT } }),
      ],
      expected: {
        used: ['minio.endpoint (MINIO_ENDPOINT)'],
        ignored: [],
        shadowed: [],
      },
    },
    {
      context: 'a former name is hidden by a new name of higher priority',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { minio: { accessKeyId: FORMER_ACCESS_KEY } }),
        source(ENV_VARIABLES, { s3: { accessKeyId: NEW_ACCESS_KEY } }),
      ],
      expected: {
        used: [],
        ignored: ['minio.accessKeyId (MINIO_ACCESS_KEY)'],
        shadowed: [],
      },
    },
    {
      context: 'a former name is hidden by a new name of the same source',
      sources: [
        packagedDefaults,
        source(ENV_VARIABLES, {
          s3: { endpoint: NEW_ENDPOINT },
          minio: { endpoint: FORMER_ENDPOINT },
        }),
      ],
      expected: {
        used: [],
        ignored: ['minio.endpoint (MINIO_ENDPOINT)'],
        shadowed: [],
      },
    },
    {
      context: 'a new name is hidden by a former name of higher priority',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { s3: { endpoint: NEW_ENDPOINT } }),
        source(ENV_VARIABLES, { minio: { endpoint: FORMER_ENDPOINT } }),
      ],
      expected: {
        used: ['minio.endpoint (MINIO_ENDPOINT)'],
        ignored: [],
        shadowed: ['s3.endpoint (S3_ENDPOINT)'],
      },
    },
    {
      context: 'a new name of NODE_CONFIG is hidden by a former variable',
      sources: [
        packagedDefaults,
        source(NODE_CONFIG, { s3: { endpoint: NEW_ENDPOINT } }),
        source(ENV_VARIABLES, { minio: { endpoint: FORMER_ENDPOINT } }),
      ],
      expected: {
        used: ['minio.endpoint (MINIO_ENDPOINT)'],
        ignored: [],
        shadowed: ['s3.endpoint (S3_ENDPOINT)'],
      },
    },
    {
      context: 'the port of local.json is hidden by a former variable',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { s3: { port: NEW_PORT } }),
        source(ENV_VARIABLES, { minio: { port: FORMER_PORT } }),
      ],
      expected: {
        used: ['minio.port (MINIO_PORT)'],
        ignored: [],
        shadowed: ['s3.port (S3_PORT)'],
      },
    },
    {
      context: 'every setting of local.json is hidden by a former variable',
      sources: [
        packagedDefaults,
        source(LOCAL_FILE, { s3: allSettings(NEW_VALUE) }),
        source(ENV_VARIABLES, { minio: allSettings(FORMER_VALUE) }),
      ],
      expected: {
        used: [
          'minio.bucketName (MINIO_BUCKET_NAME)',
          'minio.region (MINIO_REGION)',
          'minio.endpoint (MINIO_ENDPOINT)',
          'minio.port (MINIO_PORT)',
          'minio.accessKeyId (MINIO_ACCESS_KEY)',
          'minio.secretAccessKey (MINIO_SECRET_KEY)',
          'minio.useSsl (MINIO_USE_SSL)',
        ],
        ignored: [],
        shadowed: [
          's3.bucketName (S3_BUCKET_NAME)',
          's3.region (S3_REGION)',
          's3.endpoint (S3_ENDPOINT)',
          's3.port (S3_PORT)',
          's3.accessKeyId (S3_ACCESS_KEY)',
          's3.secretAccessKey (S3_SECRET_KEY)',
          's3.useSsl (S3_USE_SSL)',
        ],
      },
    },
  ])(
    'should report the expected names when $context',
    ({ sources, expected }) => {
      // Given
      // the sources, from the lowest to the highest priority

      // When
      const deprecations = storageConfigDeprecations(sources);

      // Then
      expect(deprecations).toEqual(expected);
    }
  );
});

describe('storageConfigDeprecations without sources', () => {
  it('should read the node-config sources when it is called as at startup', () => {
    // Given
    configMock.sources = [
      packagedDefaults,
      source(ENV_VARIABLES, { minio: { endpoint: FORMER_ENDPOINT } }),
    ];

    // When
    const deprecations = storageConfigDeprecations();

    // Then
    expect(deprecations.used).toEqual(['minio.endpoint (MINIO_ENDPOINT)']);
  });
});

describe('custom-environment-variables.json', () => {
  it('should map the S3_* and the former MINIO_* variables of every storage setting', () => {
    // Given
    const mapping = JSON.parse(
      readFileSync(
        new URL(
          '../../../config/custom-environment-variables.json',
          import.meta.url
        ),
        'utf8'
      )
    );

    // When
    const storageMapping = { s3: mapping.s3, minio: mapping.minio };

    // Then
    expect(storageMapping).toEqual({
      s3: {
        bucketName: 'S3_BUCKET_NAME',
        region: 'S3_REGION',
        endpoint: 'S3_ENDPOINT',
        port: 'S3_PORT',
        accessKeyId: 'S3_ACCESS_KEY',
        secretAccessKey: 'S3_SECRET_KEY',
        useSsl: 'S3_USE_SSL',
      },
      minio: {
        bucketName: 'MINIO_BUCKET_NAME',
        region: 'MINIO_REGION',
        endpoint: 'MINIO_ENDPOINT',
        port: 'MINIO_PORT',
        accessKeyId: 'MINIO_ACCESS_KEY',
        secretAccessKey: 'MINIO_SECRET_KEY',
        useSsl: 'MINIO_USE_SSL',
      },
    });
  });
});
