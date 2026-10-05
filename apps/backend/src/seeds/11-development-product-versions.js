export async function seed(knex) {
  // Registered OpenCTI versions, used as the default version resolved by
  // /opencti/:version/versions-matrix when the `version` query parameter is
  // omitted (the highest version_padded wins), and as the suggestions for
  // the "OpenCTI compatibility version" document filter. Several versions
  // are registered so switching `version_padded` order is easy to verify,
  // and they are real OpenCTI tags: 6.x is semver, 7.x is calver (first tag
  // 7.260224.0). They match the connector requirements seeded in
  // 10-development-connector-metadata.js and the `product_version` document
  // metadata of 03-development-document-metadata.js (e.g. 6.5.2, 6.8.4) so
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
        id: '2ac29a90-d7c7-4e90-9c6c-a3aca47de9a6',
        product: 'opencti',
        version: '6.9.29',
        version_padded: '006.000009.029',
      },
      {
        id: 'eee4230d-2cfc-48b4-84ad-d4c2a321c680',
        product: 'opencti',
        version: '7.260224.0',
        version_padded: '007.260224.000',
      },
      {
        id: 'df502051-9c60-45d6-8c01-07ed4cbf8c37',
        product: 'opencti',
        version: '7.260701.0',
        version_padded: '007.260701.000',
      },
      {
        id: '7b1db749-da29-481e-ad2a-b0df39f30d70',
        product: 'opencti',
        version: '7.261002.0',
        version_padded: '007.261002.000',
      },
    ])
    .onConflict()
    .ignore();
}
