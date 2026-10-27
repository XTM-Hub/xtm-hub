import {
  buildIntegrationDocument,
  defineDeletedImagesTest,
  DELETED_IMAGE,
  DOCUMENT_DESCRIPTION,
  DOCUMENT_NAME,
  DOCUMENT_ORGANIZATION,
  DOCUMENT_PRODUCT_VERSION,
  DOCUMENT_SHORT_DESCRIPTION,
  DOCUMENT_SLUG,
  KEPT_IMAGE,
  renderServiceForm,
  ServiceFormResource,
  ServiceFormUser,
  SOLUTION_CATEGORY,
  UPLOADER,
  USE_CASE,
  VALIDATE_LABEL,
} from '@/components/service/form/ServiceForm.test-utils';
import {
  ConnectorForm,
  ConnectorFormValues,
} from '@/components/service/integrations/forms/ConnectorForm';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType, LicenseType } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

type ExpectedValues = Partial<Record<keyof ConnectorFormValues, unknown>>;

const MINIMUM_DEPLOYABLE_VERSION_LABEL =
  'Service.Form.MinimumDeployableVersionLabel';
const MINIMUM_DEPLOYABLE_VERSION_ERROR =
  'Minimum deployable version must be a valid version';

const CONTAINER_IMAGE = 'opencti/connector-mitre';
const SOURCE_CODE = 'https://github.com/OpenCTI-Platform/connectors';
const MINIMUM_DEPLOYABLE_VERSION = '6.2.0';
const UPPERCASE_LTS_MINIMUM_DEPLOYABLE_VERSION = '6.0.0-LTS.1';

const buildConnector = (overrides: Partial<documentItem_fragment$data> = {}) =>
  buildIntegrationDocument({
    container_image: CONTAINER_IMAGE,
    source_code: SOURCE_CODE,
    verified: true,
    manager_supported: true,
    playbook_supported: false,
    minimum_deployable_version: MINIMUM_DEPLOYABLE_VERSION,
    ...overrides,
  });

const typeMinimumDeployableVersion = async (
  user: ServiceFormUser,
  version: string
) => {
  const minimumDeployableVersionField = screen.getByRole('textbox', {
    name: MINIMUM_DEPLOYABLE_VERSION_LABEL,
  });
  await user.clear(minimumDeployableVersionField);
  await user.type(minimumDeployableVersionField, version);
};

describe('ConnectorForm', () => {
  it('should save the connector with its values when the user edits it', async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      ConnectorForm,
      buildConnector()
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith({
        name: DOCUMENT_NAME,
        slug: DOCUMENT_SLUG,
        uploader_id: UPLOADER.id,
        short_description: DOCUMENT_SHORT_DESCRIPTION,
        description: DOCUMENT_DESCRIPTION,
        product_version: DOCUMENT_PRODUCT_VERSION,
        minimum_deployable_version: MINIMUM_DEPLOYABLE_VERSION,
        uploader_organization_id: DOCUMENT_ORGANIZATION.id,
        integration_type: IntegrationType.Connector,
        container_image: CONTAINER_IMAGE,
        source_code: SOURCE_CODE,
        use_cases: [USE_CASE.id],
        solution_categories: [SOLUTION_CATEGORY.id],
        license_type: LicenseType.Commercial,
        active: true,
        verified: 'true',
        manager_supported: 'true',
        playbook_supported: 'false',
        logo: [],
        images: [DELETED_IMAGE, KEPT_IMAGE],
      } satisfies ExpectedValues)
    );
  });

  it.each([
    {
      flags: {
        verified: true,
        manager_supported: false,
        playbook_supported: false,
      },
      expected: {
        verified: 'true',
        manager_supported: 'false',
        playbook_supported: 'false',
      },
    },
    {
      flags: {
        verified: false,
        manager_supported: true,
        playbook_supported: false,
      },
      expected: {
        verified: 'false',
        manager_supported: 'true',
        playbook_supported: 'false',
      },
    },
    {
      flags: {
        verified: false,
        manager_supported: false,
        playbook_supported: true,
      },
      expected: {
        verified: 'false',
        manager_supported: 'false',
        playbook_supported: 'true',
      },
    },
  ])(
    'should send verified $flags.verified, manager supported $flags.manager_supported and playbook supported $flags.playbook_supported as text when the user saves the connector',
    async ({ flags, expected }) => {
      // Given
      const { user, handleSubmit } = renderServiceForm(
        ConnectorForm,
        buildConnector(flags)
      );

      // When
      await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

      // Then
      await waitFor(() =>
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining(expected satisfies ExpectedValues)
        )
      );
    }
  );

  it('should hide the minimum deployable version when the connector is not supported by the manager', () => {
    // Given
    const connector = buildConnector({
      manager_supported: false,
      minimum_deployable_version: null,
    });

    // When
    renderServiceForm(ConnectorForm, connector);

    // Then
    expect(
      screen.getByRole('button', { name: VALIDATE_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: MINIMUM_DEPLOYABLE_VERSION_LABEL })
    ).not.toBeInTheDocument();
  });

  it('should keep the minimum deployable version the form would reject when the user edits a connector not supported by the manager', async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      ConnectorForm,
      buildConnector({
        manager_supported: false,
        minimum_deployable_version: UPPERCASE_LTS_MINIMUM_DEPLOYABLE_VERSION,
      })
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum_deployable_version: UPPERCASE_LTS_MINIMUM_DEPLOYABLE_VERSION,
        } satisfies ExpectedValues)
      )
    );
  });

  it.each(['6.0.0-lts', '6.0.0-lts.2'])(
    'should save the minimum deployable version %s when the user edits the connector',
    async (version) => {
      // Given
      const { user, handleSubmit } = renderServiceForm(
        ConnectorForm,
        buildConnector()
      );
      await typeMinimumDeployableVersion(user, version);

      // When
      await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

      // Then
      await waitFor(() =>
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            minimum_deployable_version: version,
          } satisfies ExpectedValues)
        )
      );
    }
  );

  it.each(['6.5', 'v6.5.0', '6.0.0-lts.', '6.0.0-rc1'])(
    'should reject the minimum deployable version %s when the user edits the connector',
    async (version) => {
      // Given
      const { user } = renderServiceForm(ConnectorForm, buildConnector());
      await typeMinimumDeployableVersion(user, version);

      // When
      await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

      // Then
      expect(
        await screen.findByText(MINIMUM_DEPLOYABLE_VERSION_ERROR)
      ).toBeInTheDocument();
    }
  );

  defineDeletedImagesTest({
    Form: ConnectorForm,
    resourceName: ServiceFormResource.CONNECTOR,
    buildEditedDocument: buildConnector,
  });
});
