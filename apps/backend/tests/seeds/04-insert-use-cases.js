export async function seed(knex) {
  await knex('UseCase')
    .insert([
      {
        id: '64aed898-bf64-4872-b83c-b7b720d2edb7',
        name: 'Global',
        color: '#f5a623',
        product: ['opencti', 'openaev'],
      },
      {
        id: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e01',
        name: 'Automation',
        color: '#0099cc',
        product: ['opencti'],
      },
      {
        id: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e02',
        name: 'Integration',
        color: '#ff6600',
        product: ['opencti'],
      },
      {
        id: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e03',
        name: 'Monitoring',
        color: '#7c4dff',
        product: ['opencti'],
      },
      {
        id: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e04',
        name: 'Detection',
        color: '#0099cc',
        product: ['opencti'],
      },
      {
        id: '9d3a9c3d-3b9a-4b5b-8b0a-1a2b3c4d5e05',
        name: 'Response',
        color: '#0099cc',
        product: ['opencti'],
      },
    ])
    .onConflict('id')
    .merge(['product']);
  await knex('SolutionCategory')
    .insert([
      {
        id: '8d121337-1a45-4b8b-ba73-f4e879c2e16a',
        name: 'SolutionCategory',
        product: ['opencti'],
      },
    ])
    .onConflict('id')
    .merge(['product']);
}
