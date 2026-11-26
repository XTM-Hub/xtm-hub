// TDR-34, chunk H1: a registration authenticates with an Ed25519 public key, a token, or both while it migrates.

const CREDENTIAL_CHECK = 'platformconfiguration_credential_check';
const PUBLIC_KEY_CHECK = 'platformconfiguration_public_key_check';
const PUBLIC_KEY_ID_CHECK = 'platformconfiguration_public_key_id_check';
const PLATFORM_KEY_UNIQUE = 'platformconfiguration_platform_tenant_key_unique';
const JTI_CHECK = 'platformassertionjti_jti_check';
// Stands for "no tenant" in the unique index, where two nulls would otherwise never collide.
const NO_TENANT = '00000000-0000-0000-0000-000000000000';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('PlatformConfiguration', (table) => {
    // The public JWK sent by the product, never a private key.
    table.jsonb('public_key').nullable();
    // The JWK kid, compared with the kid in the header of each assertion.
    table.text('public_key_id').nullable();
    table.timestamp('key_enrolled_at', { useTz: true }).nullable();
    // Enrolling a key revokes the token of that registration.
    table.setNullable('token');
    table.check(
      'token IS NOT NULL OR public_key IS NOT NULL',
      [],
      CREDENTIAL_CHECK
    );
    // A stored key always comes with its kid and its enrollment date.
    table.check(
      '(public_key IS NULL) = (public_key_id IS NULL) AND (public_key IS NULL) = (key_enrolled_at IS NULL)',
      [],
      PUBLIC_KEY_CHECK
    );
    table.check(
      'public_key_id IS NULL OR char_length(public_key_id) BETWEEN 1 AND 255',
      [],
      PUBLIC_KEY_ID_CHECK
    );
  });

  // The signed call finds its registration by platform, tenant and key id: one registration at most, and indexed.
  // Every existing row has a null key id, so nothing can collide when the index is built.
  await knex.raw(
    `CREATE UNIQUE INDEX ?? ON "PlatformConfiguration" (platform_id, COALESCE(tenant_id, '${NO_TENANT}'::uuid), public_key_id) WHERE public_key_id IS NOT NULL`,
    [PLATFORM_KEY_UNIQUE]
  );

  await knex.schema.alterTable('DeploymentRequest', (table) => {
    table.timestamp('platform_token_consumed_at', { useTz: true }).nullable();
  });

  // Assertion ids already accepted, kept until the assertion can no longer be accepted, to refuse replays.
  await knex.schema.createTable('PlatformAssertionJti', (table) => {
    table.text('jti').primary();
    table.timestamp('expires_at', { useTz: true }).notNullable().index();
    table.check('char_length(jti) BETWEEN 1 AND 255', [], JTI_CHECK);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTable('PlatformAssertionJti');

  await knex.schema.alterTable('DeploymentRequest', (table) => {
    table.dropColumn('platform_token_consumed_at');
  });

  // A registration that only has a key gets a token nobody knows: its product's calls are refused until an admin
  // registers it again, but the registration and its subscriptions stay.
  await knex('PlatformConfiguration')
    .whereNull('token')
    .update({ token: knex.raw('gen_random_uuid()') });

  await knex.raw('DROP INDEX ??', [PLATFORM_KEY_UNIQUE]);

  await knex.schema.alterTable('PlatformConfiguration', (table) => {
    table.dropChecks([PUBLIC_KEY_ID_CHECK, PUBLIC_KEY_CHECK, CREDENTIAL_CHECK]);
    table.dropNullable('token');
    table.dropColumns('public_key', 'public_key_id', 'key_enrolled_at');
  });
}
