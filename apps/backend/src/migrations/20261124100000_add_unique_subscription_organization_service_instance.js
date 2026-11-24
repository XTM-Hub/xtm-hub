const CONSTRAINT_NAME = 'subscription_organization_service_instance_unique';
const MIGRATION_NAME =
  '20261124100000_add_unique_subscription_organization_service_instance';
const REPLACED_INDEX_NAME = 'idx_subscription_organization_service_instance';

/**
 * Merges the subscription `duplicateId` into `keptId`, then deletes it.
 * @param { import("knex").Knex } knex
 * @param { string } keptId
 * @param { string } duplicateId
 * @returns { Promise<Record<string, unknown>> } what the merge did, for the deploy logs
 */
async function mergeSubscription(knex, keptId, duplicateId) {
  // Subscription capabilities both rows have: repoint the user capabilities to the kept row's one.
  const repointed = await knex.raw(
    `
    UPDATE "UserService_Capability" usc
    SET subscription_capability_id = kept_sc.id
    FROM "Subscription_Capability" dup_sc
    JOIN "Subscription_Capability" kept_sc
      ON kept_sc.subscription_id = :keptId
     AND kept_sc.service_capability_id = dup_sc.service_capability_id
    WHERE dup_sc.subscription_id = :duplicateId
      AND usc.subscription_capability_id = dup_sc.id
      AND NOT EXISTS (
        SELECT 1 FROM "UserService_Capability" existing
        WHERE existing.user_service_id IS NOT DISTINCT FROM usc.user_service_id
          AND existing.generic_service_capability_id IS NOT DISTINCT FROM usc.generic_service_capability_id
          AND existing.subscription_capability_id = kept_sc.id
      )
    `,
    { keptId, duplicateId }
  );

  // The ones only the duplicate has move as they are, so the user capabilities linked to them stay valid.
  const movedCapabilities = await knex.raw(
    `
    UPDATE "Subscription_Capability" dup_sc
    SET subscription_id = :keptId
    WHERE dup_sc.subscription_id = :duplicateId
      AND NOT EXISTS (
        SELECT 1 FROM "Subscription_Capability" kept_sc
        WHERE kept_sc.subscription_id = :keptId
          AND kept_sc.service_capability_id = dup_sc.service_capability_id
      )
    `,
    { keptId, duplicateId }
  );

  const { rows: duplicateUserServices } = await knex.raw(
    `SELECT id, user_id FROM "User_Service" WHERE subscription_id = :duplicateId ORDER BY id`,
    { duplicateId }
  );

  let movedUserServices = 0;
  let mergedUserServices = 0;
  let movedUserCapabilities = 0;
  let copiedPersonalData = 0;

  for (const duplicateUserService of duplicateUserServices) {
    const { rows: keptUserServices } = await knex.raw(
      `SELECT id FROM "User_Service" WHERE subscription_id = :keptId AND user_id = :userId ORDER BY id LIMIT 1`,
      { keptId, userId: duplicateUserService.user_id }
    );

    if (keptUserServices.length === 0) {
      await knex.raw(
        `UPDATE "User_Service" SET subscription_id = :keptId WHERE id = :userServiceId`,
        { keptId, userServiceId: duplicateUserService.id }
      );
      movedUserServices += 1;
      continue;
    }

    const keptUserServiceId = keptUserServices[0].id;
    const movedCapabilitiesToKept = await knex.raw(
      `
      UPDATE "UserService_Capability" usc
      SET user_service_id = :keptUserServiceId
      WHERE usc.user_service_id = :duplicateUserServiceId
        AND NOT EXISTS (
          SELECT 1 FROM "UserService_Capability" existing
          WHERE existing.user_service_id = :keptUserServiceId
            AND existing.generic_service_capability_id IS NOT DISTINCT FROM usc.generic_service_capability_id
            AND existing.subscription_capability_id IS NOT DISTINCT FROM usc.subscription_capability_id
        )
      `,
      { keptUserServiceId, duplicateUserServiceId: duplicateUserService.id }
    );
    const copiedData = await knex.raw(
      `
      UPDATE "User_Service"
      SET service_personal_data = (
        SELECT service_personal_data FROM "User_Service" WHERE id = :duplicateUserServiceId
      )
      WHERE id = :keptUserServiceId AND service_personal_data IS NULL
      `,
      { keptUserServiceId, duplicateUserServiceId: duplicateUserService.id }
    );
    mergedUserServices += 1;
    movedUserCapabilities += movedCapabilitiesToKept.rowCount;
    copiedPersonalData += copiedData.rowCount;
  }

  const { rows: mergedDates } = await knex.raw(
    `
    UPDATE "Subscription" kept
    SET start_date = LEAST(kept.start_date, dup.start_date),
        end_date = CASE
          WHEN kept.end_date IS NULL OR dup.end_date IS NULL THEN NULL
          ELSE GREATEST(kept.end_date, dup.end_date)
        END
    FROM "Subscription" dup
    WHERE kept.id = :keptId AND dup.id = :duplicateId
    RETURNING kept.start_date, kept.end_date
    `,
    { keptId, duplicateId }
  );

  // Cascades what was not moved: leftover user services and capabilities.
  await knex.raw(`DELETE FROM "Subscription" WHERE id = :duplicateId`, {
    duplicateId,
  });

  const [{ start_date: startDate, end_date: endDate }] = mergedDates;
  return {
    mergedSubscriptionId: duplicateId,
    subscriptionCapabilitiesMoved: movedCapabilities.rowCount,
    userCapabilitiesRepointed: repointed.rowCount,
    userServicesMoved: movedUserServices,
    userServicesMerged: mergedUserServices,
    userCapabilitiesMoved: movedUserCapabilities,
    personalDataCopied: copiedPersonalData,
    keptStartDate: startDate,
    keptEndDate: endDate,
  };
}

/**
 * One single-line JSON per call, so the deploy logs can be filtered and parsed.
 * @param { string } event
 * @param { Record<string, unknown> } fields
 */
function logMigration(event, fields) {
  console.warn(JSON.stringify({ migration: MIGRATION_NAME, event, ...fields }));
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`SET LOCAL lock_timeout = '10s'`);

  // Blocks inserts from a pod still on the previous version between the merge and the constraint.
  await knex.raw(`LOCK TABLE "Subscription" IN SHARE ROW EXCLUSIVE MODE`);

  const { rows: duplicatedPairs } = await knex.raw(`
    SELECT organization_id, service_instance_id
    FROM "Subscription"
    GROUP BY organization_id, service_instance_id
    HAVING count(*) > 1
  `);

  if (duplicatedPairs.length > 0) {
    // The merge rewrites these tables: block writes from a pod still on the previous version until commit.
    await knex.raw(
      `LOCK TABLE "User_Service", "Subscription_Capability", "UserService_Capability" IN SHARE ROW EXCLUSIVE MODE`
    );
  }

  for (const pair of duplicatedPairs) {
    const { rows: subscriptions } = await knex.raw(
      `
      SELECT id FROM "Subscription"
      WHERE organization_id = :organizationId AND service_instance_id = :serviceInstanceId
      ORDER BY start_date ASC NULLS LAST, id ASC
      `,
      {
        organizationId: pair.organization_id,
        serviceInstanceId: pair.service_instance_id,
      }
    );
    const [kept, ...duplicates] = subscriptions;
    const orderedDuplicates = duplicates.sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    );

    logMigration('subscription_duplicate_pair_found', {
      organizationId: pair.organization_id,
      serviceInstanceId: pair.service_instance_id,
      keptSubscriptionId: kept.id,
      mergedSubscriptionIds: orderedDuplicates.map(({ id }) => id),
    });
    for (const duplicate of orderedDuplicates) {
      logMigration('subscription_duplicate_merged', {
        organizationId: pair.organization_id,
        serviceInstanceId: pair.service_instance_id,
        keptSubscriptionId: kept.id,
        ...(await mergeSubscription(knex, kept.id, duplicate.id)),
      });
    }
  }

  await knex.schema.alterTable('Subscription', (table) => {
    table.unique(['organization_id', 'service_instance_id'], {
      indexName: CONSTRAINT_NAME,
    });
  });

  await knex.raw(`DROP INDEX IF EXISTS ${REPLACED_INDEX_NAME}`);
}

/**
 * The merge of duplicated subscriptions is not reversible.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('Subscription', (table) => {
    table.dropUnique(
      ['organization_id', 'service_instance_id'],
      CONSTRAINT_NAME
    );
  });

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${REPLACED_INDEX_NAME}
    ON "Subscription" ("organization_id", "service_instance_id")
  `);
}
