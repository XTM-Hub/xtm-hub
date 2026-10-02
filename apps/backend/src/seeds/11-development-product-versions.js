export async function seed(knex) {
  // Registered OpenCTI versions, used as the default version resolved by
  // /opencti/:version/versions-matrix when the `version` query parameter is
  // omitted (the highest version_padded wins), and as the suggestions for
  // the "OpenCTI compatibility version" document filter. Several versions
  // are registered so switching `version_padded` order is easy to verify,
  // and their scale matches the `product_version` document metadata seeded
  // in 03-development-document-metadata.js (e.g. 6.8.3, 6.8.4, 1.0.0) so
  // the compatibility filter has a visible effect locally.
  await knex('ProductVersion')
    .insert([
      {
        id: 'f782a583-919a-4b51-b0f2-27ea12dccfe5',
        product: 'opencti',
        version: '6.8.4',
        version_padded: '006.000008.004',
      },
      {
        id: '4b422d06-e854-4f80-a5eb-a9e9803cd7e4',
        product: 'opencti',
        version: '6.8.0',
        version_padded: '006.000008.000',
      },
      {
        id: '0101a4d8-a706-46a1-8f50-d58435e8949c',
        product: 'opencti',
        version: '6.5.0',
        version_padded: '006.000005.000',
      },
      {
        id: '83d482b5-4716-4c17-9845-ac70d5f864c1',
        product: 'opencti',
        version: '1.0.0',
        version_padded: '001.000000.000',
      },
    ])
    .onConflict('id')
    .ignore();
}
