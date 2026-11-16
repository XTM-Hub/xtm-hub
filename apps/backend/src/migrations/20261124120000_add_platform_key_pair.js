// TDR-34, chunk H1: a registration authenticates with an Ed25519 public key, a token, or both while it migrates.

const CREDENTIAL_CHECK = 'platformconfiguration_credential_check';
const PUBLIC_KEY_CHECK = 'platformconfiguration_public_key_check';

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
  });

  await knex.schema.alterTable('DeploymentRequest', (table) => {
    table.timestamp('platform_token_consumed_at', { useTz: true }).nullable();
  });

  // Assertion ids already accepted, kept until the assertion can no longer be accepted, to refuse replays.
  await knex.schema.createTable('PlatformAssertionJti', (table) => {
    table.text('jti').primary();
    table.timestamp('expires_at', { useTz: true }).notNullable().index();
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

  await knex.schema.alterTable('PlatformConfiguration', (table) => {
    table.dropChecks([PUBLIC_KEY_CHECK, CREDENTIAL_CHECK]);
    table.dropNullable('token');
    table.dropColumns('public_key', 'public_key_id', 'key_enrolled_at');
  });
}
