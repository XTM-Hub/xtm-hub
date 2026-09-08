export async function seed(knex) {
  // Metadata for the decoupled OpenCTI connector documents created in
  // 08-development-connectors.js. Only the keys relevant to compatibility
  // resolution and basic connector display are seeded here (a subset of
  // INTEGRATION_CONNECTOR_V2_METADATA_KEYS).
  await knex('Document_Metadata')
    .insert([
      // AbuseCh (6.250110.0)
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'manifest_fragment_id',
        value: 'abusech',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'minimum_deployable_version',
        value: '6.250101.0',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'minimum_deployable_version_padded',
        value: '006.250101.000',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'version_padded',
        value: '006.250110.000',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'image_name',
        value: 'opencti/connector-abusech',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/abusech',
      },
      {
        document_id: '47c8692b-a790-49bc-a6cc-e62e7f44cf9c',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/abusech',
      },

      // AlienVaultOTX (6.250314.0)
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'manifest_fragment_id',
        value: 'alienvaultotx',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'minimum_deployable_version',
        value: '6.250301.0',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'minimum_deployable_version_padded',
        value: '006.250301.000',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'version_padded',
        value: '006.250314.000',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'image_name',
        value: 'opencti/connector-alienvaultotx',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/alienvaultotx',
      },
      {
        document_id: '71e2ae8d-e32a-494f-9c62-2da5f91199ba',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/alienvaultotx',
      },

      // Anssi (7.260405.0)
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'manifest_fragment_id',
        value: 'anssi',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'minimum_deployable_version',
        value: '7.260401.0',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'minimum_deployable_version_padded',
        value: '007.260401.000',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'version_padded',
        value: '007.260405.000',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'image_name',
        value: 'opencti/connector-anssi',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/anssi',
      },
      {
        document_id: 'abc1aa5c-cbac-43a0-b66d-a8b4cdef0871',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/anssi',
      },

      // CisaKev (7.260309.0)
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'manifest_fragment_id',
        value: 'cisakev',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'minimum_deployable_version',
        value: '7.260301.0',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'minimum_deployable_version_padded',
        value: '007.260301.000',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'version_padded',
        value: '007.260309.000',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'image_name',
        value: 'opencti/connector-cisakev',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/cisakev',
      },
      {
        document_id: '32e2a2f9-123b-475b-b90d-b0a5b79bf4fd',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/cisakev',
      },

      // Crowdstrike (5.240115.0)
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'manifest_fragment_id',
        value: 'crowdstrike',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'minimum_deployable_version',
        value: '5.240101.0',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'minimum_deployable_version_padded',
        value: '005.240101.000',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'version_padded',
        value: '005.240115.000',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'image_name',
        value: 'opencti/connector-crowdstrike',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/crowdstrike',
      },
      {
        document_id: '6fb6ef73-6b56-45dd-a77a-59ba6d59f716',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/crowdstrike',
      },

      // Crowdstrike (7.260309.0)
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'manifest_fragment_id',
        value: 'crowdstrike',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'minimum_deployable_version',
        value: '6.260507.0',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'minimum_deployable_version_padded',
        value: '006.260507.000',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'version_padded',
        value: '007.260309.000',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'image_name',
        value: 'opencti/connector-crowdstrike',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/crowdstrike',
      },
      {
        document_id: 'bbfbca6c-4105-4526-9300-8d802bd5d1b2',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/crowdstrike',
      },

      // CybercrimeTracker (7.260507.0)
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'manifest_fragment_id',
        value: 'cybercrimetracker',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'minimum_deployable_version',
        value: '7.260501.0',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'minimum_deployable_version_padded',
        value: '007.260501.000',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'version_padded',
        value: '007.260507.000',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'image_name',
        value: 'opencti/connector-cybercrimetracker',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/cybercrimetracker',
      },
      {
        document_id: '552a193e-ef20-4059-8afc-2665f9922866',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/cybercrimetracker',
      },

      // GoogleTi (8.261003.0)
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'manifest_fragment_id',
        value: 'googleti',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'minimum_deployable_version',
        value: '8.260901.0',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'minimum_deployable_version_padded',
        value: '008.260901.000',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'version_padded',
        value: '008.261003.000',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'image_name',
        value: 'opencti/connector-googleti',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/googleti',
      },
      {
        document_id: 'c23741ba-2fad-4339-aec9-7ee43b2697da',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/googleti',
      },

      // GreyNoise (7.260112.0)
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'manifest_fragment_id',
        value: 'greynoise',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'minimum_deployable_version',
        value: '7.260101.0',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'minimum_deployable_version_padded',
        value: '007.260101.000',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'version_padded',
        value: '007.260112.000',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'image_name',
        value: 'opencti/connector-greynoise',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'image_type',
        value: 'INTERNAL_ENRICHMENT',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/greynoise',
      },
      {
        document_id: '6013f281-ef46-46b2-b369-08c71edfb893',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/greynoise',
      },

      // IbmXForce (8.260901.0)
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'manifest_fragment_id',
        value: 'ibmxforce',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'minimum_deployable_version',
        value: '8.260801.0',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'minimum_deployable_version_padded',
        value: '008.260801.000',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'version_padded',
        value: '008.260901.000',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'image_name',
        value: 'opencti/connector-ibmxforce',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'image_type',
        value: 'INTERNAL_ENRICHMENT',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/ibmxforce',
      },
      {
        document_id: '515540e6-1dbb-46db-8eb5-c4c716a76b34',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/ibmxforce',
      },

      // MalwareBazaar (7.260702.0)
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'manifest_fragment_id',
        value: 'malwarebazaar',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'minimum_deployable_version',
        value: '7.260701.0',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'minimum_deployable_version_padded',
        value: '007.260701.000',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'version_padded',
        value: '007.260702.000',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'image_name',
        value: 'opencti/connector-malwarebazaar',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/malwarebazaar',
      },
      {
        document_id: 'da7e0c79-223e-44bd-b700-0396eaf6036e',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/malwarebazaar',
      },

      // Mandiant (7.260218.0)
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'manifest_fragment_id',
        value: 'mandiant',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'minimum_deployable_version',
        value: '7.260201.0',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'minimum_deployable_version_padded',
        value: '007.260201.000',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'version_padded',
        value: '007.260218.000',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'image_name',
        value: 'opencti/connector-mandiant',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/mandiant',
      },
      {
        document_id: 'a3e14a04-b876-48f6-a9a7-3998f4f2609b',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/mandiant',
      },

      // MicrosoftDefenderTi (8.261115.0)
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'manifest_fragment_id',
        value: 'microsoftdefenderti',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'minimum_deployable_version',
        value: '8.261101.0',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'minimum_deployable_version_padded',
        value: '008.261101.000',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'version_padded',
        value: '008.261115.000',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'image_name',
        value: 'opencti/connector-microsoftdefenderti',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/microsoftdefenderti',
      },
      {
        document_id: '0fcfbcf1-11f9-49dc-9900-fd825ec65e02',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/microsoftdefenderti',
      },

      // MISP (5.240612.0)
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'manifest_fragment_id',
        value: 'misp',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'minimum_deployable_version',
        value: '5.240501.0',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'minimum_deployable_version_padded',
        value: '005.240501.000',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'version_padded',
        value: '005.240612.000',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'image_name',
        value: 'opencti/connector-misp',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/misp',
      },
      {
        document_id: '4dff1096-65b8-4740-a576-14069a070678',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/misp',
      },

      // MitreAttack (6.240930.0)
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'manifest_fragment_id',
        value: 'mitreattack',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'minimum_deployable_version',
        value: '6.240901.0',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'minimum_deployable_version_padded',
        value: '006.240901.000',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'version_padded',
        value: '006.240930.000',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'image_name',
        value: 'opencti/connector-mitreattack',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/mitreattack',
      },
      {
        document_id: 'abdf5d97-5991-41a3-80f8-2803e1c8fb92',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/mitreattack',
      },

      // RecordedFuture (6.250901.0)
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'manifest_fragment_id',
        value: 'recordedfuture',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'minimum_deployable_version',
        value: '6.250801.0',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'minimum_deployable_version_padded',
        value: '006.250801.000',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'version_padded',
        value: '006.250901.000',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'image_name',
        value: 'opencti/connector-recordedfuture',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/recordedfuture',
      },
      {
        document_id: 'f42432ae-8cbf-4964-b423-fa7e3420295b',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/recordedfuture',
      },

      // Sekoia (8.261230.0)
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'manifest_fragment_id',
        value: 'sekoia',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'minimum_deployable_version',
        value: '8.261201.0',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'minimum_deployable_version_padded',
        value: '008.261201.000',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'version_padded',
        value: '008.261230.000',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'image_name',
        value: 'opencti/connector-sekoia',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/sekoia',
      },
      {
        document_id: 'e9048b69-28bf-4b52-a896-267e9515b8a3',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/sekoia',
      },

      // Shodan (6.251205.0)
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'manifest_fragment_id',
        value: 'shodan',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'minimum_deployable_version',
        value: '6.251101.0',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'minimum_deployable_version_padded',
        value: '006.251101.000',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'version_padded',
        value: '006.251205.000',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'image_name',
        value: 'opencti/connector-shodan',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'image_type',
        value: 'INTERNAL_ENRICHMENT',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/shodan',
      },
      {
        document_id: 'a287eccc-c37a-417a-a098-fb2edee7e1ce',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/shodan',
      },

      // ThreatFox (7.260601.0)
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'manifest_fragment_id',
        value: 'threatfox',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'minimum_deployable_version',
        value: '7.260601.0',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'minimum_deployable_version_padded',
        value: '007.260601.000',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'version_padded',
        value: '007.260601.000',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'image_name',
        value: 'opencti/connector-threatfox',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/threatfox',
      },
      {
        document_id: '1da99d65-80f9-4d38-b46b-998216449e63',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/threatfox',
      },

      // Urlhaus (7.260810.0)
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'manifest_fragment_id',
        value: 'urlhaus',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'minimum_deployable_version',
        value: '7.260801.0',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'minimum_deployable_version_padded',
        value: '007.260801.000',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'version_padded',
        value: '007.260810.000',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'image_name',
        value: 'opencti/connector-urlhaus',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'image_type',
        value: 'EXTERNAL_IMPORT',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/urlhaus',
      },
      {
        document_id: 'f1490a53-8aa6-4b64-97f0-24e388e15245',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/urlhaus',
      },

      // VirusTotal (6.250620.0)
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'integration_type',
        value: 'connector',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'manifest_fragment_id',
        value: 'virustotal',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'minimum_deployable_version',
        value: '6.250601.0',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'minimum_deployable_version_padded',
        value: '006.250601.000',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'version_padded',
        value: '006.250620.000',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'verified',
        value: 'true',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'manager_supported',
        value: 'true',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'image_name',
        value: 'opencti/connector-virustotal',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'image_type',
        value: 'INTERNAL_ENRICHMENT',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'last_verified_date',
        value: '2025-01-01',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'source_code',
        value:
          'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/virustotal',
      },
      {
        document_id: 'fa24b9de-6b0d-4728-b145-26fd6462b0f5',
        key: 'subscription_link',
        value: 'https://www.filigran.io/connectors/virustotal',
      },
    ])
    .onConflict(['document_id', 'key'])
    .ignore();
}
