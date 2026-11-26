export async function seed(knex) {
  // Document Metadata seed data from production
  const taxiiFeedMetadataBatch = Array.from({ length: 15 }, (_, index) => {
    const itemNumber = index + 1;
    const idSuffix = itemNumber.toString(16).padStart(12, '0');
    const paddedNumber = itemNumber.toString().padStart(3, '0');

    return [
      {
        document_id: `60000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_type',
        value: 'taxii_feed',
      },
      {
        document_id: `60000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_subtype',
        value: 'NATIVE',
      },
      {
        document_id: `60000000-0000-4000-8000-${idSuffix}`,
        key: 'feed_url',
        value: `https://taxii-feed-${paddedNumber}.example.com`,
      },
    ];
  }).flat();

  const thirdPartyMetadataBatch = Array.from({ length: 15 }, (_, index) => {
    const itemNumber = index + 1;
    const idSuffix = itemNumber.toString(16).padStart(12, '0');
    const paddedNumber = itemNumber.toString().padStart(3, '0');

    return [
      {
        document_id: `70000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_type',
        value: 'third_party_integration',
      },
      {
        document_id: `70000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_subtype',
        value: 'ORCHESTRATION',
      },
      {
        document_id: `70000000-0000-4000-8000-${idSuffix}`,
        key: 'vendor_url',
        value: `https://vendor-${paddedNumber}.example.com`,
      },
      {
        document_id: `70000000-0000-4000-8000-${idSuffix}`,
        key: 'github_url',
        value: `https://github.com/filigran/third-party-${paddedNumber}`,
      },
      {
        document_id: `70000000-0000-4000-8000-${idSuffix}`,
        key: 'product_version',
        value: '1.0.0',
      },
    ];
  }).flat();

  const openctiStreamMetadataBatch = Array.from({ length: 15 }, (_, index) => {
    const itemNumber = index + 1;
    const idSuffix = itemNumber.toString(16).padStart(12, '0');
    const paddedNumber = itemNumber.toString().padStart(3, '0');

    return [
      {
        document_id: `80000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_type',
        value: 'stream',
      },
      {
        document_id: `80000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_subtype',
        value: 'NATIVE',
      },
      {
        document_id: `80000000-0000-4000-8000-${idSuffix}`,
        key: 'feed_url',
        value: `https://stream-${paddedNumber}.example.com`,
      },
    ];
  }).flat();

  const rssFeedMetadataBatch = Array.from({ length: 15 }, (_, index) => {
    const itemNumber = index + 1;
    const idSuffix = itemNumber.toString(16).padStart(12, '0');
    const paddedNumber = itemNumber.toString().padStart(3, '0');

    return [
      {
        document_id: `90000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_type',
        value: 'rss_feed',
      },
      {
        document_id: `90000000-0000-4000-8000-${idSuffix}`,
        key: 'integration_subtype',
        value: 'MALWARE',
      },
      {
        document_id: `90000000-0000-4000-8000-${idSuffix}`,
        key: 'feed_url',
        value: `https://rss-feed-${paddedNumber}.example.com`,
      },
    ];
  }).flat();

  await knex('Document_Metadata')
    .insert([
      {
        document_id: '187dfc29-631d-4795-aa59-4c8bdcc3fb5a',
        key: 'product_version',
        value: '6.5.2',
      },
      {
        document_id: 'bb734d93-4823-4637-a216-518d8ef55628',
        key: 'product_version',
        value: '6.8.4',
      },
      {
        document_id: '7effeac6-8939-4316-8278-6adbe5c5dcb8',
        key: 'product_version',
        value: '1.18.0',
      },
      {
        document_id: '1275352d-c49e-458d-b340-4e40d2035249',
        key: 'product_version',
        value: '1.4.0',
      },
      {
        document_id: 'e02faca0-9d38-4981-94f2-72bf18ca9c53',
        key: 'integration_type',
        value: 'csv_feed',
      },
      {
        document_id: 'e02faca0-9d38-4981-94f2-72bf18ca9c53',
        key: 'feed_url',
        value: 'https://example.com',
      },
      {
        document_id: '1b226f91-4896-4298-af2d-1de0aae63e62',
        key: 'integration_type',
        value: 'taxii_feed',
      },
      {
        document_id: '1b226f91-4896-4298-af2d-1de0aae63e62',
        key: 'feed_url',
        value: 'https://test.fr',
      },
      {
        document_id: 'e9efb7a0-2308-4776-9076-489c5caf9b4c',
        key: 'integration_type',
        value: 'rss_feed',
      },
      {
        document_id: 'e9efb7a0-2308-4776-9076-489c5caf9b4c',
        key: 'feed_url',
        value: 'https://filigran.io',
      },
      {
        document_id: 'e53832ce-2f5a-4fe5-ba5b-6fef1d6ad1d4',
        key: 'integration_type',
        value: 'stream',
      },
      {
        document_id: 'e53832ce-2f5a-4fe5-ba5b-6fef1d6ad1d4',
        key: 'feed_url',
        value: 'https://github.com',
      },
      {
        document_id: '00ab5423-1b12-468f-9d67-2af079807205',
        key: 'integration_type',
        value: 'third_party_integration',
      },
      {
        document_id: '00ab5423-1b12-468f-9d67-2af079807205',
        key: 'vendor_url',
        value: 'http://vendor.url',
      },
      {
        document_id: '00ab5423-1b12-468f-9d67-2af079807205',
        key: 'github_url',
        value: 'http://github.com',
      },
      {
        document_id: '00ab5423-1b12-468f-9d67-2af079807205',
        key: 'product_version',
        value: '1.2.3',
      },
      {
        document_id: 'e8d4c8b3-b104-406e-9b5d-834d614ada1f',
        key: 'product_version',
        value: '1.5.0',
      },
      {
        document_id: '0dbe6fac-f4fa-4177-bfaf-21f2a634a942',
        key: 'product_version',
        value: '1.6.0',
      },
      {
        document_id: '56dfd5ed-c4a8-47bf-9a6f-bf39262cd807',
        key: 'product_version',
        value: '1.7.0',
      },
      ...taxiiFeedMetadataBatch,
      ...thirdPartyMetadataBatch,
      ...openctiStreamMetadataBatch,
      ...rssFeedMetadataBatch,
    ])
    .onConflict(['document_id', 'key'])
    .ignore();
}
