export async function seed(knex) {
  // Registered OpenCTI versions, used as the default version resolved by
  // /opencti/:version/versions-matrix when the `version` query parameter is
  // omitted (the highest version_padded wins). Several versions are
  // registered so switching `version_padded` order is easy to verify.
  await knex('ProductVersion')
    .insert([
      {
        id: 'f782a583-919a-4b51-b0f2-27ea12dccfe5',
        product: 'opencti',
        version: '7.260807.0',
        version_padded: '007.260807.000',
      },
      {
        id: '4b422d06-e854-4f80-a5eb-a9e9803cd7e4',
        product: 'opencti',
        version: '7.260607.0',
        version_padded: '007.260607.000',
      },
      {
        id: '0101a4d8-a706-46a1-8f50-d58435e8949c',
        product: 'opencti',
        version: '7.260409.0',
        version_padded: '007.260409.000',
      },
      {
        id: '83d482b5-4716-4c17-9845-ac70d5f864c1',
        product: 'opencti',
        version: '6.260807.0',
        version_padded: '006.260807.000',
      },
    ])
    .onConflict(['product', 'version'])
    .ignore();
}
