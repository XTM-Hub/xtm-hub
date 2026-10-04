import { connectorSchema } from '@/components/service/integrations/forms/ConnectorForm';
import { describe, expect, it } from 'vitest';

describe('ConnectorForm', () => {
  const storedConnector = {
    name: 'Splunk hunt',
    slug: 'splunk-hunt',
    short_description: 'Hunt on Splunk.',
    description: 'Runs OpenCTI hunts on Splunk.',
    product_version: '7.261015.0',
    minimum_deployable_version: '7.261015.0',
    uploader_organization_id: 'organization-id',
    integration_type: 'CONNECTOR',
    container_image: 'opencti/connector-splunk-hunt',
    source_code: 'https://github.com/OpenCTI-Platform/connectors',
    solution_categories: ['category-id'],
    images: undefined,
  };

  it.each`
    minimumDeployableVersion
    ${'7.261015.0-lts'}
    ${'7.261015.0-lts.2'}
    ${'7.261015.0-lts2'}
    ${'7.261015.0-LTS.2'}
    ${null}
  `(
    'saves a connector whose stored minimum deployable version is $minimumDeployableVersion',
    ({
      minimumDeployableVersion,
    }: {
      minimumDeployableVersion: string | null;
    }) => {
      const result = connectorSchema.safeParse({
        ...storedConnector,
        minimum_deployable_version: minimumDeployableVersion,
        datasheet_url: 'https://example.com/datasheet',
      });

      expect(result.success).toBe(true);
    }
  );

  it.each`
    minimumDeployableVersion
    ${'7.261015.0-lts.'}
    ${'7.261015.0-ltsx'}
    ${'next'}
  `(
    'refuses the minimum deployable version $minimumDeployableVersion',
    ({ minimumDeployableVersion }: { minimumDeployableVersion: string }) => {
      const result = connectorSchema.safeParse({
        ...storedConnector,
        minimum_deployable_version: minimumDeployableVersion,
      });

      expect(result.success).toBe(false);
    }
  );

  it('saves a connector whose stored product version is an uppercase LTS release', () => {
    const result = connectorSchema.safeParse({
      ...storedConnector,
      product_version: '7.261015.0-LTS.2',
    });

    expect(result.success).toBe(true);
  });
});
