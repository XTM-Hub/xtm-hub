export async function seed(knex) {
  const BYPASS_USER_ID = 'ba091095-418f-4b4f-b150-6c9295e232c3';

  await knex('Epic')
    .insert([
      {
        id: 'f3d8c580-3ba9-4fd5-b4e2-2a7a8fbd76c1',
        title: 'Night Watch for Indicators',
        short_description: 'The Ravens of the Wall monitor IOCs 24/7.',
        description:
          'Like the Night’s Watch, this *epic* consolidates the detection and **prioritization** of critical indicators before the White Walkers reach production.',
        active: true,
        product: ['opencti'],
        timeline: 'now',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: '0c2af0da-f842-4d05-86cb-5b9f1c95df29',
        title: 'Khaleesi Stress Tests',
        short_description:
          'OpenAEV launches fire-and-blood scenarios to test resilience.',
        description:
          'This epic runs continuous validation campaigns to ensure the defenses hold even against Drogon in full rage mode.',
        active: true,
        product: ['openaev'],
        timeline: 'next',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: '5ca4bd8b-2b11-49cf-af7a-f9246ff4583a',
        title: 'One Hub to Rule Them All',
        short_description:
          'XTM Hub unifies Westeros integrations without house wars.',
        description:
          'This epic aligns product flows in a single portal to avoid dashboard battles between Stark, Lannister, and Targaryen.',
        active: true,
        product: ['xtmhub'],
        timeline: 'under_consideration',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: '49a096c8-adb3-4288-8b47-349185a120c8',
        title: 'Faceless Prioritization',
        short_description: 'Every obsolete ticket must die, for OpenCTI.',
        description:
          'Arya sorts the backlog with precision to accelerate user value and keep only truly strategic initiatives.',
        active: false,
        product: ['opencti'],
        timeline: 'under_consideration',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: '36a160e1-63f5-44b1-bab1-ec499620aab5',
        title: 'Iron Bank Compliance',
        short_description: 'All debts must be paid… especially security debt.',
        description:
          'Focus on reducing technical and security debt, ensuring compliance and resilience because the Iron Bank always collects.',
        active: true,
        product: ['xtmone'],
        timeline: 'next',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: '6c8f20d9-af60-4365-bd7c-e804af3528d9',
        title: 'Wildfire Incident Response',
        short_description:
          'Explosive response strategies for critical incidents.',
        description:
          'Like wildfire beneath King’s Landing, this epic enhances rapid containment and high-impact response to major security events.',
        active: true,
        product: ['openaev'],
        timeline: 'now',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: 'f0c090b1-a639-44ca-8bec-0baec32a4ec8',
        title: 'Three-Eyed Raven Intelligence',
        short_description: 'See everything, everywhere, all at once.',
        description:
          'Centralize intelligence to provide deep visibility across all systems, correlating past and present data for better decisions.',
        active: true,
        product: ['opencti'],
        timeline: 'next',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: 'f25482e2-884f-4b42-b0f4-de060dec1f93',
        title: 'Dragon Glass Hardening',
        short_description: 'Specialized defenses against advanced threats.',
        description:
          'Develop niche but powerful protections tailored to defeat the most sophisticated and rare attack vectors.',
        active: false,
        product: ['openaev'],
        timeline: 'under_consideration',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: '6060ca40-5b46-48fd-9a95-170505507b05',
        title: 'Small Council Governance',
        short_description: 'Strategic alignment across all security domains.',
        description:
          'Establish governance frameworks to ensure all stakeholders align on priorities, risk, and execution strategy.',
        active: true,
        product: ['xtmhub'],
        timeline: 'now',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: 'b126cef9-f20b-4246-8cb7-dab28767b241',
        title: 'The Long Night Resilience',
        short_description: 'Endure prolonged and complex attack campaigns.',
        description:
          'Prepare systems to withstand sustained pressure, ensuring uptime and integrity even during extended crisis scenarios.',
        active: true,
        product: ['openaev'],
        timeline: 'finished',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: 'fa71313e-88bc-4f00-8e36-47d4a8970e6d',
        title: 'Hand of the King Automation',
        short_description: 'Delegate wisely, automate efficiently.',
        description:
          'Introduce smart automation pipelines to reduce manual workload while maintaining control and oversight.',
        active: true,
        product: ['opencti'],
        timeline: 'finished',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
      {
        id: '9b6f5d2a-7c31-4e88-9a10-3f7c2ad4be51',
        title: 'Winterfell Alliance',
        short_description:
          'The Northern houses share their banners across products.',
        description:
          'This epic unifies threat intelligence and adversary emulation so that OpenCTI and OpenAEV fight the same war with the same maps.',
        active: true,
        product: ['opencti', 'openaev'],
        timeline: 'now',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
    ])
    .onConflict('id')
    .ignore();
}
