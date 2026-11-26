import { db } from './db-connection';
import { ADMIN_USER } from './const';
import { v4 as uuidv4 } from 'uuid';

export const removeUser = async (email: string) => {
  await db('User').delete('*').where('email', '=', email);
};

export const createUserWithPersonalSpace = async (email: string) => {
  const existingUser = await db('User')
    .select('id')
    .where('email', '=', email)
    .first();
  if (existingUser) {
    return { userId: existingUser.id };
  }

  const userId = uuidv4();

  await db('Organization').insert({
    id: userId,
    name: email,
    personal_space: true,
  });

  await db('User').insert({
    id: userId,
    email,
    salt: ADMIN_USER.PASSWORD_SALT,
    password: ADMIN_USER.PASSWORD_HASH,
    first_name: 'Pending',
    last_name: 'User',
    selected_organization_id: userId,
  });

  await db('User_Organization').insert({
    user_id: userId,
    organization_id: userId,
  });

  return { userId };
};

export const addPendingUserToOrganization = async (
  userEmail: string,
  organizationName: string
) => {
  const user = await db('User')
    .select('id')
    .where('email', '=', userEmail)
    .first();
  if (!user) {
    throw new Error(`User not found for email: ${userEmail}`);
  }

  const organization = await db('Organization')
    .select('id')
    .where('name', '=', organizationName)
    .first();
  if (!organization) {
    throw new Error(`Organization not found for name: ${organizationName}`);
  }

  const existingPendingUser = await db('User_Organization_Pending')
    .select('id')
    .where('user_id', '=', user.id)
    .andWhere('organization_id', '=', organization.id)
    .first();

  if (!existingPendingUser) {
    await db('User_Organization_Pending').insert({
      user_id: user.id,
      organization_id: organization.id,
    });
  }

  return { userId: user.id, organizationId: organization.id };
};

// A user with a personal space who belongs to an organization, created if missing, holding the given capabilities
// there. It signs in with the password of the seeded users.
export const createOrganizationMember = async ({
  email,
  organizationName,
  capabilities,
}: {
  email: string;
  organizationName: string;
  capabilities: string[];
}) => {
  const { userId } = await createUserWithPersonalSpace(email);

  let organization = await db('Organization')
    .select('id')
    .where('name', '=', organizationName)
    .first();
  if (!organization) {
    organization = { id: uuidv4() };
    await db('Organization').insert({
      id: organization.id,
      name: organizationName,
    });
  }

  const [userOrganization] = await db('User_Organization')
    .insert({ user_id: userId, organization_id: organization.id })
    .returning('id');
  if (capabilities.length > 0) {
    await db('UserOrganization_Capability').insert(
      capabilities.map((name) => ({
        user_organization_id: userOrganization.id,
        name,
      }))
    );
  }

  return { userId, organizationId: organization.id };
};
