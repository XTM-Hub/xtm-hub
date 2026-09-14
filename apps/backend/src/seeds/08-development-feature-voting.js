export async function seed(knex) {
  const BYPASS_USER_ID = 'ba091095-418f-4b4f-b150-6c9295e232c3';

  // The rounds are attached to the Public Roadmap service instance created by
  // the 20260226100000_add_public_roadmap_service migration.
  const publicRoadmapService = await knex('ServiceInstance')
    .join(
      'ServiceDefinition',
      'ServiceInstance.service_definition_id',
      'ServiceDefinition.id'
    )
    .where('ServiceDefinition.identifier', 'xtm_platform_roadmap')
    .select('ServiceInstance.id')
    .first();

  if (!publicRoadmapService) {
    console.error('public roadmap service instance not found during seeding');
    return;
  }

  const voterEmails = [
    'Tyrion.Lannister@filigran.io',
    'Arya.Stark@filigran.io',
    'Sandor.Clegane@filigran.io',
    'Brienne.Tarth@filigran.io',
  ];
  const voters = await knex('User').whereIn('email', voterEmails).select('id');
  const voterIds = [BYPASS_USER_ID, ...voters.map((user) => user.id)];

  /**
   * Seeds one voting round with its features, use case links, and — unless
   * the round is still a draft — its votes. A draft round has no votes yet
   * since it is not open to voters.
   */
  const seedRound = async ({ round, votableFeatures, withVotes }) => {
    await knex('VotingRound').insert([round]).onConflict('id').ignore();

    await knex('VotableFeature')
      .insert(
        votableFeatures.map(({ use_cases: _useCases, ...feature }) => ({
          ...feature,
          voting_round_id: round.id,
          active: true,
        }))
      )
      .onConflict('id')
      .ignore();

    const useCaseLinks = votableFeatures.flatMap((feature) =>
      feature.use_cases.map((useCaseId) => ({
        votable_feature_id: feature.id,
        use_case_id: useCaseId,
      }))
    );

    if (useCaseLinks.length > 0) {
      await knex('VotableFeature_UseCase')
        .insert(useCaseLinks)
        .onConflict(['votable_feature_id', 'use_case_id'])
        .ignore();
    }

    if (!withVotes) {
      return;
    }

    const votes = votableFeatures.map((feature, index) => ({
      user_id: voterIds[index % voterIds.length],
      voting_round_id: round.id,
      votable_feature_id: feature.id,
      product: feature.product,
    }));

    await knex('FeatureVote')
      .insert(votes)
      .onConflict(['user_id', 'voting_round_id', 'product'])
      .ignore();
  };

  // Open round: currently collecting votes.
  await seedRound({
    round: {
      id: '0d1c0de0-f0a7-4000-8000-00000000f0a7',
      service_instance_id: publicRoadmapService.id,
      name: 'Small Council Priorities',
      description:
        'Cast your vote for the features the Small Council should champion next moon.',
      status: 'open',
      theme: 'default',
      opened_at: new Date(),
      creator_id: BYPASS_USER_ID,
    },
    votableFeatures: [
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000001',
        title: 'Ravens for Every Alert',
        short_description: 'Push critical alerts straight to the Wall.',
        description:
          'Deliver real-time notifications for critical indicators so no White Walker slips past the sentries.',
        product: 'opencti',
        position: 1,
        use_cases: ['00e8b44d-830a-4066-bc97-f8c4ee5b53a5'],
      },
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000002',
        title: 'Dragonglass Detection Packs',
        short_description: 'Prebuilt validation scenarios for rare threats.',
        description:
          'Ship curated scenario packs so defenders can test resilience against the rarest, sharpest attacks.',
        product: 'openaev',
        position: 1,
        use_cases: ['948917cd-91eb-4e70-9da5-c8208d91a217'],
      },
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000003',
        title: 'One Hub, Every Sigil',
        short_description: 'Unified navigation across every house service.',
        description:
          'Bring OpenCTI, OpenAEV, and XTM One dashboards under a single banner to end the border disputes.',
        product: 'xtmhub',
        position: 1,
        use_cases: [],
      },
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000004',
        title: 'Iron Bank Compliance Reports',
        short_description: 'Exportable audit trails for every deployment.',
        description:
          'Generate compliance-ready reports so the Iron Bank auditors always find the books in order.',
        product: 'xtmone',
        position: 1,
        use_cases: [],
      },
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000005',
        title: 'Three-Eyed Raven Correlation',
        short_description: 'Cross-source correlation for faster triage.',
        description:
          'Correlate indicators across every connected source to see threats everywhere, all at once.',
        product: 'opencti',
        position: 2,
        use_cases: ['64aed898-bf64-4872-b83c-b7b720d2edb7'],
      },
    ],
    withVotes: true,
  });

  // Draft round: still being assembled, not yet opened, so no votes exist.
  await seedRound({
    round: {
      id: '0d1c0de0-f0a7-4000-8000-00000000d4af',
      service_instance_id: publicRoadmapService.id,
      name: "Maester's Next Proposals",
      description:
        'A draft slate under review by the Citadel before it opens to the realm.',
      status: 'draft',
      theme: 'default',
      creator_id: BYPASS_USER_ID,
    },
    votableFeatures: [
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000006',
        title: 'Wildfire Response Playbooks',
        short_description: 'Prebuilt automations for critical incidents.',
        description:
          'Draft automated containment playbooks so responders act as fast as wildfire spreads.',
        product: 'openaev',
        position: 1,
        use_cases: [],
      },
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000007',
        title: 'Direwolf Asset Tracking',
        short_description: 'Loyal tracking of every deployed asset.',
        description:
          'Keep a faithful inventory of every deployed asset across houses and regions.',
        product: 'xtmone',
        position: 1,
        use_cases: [],
      },
    ],
    withVotes: false,
  });

  // Closed round: voting has concluded and results are final.
  await seedRound({
    round: {
      id: '0d1c0de0-f0a7-4000-8000-00000000c105',
      service_instance_id: publicRoadmapService.id,
      name: "Hand of the King's First Ballot",
      description:
        'The inaugural vote that shaped the first moon of the roadmap.',
      status: 'closed',
      theme: 'thread',
      opened_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      closed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      creator_id: BYPASS_USER_ID,
    },
    votableFeatures: [
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000008',
        title: 'Faceless Data Retention',
        short_description: 'Configurable retention across every product.',
        description:
          'Let admins set retention windows precisely, no house left holding data it should not.',
        product: 'opencti',
        position: 1,
        use_cases: ['7e1f5dac-caae-417d-8dd7-36d7f5d33c19'],
      },
      {
        id: '0d1c0de0-f0a7-4000-8000-000000000009',
        title: 'Iron Throne Access Reviews',
        short_description: 'Periodic capability audits for every seat.',
        description:
          'Automate recurring access reviews so no capability is claimed without the Small Council knowing.',
        product: 'xtmhub',
        position: 1,
        use_cases: [],
      },
    ],
    withVotes: true,
  });
}
