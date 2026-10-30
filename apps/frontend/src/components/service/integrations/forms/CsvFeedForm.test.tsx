import {
  buildDocument,
  buildIntegrationDocument,
  CURRENT_ORGANIZATION,
  CURRENT_USER_ID,
  defineDeletedImagesTest,
  defineReplaceFileConfirmationTest,
  defineRequiredFileTest,
  defineShortDescriptionLengthTests,
  defineSlugGenerationTests,
  DELETED_IMAGE,
  DOCUMENT_DESCRIPTION,
  DOCUMENT_NAME,
  DOCUMENT_ORGANIZATION,
  DOCUMENT_SHORT_DESCRIPTION,
  DOCUMENT_SLUG,
  fillIntegrationCreationFields,
  givenSolutionCategories,
  JSON_FILE_FIELD,
  KEPT_IMAGE,
  NEW_DESCRIPTION,
  NEW_NAME,
  NEW_SHORT_DESCRIPTION,
  NEW_SLUG,
  renderServiceForm,
  ServiceFormResource,
  SOLUTION_CATEGORY,
  UPLOADER,
  uploadFile,
  USE_CASE,
  VALIDATE_LABEL,
} from '@/components/service/form/ServiceForm.test-utils';
import {
  CsvFeedForm,
  CsvFeedFormValues,
} from '@/components/service/integrations/forms/CsvFeedForm';
import { IntegrationType, LicenseType } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

type ExpectedValues = Partial<Record<keyof CsvFeedFormValues, unknown>>;

describe('CsvFeedForm', () => {
  beforeEach(() => {
    givenSolutionCategories();
  });

  defineSlugGenerationTests({
    Form: CsvFeedForm,
    resourceName: ServiceFormResource.CSV_FEED,
  });

  defineReplaceFileConfirmationTest({
    Form: CsvFeedForm,
    fileField: JSON_FILE_FIELD,
    buildEditedDocument: buildDocument,
  });

  it('should send the filled CSV feed when the user creates it', async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(CsvFeedForm);
    await fillIntegrationCreationFields(user);
    await uploadFile(user, JSON_FILE_FIELD);

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
        integration_type: IntegrationType.CsvFeed,
        use_cases: [USE_CASE.id],
        solution_categories: [SOLUTION_CATEGORY.id],
        document: [JSON_FILE_FIELD.file],
        logo: [],
        images: [],
      } satisfies ExpectedValues)
    );
  });

  defineRequiredFileTest({
    Form: CsvFeedForm,
    resourceName: ServiceFormResource.CSV_FEED,
    fileField: JSON_FILE_FIELD,
    fillCreationFields: fillIntegrationCreationFields,
  });

  it('should save the CSV feed without a new JSON file when the user edits it', async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      CsvFeedForm,
      buildIntegrationDocument()
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
        integration_type: IntegrationType.CsvFeed,
        use_cases: [USE_CASE.id],
        solution_categories: [SOLUTION_CATEGORY.id],
        license_type: LicenseType.Commercial,
        active: true,
        logo: [],
        images: [DELETED_IMAGE, KEPT_IMAGE],
      } satisfies ExpectedValues)
    );
  });

  defineDeletedImagesTest({
    Form: CsvFeedForm,
    resourceName: ServiceFormResource.CSV_FEED,
    buildEditedDocument: buildIntegrationDocument,
  });

  defineShortDescriptionLengthTests({
    Form: CsvFeedForm,
    resourceName: ServiceFormResource.CSV_FEED,
    buildEditedDocument: buildIntegrationDocument,
    shortDescriptionMaxLength: 250,
  });
});
