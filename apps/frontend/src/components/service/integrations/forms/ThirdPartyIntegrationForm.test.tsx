import {
  buildIntegrationDocument,
  CURRENT_ORGANIZATION,
  CURRENT_USER_ID,
  defineDeletedImagesTest,
  defineProductVersionFormatTests,
  defineShortDescriptionLengthTests,
  defineSlugGenerationTests,
  DELETED_IMAGE,
  DOCUMENT_DESCRIPTION,
  DOCUMENT_NAME,
  DOCUMENT_ORGANIZATION,
  DOCUMENT_PRODUCT_VERSION,
  DOCUMENT_SHORT_DESCRIPTION,
  DOCUMENT_SLUG,
  fillIntegrationCreationFields,
  givenSolutionCategories,
  KEPT_IMAGE,
  NEW_DESCRIPTION,
  NEW_NAME,
  NEW_SHORT_DESCRIPTION,
  NEW_SLUG,
  PRODUCT_VERSION_LABEL,
  renderServiceForm,
  ServiceFormResource,
  ServiceFormUser,
  SOLUTION_CATEGORY,
  UPLOADER,
  USE_CASE,
  VALIDATE_LABEL,
} from '@/components/service/form/ServiceForm.test-utils';
import {
  ThirdPartyIntegrationForm,
  ThirdPartyIntegrationFormValues,
} from '@/components/service/integrations/forms/ThirdPartyIntegrationForm';
import { IntegrationType, LicenseType } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

type ExpectedValues = Partial<
  Record<keyof ThirdPartyIntegrationFormValues, unknown>
>;

const VENDOR_URL_LABEL = 'Service.Form.VendorUrlLabel';
const GITHUB_URL_LABEL = 'Service.Form.GithubUrlLabel';
const IMAGES_LABEL = 'Service.Form.ImageLabel';

const VENDOR_URL = 'https://vendor.example.com';
const NEW_VENDOR_URL = 'https://new-vendor.example.com';
const GITHUB_URL = 'https://github.com/vendor/integration';

const fillThirdPartyCreationFields = async (user: ServiceFormUser) => {
  await fillIntegrationCreationFields(user);
  await user.type(
    screen.getByRole('textbox', { name: VENDOR_URL_LABEL }),
    NEW_VENDOR_URL
  );
};

const buildThirdPartyIntegration = () =>
  buildIntegrationDocument({
    vendor_url: VENDOR_URL,
    github_url: GITHUB_URL,
  });

describe('ThirdPartyIntegrationForm', () => {
  beforeEach(() => {
    givenSolutionCategories();
  });

  defineSlugGenerationTests({
    Form: ThirdPartyIntegrationForm,
    resourceName: ServiceFormResource.THIRD_PARTY_INTEGRATION,
  });

  it('should send the filled third party integration when the user creates it', async () => {
    // Given
    const image = new File(['image'], 'screenshot.png', { type: 'image/png' });
    const { user, handleSubmit } = renderServiceForm(ThirdPartyIntegrationForm);
    await fillThirdPartyCreationFields(user);
    await user.upload(
      screen.getByLabelText(IMAGES_LABEL, { selector: 'input' }),
      image
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith({
        name: NEW_NAME,
        slug: NEW_SLUG,
        uploader_id: CURRENT_USER_ID,
        short_description: NEW_SHORT_DESCRIPTION,
        description: NEW_DESCRIPTION,
        uploader_organization_id: CURRENT_ORGANIZATION.id,
        integration_type: IntegrationType.ThirdPartyIntegration,
        use_cases: [USE_CASE.id],
        solution_categories: [SOLUTION_CATEGORY.id],
        vendor_url: NEW_VENDOR_URL,
        logo: [],
        images: [image],
      } satisfies ExpectedValues)
    );
  });

  it('should ask for an image when the user creates a third party integration without any', async () => {
    // Given
    const { user } = renderServiceForm(ThirdPartyIntegrationForm);
    await fillThirdPartyCreationFields(user);

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(
        screen.getByLabelText(IMAGES_LABEL, { selector: 'input' })
      ).toHaveAttribute('aria-invalid', 'true')
    );
  });

  it('should save the third party integration with its links when the user edits it', async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      ThirdPartyIntegrationForm,
      buildThirdPartyIntegration()
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
        uploader_organization_id: DOCUMENT_ORGANIZATION.id,
        integration_type: IntegrationType.ThirdPartyIntegration,
        use_cases: [USE_CASE.id],
        solution_categories: [SOLUTION_CATEGORY.id],
        license_type: LicenseType.Commercial,
        vendor_url: VENDOR_URL,
        github_url: GITHUB_URL,
        product_version: DOCUMENT_PRODUCT_VERSION,
        active: true,
        logo: [],
        images: [DELETED_IMAGE, KEPT_IMAGE],
      } satisfies ExpectedValues)
    );
  });

  it.each([
    { field: 'GitHub URL', label: GITHUB_URL_LABEL },
    { field: 'product version', label: PRODUCT_VERSION_LABEL },
  ])(
    'should flag the $field when the user clears it but keeps the other one',
    async ({ label }) => {
      // Given
      const { user } = renderServiceForm(
        ThirdPartyIntegrationForm,
        buildThirdPartyIntegration()
      );
      const clearedField = screen.getByRole('textbox', { name: label });
      await user.clear(clearedField);

      // When
      await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

      // Then
      await waitFor(() =>
        expect(clearedField).toHaveAttribute('aria-invalid', 'true')
      );
    }
  );

  it('should save the third party integration without GitHub URL and product version when the user clears both', async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      ThirdPartyIntegrationForm,
      buildThirdPartyIntegration()
    );
    await user.clear(screen.getByRole('textbox', { name: GITHUB_URL_LABEL }));
    await user.clear(
      screen.getByRole('textbox', { name: PRODUCT_VERSION_LABEL })
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          github_url: undefined,
          product_version: undefined,
        } satisfies ExpectedValues)
      )
    );
  });

  it.each(['', 'vendor.example.com'])(
    'should reject the vendor URL "%s" when the user saves the third party integration',
    async (vendorUrl) => {
      // Given
      const { user } = renderServiceForm(
        ThirdPartyIntegrationForm,
        buildThirdPartyIntegration()
      );
      const vendorUrlField = screen.getByRole('textbox', {
        name: VENDOR_URL_LABEL,
      });
      await user.clear(vendorUrlField);
      await user.click(vendorUrlField);
      await user.paste(vendorUrl);

      // When
      await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

      // Then
      await waitFor(() => expect(vendorUrlField).toBeInvalid());
    }
  );

  defineDeletedImagesTest({
    Form: ThirdPartyIntegrationForm,
    resourceName: ServiceFormResource.THIRD_PARTY_INTEGRATION,
    buildEditedDocument: buildThirdPartyIntegration,
  });

  defineProductVersionFormatTests({
    Form: ThirdPartyIntegrationForm,
    resourceName: ServiceFormResource.THIRD_PARTY_INTEGRATION,
    buildEditedDocument: buildThirdPartyIntegration,
  });

  defineShortDescriptionLengthTests({
    Form: ThirdPartyIntegrationForm,
    resourceName: ServiceFormResource.THIRD_PARTY_INTEGRATION,
    buildEditedDocument: buildThirdPartyIntegration,
    shortDescriptionMaxLength: 250,
  });
});
