import {
  buildDocument,
  buildIntegrationDocument,
  defineIntegrationFormTests,
  defineReplaceFileConfirmationTest,
  defineSlugGenerationTests,
  JSON_FILE_FIELD,
  renderServiceForm,
  ServiceFormResource,
  VALIDATE_LABEL,
} from '@/components/service/form/ServiceForm.test-utils';
import { RssFeedForm } from '@/components/service/integrations/forms/RssFeedForm';
import { IntegrationType } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

describe('RssFeedForm', () => {
  defineSlugGenerationTests({
    Form: RssFeedForm,
    resourceName: ServiceFormResource.RSS_FEED,
  });

  defineReplaceFileConfirmationTest({
    Form: RssFeedForm,
    fileField: JSON_FILE_FIELD,
    buildEditedDocument: buildDocument,
  });

  defineIntegrationFormTests({
    Form: RssFeedForm,
    resourceName: ServiceFormResource.RSS_FEED,
    integrationType: IntegrationType.RssFeed,
    creationValues: { active: true },
  });

  it('should keep the RSS feed unpublished when the user edits an unpublished one', async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      RssFeedForm,
      buildIntegrationDocument({ active: false })
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ active: false })
      )
    );
  });
});
