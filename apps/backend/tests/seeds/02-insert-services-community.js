export async function seed(knex) {
  // Dedicated, unused-elsewhere ServiceInstance so this fixture's Subscription
  // does not interfere with per-instance subscription-count assertions in
  // other test files that reuse the shared SERVICES.INSTANCES.* fixtures.
  await knex('ServiceInstance')
    .insert([
      {
        id: 'b382537e-1cfd-4316-bd1d-ec83f4e1ef54',
        name: 'community',
        description: 'short description for community',
        creation_status: 'READY',
        public: true,
        tags: '{others}',
        service_definition_id: '2634d52b-f061-4ebc-bed2-c6cc94297ad2',
        ordering: 18,
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('Subscription')
    .insert([
      {
        id: '7f17820c-3a36-4023-ae3c-e2c15613b518',
        organization_id: 'ba091095-418f-4b4f-b150-6c9295e232c4',
        service_instance_id: 'b382537e-1cfd-4316-bd1d-ec83f4e1ef54',
        start_date: '2024-08-08',
        end_date: null,
      },
    ])
    .onConflict('id')
    .ignore();
  await knex('User_Service')
    .insert([
      {
        id: '4055e8a2-5ee2-4438-b422-62ff2e6c027f',
        user_id: 'ba091095-418f-4b4f-b150-6c9295e232c3',
        subscription_id: '7f17820c-3a36-4023-ae3c-e2c15613b518',
        service_personal_data: null,
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('Generic_Service_Capability')
    .insert([
      {
        id: 'b3275212-6c80-42de-8508-b7b71d5926fc',
        name: 'MANAGE_ACCESS',
      },
      {
        id: 'cfa2f967-48ae-4057-b079-93daa4c22f2d',
        name: 'ACCESS',
      },
    ])
    .onConflict('id')
    .ignore();

  await knex('UserService_Capability')
    .insert([
      {
        id: '4995ba04-4cdd-48f9-8246-48bf08c1b009',
        user_service_id: '4055e8a2-5ee2-4438-b422-62ff2e6c027f',
        generic_service_capability_id: 'b3275212-6c80-42de-8508-b7b71d5926fc',
      },
      {
        id: '690bcde4-3c38-4b45-bdbb-9267da8385a0',
        user_service_id: '4055e8a2-5ee2-4438-b422-62ff2e6c027f',
        generic_service_capability_id: 'cfa2f967-48ae-4057-b079-93daa4c22f2d',
      },
    ])
    .onConflict('id')
    .ignore();
}
