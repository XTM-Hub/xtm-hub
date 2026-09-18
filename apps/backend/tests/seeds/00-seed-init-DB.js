export async function seed(knex) {
  const filigranOrganisationId = 'ba091095-418f-4b4f-b150-6c9295e232c4';
  const filigranAdminUserId = 'ba091095-418f-4b4f-b150-6c9295e232c3';
  const filigranAccessSubscriptionUserId =
    '77b4b845-4ab4-4df8-8e12-0651da813ebb';

  await knex('Organization')
    .insert([
      {
        id: filigranOrganisationId,
        name: 'Filigran',
        domains: ['filigran.io', 'internal.com'],
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('User')
    .insert([
      {
        id: filigranAdminUserId,
        email: 'admin@filigran.io',
        salt: 'fabc28ed1339f8b34c10bc3b5a650c01',
        password:
          'a0bbec7075b7aca96feb276477a5ab4b8d86c495de9b5eb1e9f44dea11a1fea7b0621437a2e437517ecf222e1c730db96c51211856fd309a6293dba2aa44c24e',
        first_name: 'Al',
        last_name: 'Beback',
        selected_organization_id: filigranOrganisationId,
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('Organization')
    .insert([
      {
        id: filigranAdminUserId,
        name: 'admin@filigran.io',
        personal_space: true,
      },
    ])
    .onConflict('id')
    .ignore();

  const adminUserOrganizations = await knex('User_Organization')
    .insert([
      {
        user_id: filigranAdminUserId,
        organization_id: filigranOrganisationId,
      },
      {
        user_id: filigranAdminUserId,
        organization_id: filigranAdminUserId,
      },
    ])
    .returning('id');

  for (const userOrg of adminUserOrganizations) {
    await knex('UserOrganization_Capability').insert([
      {
        user_organization_id: userOrg.id,
        name: 'ADMINISTRATE_ORGANIZATION',
      },
    ]);
  }

  await knex('User')
    .insert([
      {
        id: filigranAccessSubscriptionUserId,
        email: 'access-subscription@filigran.io',
        salt: 'fabc28ed1339f8b34c10bc3b5a650c01',
        password:
          'a0bbec7075b7aca96feb276477a5ab4b8d86c495de9b5eb1e9f44dea11a1fea7b0621437a2e437517ecf222e1c730db96c51211856fd309a6293dba2aa44c24e',
        first_name: 'access',
        last_name: 'subscription',
        selected_organization_id: filigranOrganisationId,
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('Organization')
    .insert([
      {
        id: filigranAccessSubscriptionUserId,
        name: 'access-subscription@filigran.io',
        personal_space: true,
      },
    ])
    .onConflict('id')
    .ignore();

  const accessSubscriptionUserOrganizations = await knex('User_Organization')
    .insert([
      {
        user_id: filigranAccessSubscriptionUserId,
        organization_id: filigranOrganisationId,
      },
      {
        user_id: filigranAccessSubscriptionUserId,
        organization_id: filigranAccessSubscriptionUserId,
      },
    ])
    .returning(['id', 'user_id', 'organization_id']);

  for (const userOrg of accessSubscriptionUserOrganizations) {
    const isPersonalSpace = userOrg.user_id === userOrg.organization_id;
    if (isPersonalSpace) {
      await knex('UserOrganization_Capability').insert([
        {
          user_organization_id: userOrg.id,
          name: 'ADMINISTRATE_ORGANIZATION',
        },
      ]);
    } else {
      await knex('UserOrganization_Capability').insert([
        {
          user_organization_id: userOrg.id,
          name: 'MANAGE_ACCESS',
        },
        {
          user_organization_id: userOrg.id,
          name: 'MANAGE_SUBSCRIPTION',
        },
      ]);
    }
  }

  await knex('RolePortal')
    .insert([{ id: '6b632cf2-9105-46ec-a463-ad59ab58c770', name: 'ADMIN' }])
    .onConflict('id')
    .ignore();

  await knex('User_RolePortal')
    .insert([
      {
        user_id: filigranAdminUserId,
        role_portal_id: '6b632cf2-9105-46ec-a463-ad59ab58c770',
      },
    ])
    .onConflict(['user_id', 'role_portal_id'])
    .ignore();

  await knex('CapabilityPortal')
    .insert([{ id: '85c9fe6f-901f-4992-a8aa-b8d56a7e2e09', name: 'BYPASS' }])
    .onConflict('id')
    .ignore();

  await knex('RolePortal_CapabilityPortal').insert([
    {
      capability_portal_id: '85c9fe6f-901f-4992-a8aa-b8d56a7e2e09',
      role_portal_id: '6b632cf2-9105-46ec-a463-ad59ab58c770',
    },
  ]);

  await knex('ServiceDefinition')
    .insert([
      {
        id: '2634d52b-f061-4ebc-bed2-c6cc94297ad1',
        name: 'ServiceDef',
        description: 'myDescription',
        public: true,
        identifier: 'vault',
      },
      {
        id: '2634d52b-f061-4ebc-bed2-c6cc94297ad2',
        name: 'csv feeds',
        description: 'csv description',
        public: true,
        identifier: 'opencti_integrations',
      },
      {
        id: '97280ba3-8587-4a3e-87ad-ed279b0e768f',
        name: 'openaev scenarios',
        description: 'openaev scenario description',
        public: true,
        identifier: 'openaev_scenarios',
      },
      {
        id: 'e974c9c3-f3c5-4b48-b183-a73ff218dec1',
        name: 'custom dashboards',
        description: 'custom dashboards description',
        public: true,
        identifier: 'opencti_custom_dashboards',
      },
      {
        id: 'ecc973c4-575f-4618-b3a4-ebabb9b42a81',
        name: 'XTM Platform Roadmap',
        description: 'Explore and follow the Filigran XTM Platform roadmap',
        public: true,
        identifier: 'xtm_platform_roadmap',
      },
      {
        id: '3c8e4f4b-9c2a-4e3d-8b5f-7d9a0c1b2e3f',
        name: 'opencti playbooks',
        description: 'opencti playbook description',
        public: true,
        identifier: 'opencti_playbooks',
      },
      {
        id: '17bda799-12c9-4039-b4d9-a8834494e234',
        name: 'custom views',
        description: 'custom views description',
        public: true,
        identifier: 'opencti_custom_views',
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('ServiceInstance')
    .insert([
      {
        id: 'e88e8f80-ba9e-480b-ab27-8613a1565eff',
        name: 'Vault',
        description: 'short description for Vault',
        creation_status: 'READY',
        public: false,
        tags: '{others}',
        service_definition_id: '2634d52b-f061-4ebc-bed2-c6cc94297ad1',
        ordering: 12,
      },
      {
        id: 'ad003d3f-c406-4be8-a650-880d72f952e9',
        name: 'csv feeds',
        description: 'short description for csv feeds',
        creation_status: 'READY',
        public: true,
        tags: '{others}',
        service_definition_id: '2634d52b-f061-4ebc-bed2-c6cc94297ad2',
        ordering: 13,
      },
      {
        id: 'f61ee5ca-4b4f-4f94-9cb7-69b1b1c885a2',
        name: 'open aev scenarios',
        description: 'short description for open aev scenarios',
        creation_status: 'READY',
        public: true,
        tags: '{others}',
        service_definition_id: '97280ba3-8587-4a3e-87ad-ed279b0e768f',
        ordering: 14,
      },
      {
        id: 'e1fb0d3f-a090-41c7-b183-8d949f6c2ba4',
        name: 'custom dashboards',
        description: 'short description for custom dashboards',
        creation_status: 'READY',
        public: true,
        tags: '{others}',
        service_definition_id: 'e974c9c3-f3c5-4b48-b183-a73ff218dec1',
        ordering: 15,
      },
      {
        id: '3260f536-49b8-4c6f-8e87-61c8be1ae103',
        name: 'XTM Platform Roadmap',
        description: 'Explore and follow the Filigran XTM Platform roadmap',
        creation_status: 'READY',
        public: true,
        tags: '{others}',
        service_definition_id: 'ecc973c4-575f-4618-b3a4-ebabb9b42a81',
        ordering: 15,
        slug: 'xtm-platform-roadmap',
      },
      {
        id: '01345f38-8a2b-4f3a-a731-9bd0cbb5fa58',
        name: 'opencti playbooks',
        description: 'short description for opencti playbooks',
        creation_status: 'READY',
        public: true,
        tags: '{others}',
        service_definition_id: '3c8e4f4b-9c2a-4e3d-8b5f-7d9a0c1b2e3f',
        ordering: 16,
      },
      {
        id: '9785fa07-309f-47ab-bcc0-c0c3447f7e29',
        name: 'custom views',
        description: 'short description for custom views',
        creation_status: 'READY',
        public: true,
        tags: '{others}',
        service_definition_id: '17bda799-12c9-4039-b4d9-a8834494e234',
        ordering: 17,
        slug: 'opencti-custom-views',
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('Service_Link')
    .insert([
      {
        id: '2baba29b-62f5-4d50-8d68-eb8a25887d9c',
        service_instance_id: 'e88e8f80-ba9e-480b-ab27-8613a1565eff',
        url: '/service/vault',
        name: 'Vault',
      },
    ])
    .onConflict('id')
    .ignore();
}
