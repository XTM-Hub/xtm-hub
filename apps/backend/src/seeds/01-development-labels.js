export async function seed(knex) {
  // Use cases seed data from production
  await knex('UseCase')
    .insert([
      {
        id: '00e8b44d-830a-4066-bc97-f8c4ee5b53a5',
        name: 'Adversary & Campaign Insights',
        color: '#9d4444',
        product: '{opencti}',
      },
      {
        id: '06dfa289-f106-45c5-8b0d-648caec0aca7',
        name: 'Autonomous AEV',
        color: '#254e66',
        product: '{openaev}',
      },
      {
        id: '109529ca-247b-4eba-887c-1297806578a9',
        name: 'Brand, Digital Risk & Underground Exposure',
        color: '#0099cc',
        product: '{opencti}',
      },
      {
        id: '1f6df625-88ee-412b-9400-056d99175769',
        name: 'CSIRT/CERT Training & Exercises',
        color: '#3d1717',
        product: '{openaev}',
      },
      {
        id: '23d58867-f763-4d46-a006-468e7bc0bc2b',
        name: 'Cloud, SaaS & Platform Security',
        color: '#493c3c',
        product: '{opencti}',
      },
      {
        id: '2469437c-33aa-439c-8f70-b90da8d4ccd5',
        name: 'Data & Administration Health',
        color: '#9b1f1f',
        product: '{opencti}',
      },
      {
        id: '28232866-7a93-404b-acb3-68a6efc6e5a7',
        name: 'Detection & Response Enablement',
        color: '#413232',
        product: '{opencti}',
      },
      {
        id: '44fa5750-102d-4b08-9af8-e71f6014ff58',
        name: 'Detection Rule Validation',
        color: '#a64e4e',
        product: '{openaev}',
      },
      {
        id: '4a378992-d5f0-458e-8fc6-527c7c644a18',
        name: 'EASM & IASM',
        color: '#417505',
        product: '{openaev}',
      },
      {
        id: '5aac6fa2-d8ed-4c55-8275-7d9f6d078d35',
        name: 'EDR Security Validation',
        color: '#5f34b0',
        product: '{openaev}',
      },
      {
        id: '6148fa3c-0845-43c1-b877-bbe1fa3d8494',
        name: 'Endpoint Security Validation',
        color: '#a80d0d',
        product: '{openaev}',
      },
      {
        id: '64aed898-bf64-4872-b83c-b7b720d2edb7',
        name: 'FIMI & Disinformation',
        color: '#0099cc',
        product: '{opencti}',
      },
      {
        id: '6d920874-91b1-4288-95d1-019815400e22',
        name: 'Fraud, Financial Crime & Cryptocurrency Monitoring',
        color: '#652f8a',
        product: '{opencti}',
      },
      {
        id: '6d9d5742-62dc-4d09-b322-9635bc17677e',
        name: 'Geopolitical, Physical & Hybrid Risk Analysis',
        color: '#32946b',
        product: '{opencti}',
      },
      {
        id: '756dfc13-b489-4ac5-b8b5-0a2f50ddcf79',
        name: 'Infrastructure & Attack Surface Visibility',
        color: '#3dc1c5',
        product: '{opencti}',
      },
      {
        id: '7d4b76be-ccdf-4a23-ad38-7aa58844ff04',
        name: 'Market Vertical & Mission-Specific Intelligence',
        color: '#b93cb8',
        product: '{opencti}',
      },
      {
        id: '7e1f5dac-caae-417d-8dd7-36d7f5d33c19',
        name: 'Other',
        color: '#ffffff',
        product: '{openaev,opencti}',
      },
      {
        id: '948917cd-91eb-4e70-9da5-c8208d91a217',
        name: 'Purple Team as a Service',
        color: '#622b2b',
        product: '{openaev}',
      },
      {
        id: 'c3335831-66ee-4302-af74-09f618b76d67',
        name: 'Tabletop Exercise',
        color: '#9013fe',
        product: '{openaev}',
      },
      {
        id: 'e8cc0bda-ad00-4bbf-adaf-eb3baa0fe8d5',
        name: 'Third-Party & Supply Chain Oversight',
        color: '#0099cc',
        product: '{opencti}',
      },
      {
        id: 'ea220fcf-13e1-43d7-b0c6-2f482ff5f729',
        name: 'Threat Intelligence Defense (OpenCTI <> OpenAEV)',
        color: '#a51818',
        product: '{openaev}',
      },
      {
        id: 'f0a073d4-c8f4-4be2-b44b-13685de8bdd7',
        name: 'Vulnerability & Exploit Awareness',
        color: '#a51a1a',
        product: '{opencti}',
      },
    ])
    .onConflict('id')
    .ignore();
}
