import {
  buildDocument,
  defineIntegrationFormTests,
  defineReplaceFileConfirmationTest,
  defineSlugGenerationTests,
  JSON_FILE_FIELD,
  ServiceFormResource,
} from '@/components/service/form/ServiceForm.test-utils';
import { RssFeedForm } from '@/components/service/integrations/forms/RssFeedForm';
import { IntegrationType } from '@graphql/generated';
import { describe, vi } from 'vitest';

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
  });
});
