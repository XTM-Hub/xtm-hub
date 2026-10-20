import crypto from 'node:crypto';

// Demo data for development and feature environments: a CSM portal role and
// two customer organizations, each with an organization administrator and a
// plain member. This seed runs at every backend start, so it only creates what
// is missing and never modifies an existing row (in particular, an existing
// user keeps its password, memberships and roles).

const PLATFORM_ORGANIZATION_ID = 'ba091095-418f-4b4f-b150-6c9295e232c4';
const ADMINISTRATE_ORGANIZATION = 'ADMINISTRATE_ORGANIZATION';

const READ_SAAS_METRICS_CAPABILITY = {
  // Inserted by the 20261005142536_add_read_saas_metrics_capa migration.
  id: '72dd8594-e8d2-4053-9cef-b51ffb497472',
  name: 'READ_SAAS_METRICS',
};

const CSM_ROLE = {
  id: 'd2a9672e-323d-437d-b128-ba1fe7ac8e38',
  name: 'CSM',
};

const WINTERFELL = {
  id: '1cffd623-9594-4cf5-b1ab-69aaa4c3b3dd',
  name: 'Winterfell',
  domains: ['winterfell.example'],
  personal_space: false,
};

const CASTERLY_ROCK = {
  id: 'd7f2fd3d-b1c9-4ab5-99bd-dbfee094b025',
  name: 'Casterly Rock',
  domains: ['casterly-rock.example'],
  personal_space: false,
};

const USERS = [
  {
    id: '568dfe43-8ee5-4f0f-8897-ea39372fcfe8',
    email: 'Samwell.Tarly@filigran.io',
    first_name: 'Samwell',
    last_name: 'Tarly',
    organization: { id: PLATFORM_ORGANIZATION_ID },
    organization_capabilities: [],
    role_names: [CSM_ROLE.name],
  },
  {
    id: '32b22721-0e3f-4cbe-b692-818fdfb91e47',
    email: 'Sansa.Stark@winterfell.example',
    first_name: 'Sansa',
    last_name: 'Stark',
    organization: WINTERFELL,
    organization_capabilities: [ADMINISTRATE_ORGANIZATION],
    role_names: [],
  },
  {
    id: '3d0c4af0-5adc-4028-837c-1500309f76af',
    email: 'Bran.Stark@winterfell.example',
    first_name: 'Bran',
    last_name: 'Stark',
    organization: WINTERFELL,
    organization_capabilities: [],
    role_names: [],
  },
  {
    id: '533614d9-8beb-42f4-b4b3-a28fc149c712',
    email: 'Cersei.Lannister@casterly-rock.example',
    first_name: 'Cersei',
    last_name: 'Lannister',
    organization: CASTERLY_ROCK,
    organization_capabilities: [ADMINISTRATE_ORGANIZATION],
    role_names: [],
  },
  {
    id: 'd6b7d02a-e249-4dd8-85f1-d8b88eb9c27e',
    email: 'Jaime.Lannister@casterly-rock.example',
    first_name: 'Jaime',
    last_name: 'Lannister',
    organization: CASTERLY_ROCK,
    organization_capabilities: [],
    role_names: [],
  },
];

// Serializes concurrent backend starts sharing the same database.
const SEED_LOCK_KEY = 'seed:12-development-demo-organizations';

/**
 * Same scheme as src/utils/hash-password.util.ts. The password is random and
 * never stored nor printed: a platform administrator sets a known one from the
 * user edition form when the account is needed.
 */
const hashRandomPassword = () => {
  const password = crypto.randomBytes(32).toString('base64url');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return { salt, hash };
};

/** Returns the id of the row named `row.name`, inserting `row` when missing. */
const ensureNamedRow = async (trx, table, row) => {
  const existing = await trx(table).where({ name: row.name }).first('id');
  if (existing) {
    return { id: existing.id, created: false };
  }
  await trx(table).insert(row);
  return { id: row.id, created: true };
};

const ensureCsmRole = async (trx) => {
  const capability = await ensureNamedRow(
    trx,
    'CapabilityPortal',
    READ_SAAS_METRICS_CAPABILITY
  );
  const role = await ensureNamedRow(trx, 'RolePortal', CSM_ROLE);
  // An existing CSM role keeps the capabilities it was given.
  if (role.created) {
    await trx('RolePortal_CapabilityPortal').insert({
      role_portal_id: role.id,
      capability_portal_id: capability.id,
    });
  }
  return role.id;
};

const addMembership = async (trx, userId, organizationId, capabilities) => {
  const [userOrganization] = await trx('User_Organization')
    .insert({ user_id: userId, organization_id: organizationId })
    .returning('id');
  if (capabilities.length > 0) {
    await trx('UserOrganization_Capability').insert(
      capabilities.map((name) => ({
        user_organization_id: userOrganization.id,
        name,
      }))
    );
  }
};

const createUser = async (trx, user, organizationId, roleIdsByName) => {
  // The personal space is named after the email: a leftover organization of a
  // deleted account would hold that name, so skip the user rather than fail.
  const [personalSpace] = await trx('Organization')
    .insert({ id: user.id, name: user.email, personal_space: true })
    .onConflict()
    .ignore()
    .returning('id');
  if (!personalSpace) {
    console.error(
      `Skipping demo user ${user.email}: an organization already uses its personal space id or name`
    );
    return;
  }

  const { salt, hash } = hashRandomPassword();
  // status, invitation_date and disabled stay null: an active account, not an
  // invitation waiting to be accepted.
  await trx('User').insert({
    id: user.id,
    email: user.email,
    salt,
    password: hash,
    first_name: user.first_name,
    last_name: user.last_name,
    selected_organization_id: organizationId,
  });

  await addMembership(trx, user.id, user.id, [ADMINISTRATE_ORGANIZATION]);
  await addMembership(
    trx,
    user.id,
    organizationId,
    user.organization_capabilities
  );

  if (user.role_names.length > 0) {
    await trx('User_RolePortal').insert(
      user.role_names.map((roleName) => ({
        user_id: user.id,
        role_portal_id: roleIdsByName[roleName],
      }))
    );
  }
};

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [SEED_LOCK_KEY]);

    const roleIdsByName = { [CSM_ROLE.name]: await ensureCsmRole(trx) };

    const organizationIds = {
      [PLATFORM_ORGANIZATION_ID]: PLATFORM_ORGANIZATION_ID,
    };
    for (const organization of [WINTERFELL, CASTERLY_ROCK]) {
      const { id } = await ensureNamedRow(trx, 'Organization', organization);
      organizationIds[organization.id] = id;
    }

    for (const user of USERS) {
      const existingUser = await trx('User')
        .where({ email: user.email })
        .orWhere({ id: user.id })
        .first('id');
      if (existingUser) {
        continue;
      }
      await createUser(
        trx,
        user,
        organizationIds[user.organization.id],
        roleIdsByName
      );
    }
  });
}
