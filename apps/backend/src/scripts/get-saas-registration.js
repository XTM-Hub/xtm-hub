// Run from apps/backend with: yarn tsx src/scripts/get-saas-registration.js
import config from 'config';
import Knex from 'knex';

const knex = Knex({
  client: 'pg',
  connection: {
    host: config.get('database.host'),
    port: config.get('database.port'),
    user: config.get('database.user'),
    password: config.get('database.password'),
    database:
      process.env.VITEST_MODE || process.env.NODE_ENV === 'test'
        ? config.get('database-test.database')
        : config.get('database.database'),
  },
  pool: { min: 0, max: 5 },
});

// A platform the SaaS Manager pushed to the Hub as PROD is a SaaS platform: its OTHER configurations are stored as SAAS.
async function run() {
  const updated = await knex('PlatformConfiguration')
    .where({ commercial_model: 'OTHER' })
    .whereExists(
      knex('SaasManagerInstance')
        .select(knex.raw('1'))
        .whereRaw(
          '"SaasManagerInstance"."id" = "PlatformConfiguration"."platform_id"'
        )
        .whereRaw(`"SaasManagerInstance"."data"->>'commercial_model' = 'PROD'`)
    )
    .update({ commercial_model: 'SAAS' })
    .returning('platform_id');

  for (const { platform_id } of updated) {
    // eslint-disable-next-line no-console
    console.log(`Platform ${platform_id} set to SAAS`);
  }

  await knex.destroy();
  // eslint-disable-next-line no-console
  console.log(`✅ ${updated.length} platform configurations set to SAAS`);
}

run().catch(async (err) => {
  console.error('❌ SaaS registration update failed', err);
  await knex.destroy();
  process.exit(1);
});
