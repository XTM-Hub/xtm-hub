import * as s3 from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import config from 'config';
import { v4 as uuidv4 } from 'uuid';

const VAULT_IDENTIFIER = 'vault';

// Mirrors src/thirdparty/minio/client.ts — a migration cannot import
// application source, so the S3 client construction is duplicated here.
const getEndpoint = () => {
  if (config.get('minio.endpoint') === 's3.amazonaws.com') {
    return undefined;
  }
  return `${config.get('minio.useSsl') === 'true' ? 'https' : 'http'}://${config.get('minio.endpoint')}:${config.get('minio.port')}`;
};

const buildS3Client = () =>
  new S3Client({
    region: config.get('minio.region'),
    endpoint: getEndpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.get('minio.accessKeyId'),
      secretAccessKey: config.get('minio.secretAccessKey'),
    },
    tls: config.get('minio.useSsl') === 'true',
  });

const deleteMinioFile = async (s3Client, minioName) => {
  try {
    await s3Client.send(
      new s3.DeleteObjectCommand({
        Bucket: config.get('minio.bucketName'),
        Key: minioName,
      })
    );
  } catch (err) {
    console.error(
      `Failed to delete Partner Vault document file from storage (minio_name: ${minioName}):`,
      err
    );
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const vaultServiceDefinition = await knex('ServiceDefinition')
    .where({ identifier: VAULT_IDENTIFIER })
    .first();

  if (!vaultServiceDefinition) {
    return;
  }

  const vaultServiceInstances = await knex('ServiceInstance')
    .where({ service_definition_id: vaultServiceDefinition.id })
    .select('id');
  const vaultServiceInstanceIds = vaultServiceInstances.map(
    (instance) => instance.id
  );

  if (vaultServiceInstanceIds.length > 0) {
    const vaultDocuments = await knex('Document')
      .whereIn('service_instance_id', vaultServiceInstanceIds)
      .whereNotNull('minio_name')
      .select('minio_name');

    if (vaultDocuments.length > 0) {
      const s3Client = buildS3Client();
      await Promise.all(
        vaultDocuments.map((document) =>
          deleteMinioFile(s3Client, document.minio_name)
        )
      );
    }

    // Cascades (ON DELETE CASCADE): Subscription, Service_Link, Document
    // (which itself cascades Document_Metadata / Document_Children),
    // User_Service (via Subscription) and Subscription_Capability /
    // UserService_Capability (via Subscription / User_Service).
    await knex('ServiceInstance').whereIn('id', vaultServiceInstanceIds).del();
  }

  // Service_Capability has no cascading delete from ServiceDefinition, but by
  // now no Subscription_Capability row can reference it (they were removed by
  // the ServiceInstance cascade above), so it's safe to delete directly.
  await knex('Service_Capability')
    .where({ service_definition_id: vaultServiceDefinition.id })
    .del();

  await knex('ServiceDefinition')
    .where({ id: vaultServiceDefinition.id })
    .del();
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const existing = await knex('ServiceDefinition')
    .where({ identifier: VAULT_IDENTIFIER })
    .first();
  if (existing) {
    return;
  }

  // NOTE: this only restores the service definition and its capabilities so
  // the schema-level change is reversible. Any ServiceInstance rows,
  // documents and uploaded files that existed before `up()` ran, along with
  // the associated subscriptions, were permanently deleted and cannot be
  // recreated here.
  const serviceDefinitionId = uuidv4();
  await knex('ServiceDefinition').insert({
    id: serviceDefinitionId,
    name: 'Vault',
    description: 'Vault services to share information',
    public: true,
    identifier: VAULT_IDENTIFIER,
  });

  await knex('Service_Capability').insert([
    {
      id: uuidv4(),
      name: 'UPLOAD',
      description: 'The user can upload documents in this service.',
      service_definition_id: serviceDefinitionId,
    },
    {
      id: uuidv4(),
      name: 'DELETE',
      description: 'The user can delete documents in this service.',
      service_definition_id: serviceDefinitionId,
    },
  ]);
}
