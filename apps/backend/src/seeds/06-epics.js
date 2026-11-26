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
        problem_to_solve:
          'Critical indicators are spotted too late, once the White Walkers are already inside production.',
        proposed_solution:
          'Ravens watch the Wall around the clock and raise the alarm as soon as an IOC crosses it.',
        expected_value:
          '- Indicators triaged before they reach production\n- Analysts focus on what matters first',
        active: true,
        products: ['opencti'],
        slack_link: 'https://filigran-community.slack.com/archives/C0BMAMQ9JKY',
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
        problem_to_solve:
          'Defenses are only tested once the dragons are already burning the city.',
        proposed_solution:
          'Continuous fire-and-blood validation campaigns run against the defenses.',
        expected_value:
          '- Resilience proven before the real assault\n- Weak spots surfaced early',
        active: true,
        products: ['openaev'],
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
        problem_to_solve:
          'Every house keeps its own dashboard and the realm has no single map.',
        proposed_solution: 'One portal aligns all product flows.',
        expected_value:
          '- No more dashboard battles between houses\n- A single entry point for every integration',
        active: true,
        products: ['xtmhub'],
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
        problem_to_solve:
          'The backlog is full of obsolete tickets hiding the strategic ones.',
        proposed_solution:
          'Arya sorts the backlog with precision and keeps only what serves the users.',
        expected_value:
          '- Faster delivery of user value\n- Only strategic initiatives survive',
        active: false,
        products: ['opencti'],
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
        problem_to_solve:
          'Technical and security debt keeps piling up and the Iron Bank always collects.',
        proposed_solution:
          'Reduce the debt and enforce compliance across the platform.',
        expected_value:
          '- Compliant and resilient platform\n- Lower long-term cost',
        active: true,
        products: ['xtmone'],
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
        problem_to_solve:
          'Major security events spread faster than the response.',
        proposed_solution:
          'Rapid containment and high-impact response playbooks, like wildfire beneath King’s Landing.',
        expected_value:
          '- Critical incidents contained in minutes\n- Clear ownership during a crisis',
        active: true,
        products: ['openaev'],
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
        problem_to_solve:
          'Intelligence is scattered and past events are forgotten.',
        proposed_solution:
          'Centralize intelligence and correlate past and present data.',
        expected_value:
          '- Deep visibility across all systems\n- Better decisions from correlated data',
        active: true,
        products: ['opencti'],
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
        problem_to_solve:
          'Rare and sophisticated attack vectors bypass generic defenses.',
        proposed_solution:
          'Niche but powerful protections tailored to the most advanced threats.',
        expected_value:
          '- Advanced threats blocked\n- Specialized defenses ready when needed',
        active: false,
        products: ['openaev'],
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
        problem_to_solve:
          'Stakeholders disagree on priorities, risk and execution.',
        proposed_solution:
          'A governance framework where every domain sits at the small council.',
        expected_value:
          '- Aligned priorities across security domains\n- Shared understanding of risk',
        active: true,
        products: ['xtmhub'],
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
        problem_to_solve:
          'Extended crisis scenarios erode uptime and integrity.',
        proposed_solution: 'Prepare systems to withstand sustained pressure.',
        expected_value:
          '- Uptime kept during the long night\n- Integrity preserved under pressure',
        active: true,
        products: ['openaev'],
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
        problem_to_solve: 'Manual workload slows every team down.',
        proposed_solution: 'Smart automation pipelines under human oversight.',
        expected_value: '- Less manual work\n- Control and oversight kept',
        active: true,
        products: ['opencti'],
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
        problem_to_solve:
          'OpenCTI and OpenAEV fight the same war with different maps.',
        proposed_solution: 'Unify threat intelligence and adversary emulation.',
        expected_value:
          '- One shared picture of the adversary\n- Products reinforcing each other',
        active: true,
        products: ['opencti', 'openaev'],
        slack_link: 'https://filigran-community.slack.com/archives/C0BMANSB4CW',
        timeline: 'now',
        epic_type: 'other',
        uploader_id: BYPASS_USER_ID,
      },
    ])
    .onConflict('id')
    .ignore();
}
