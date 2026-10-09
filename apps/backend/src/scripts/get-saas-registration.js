// Run from apps/backend with: yarn tsx src/scripts/get-saas-registration.js
import config from 'config';
import Knex from 'knex';
import { SaasManagerClient } from '../thirdparty/saasmanager/client';

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

async function isSaasPlatform(platformId) {
  const response = await SaasManagerClient.callInstanceApi({
    platform_id: platformId,
  });
  if (response.ok) {
    const responseBody = await response.json();
    return responseBody.commercial_model === 'PROD';
  }
  if (response.status === 404) {
    return false;
  }
  throw new Error(`SaaS Manager returned HTTP ${response.status}`);
}

async function run() {
  const platformConfigurations = await knex('PlatformConfiguration').select(
    'service_instance_id',
    'platform_id'
  );
  // eslint-disable-next-line no-console
  console.log(`${platformConfigurations.length} platform configurations found`);

  const saasByPlatformId = new Map();
  let saasCount = 0;
  let failureCount = 0;

  for (const platformConfiguration of platformConfigurations) {
    const { service_instance_id, platform_id } = platformConfiguration;
    try {
      if (!saasByPlatformId.has(platform_id)) {
        saasByPlatformId.set(platform_id, await isSaasPlatform(platform_id));
      }
      if (!saasByPlatformId.get(platform_id)) {
        continue;
      }

      await knex('PlatformConfiguration')
        .where({ service_instance_id })
        .update({ commercial_model: 'SAAS' });
      saasCount++;
      // eslint-disable-next-line no-console
      console.log(`Platform ${platform_id} set to SAAS`);
    } catch (err) {
      failureCount++;
      console.error(
        `❌ Could not determine the commercial model of platform ${platform_id}`,
        err
      );
    }
  }

  await knex.destroy();
  // eslint-disable-next-line no-console
  console.log(
    `✅ ${saasCount} platform configurations set to SAAS, ${failureCount} failures`
  );
}

run().catch(async (err) => {
  console.error('❌ SaaS registration update failed', err);
  await knex.destroy();
  process.exit(1);
});
