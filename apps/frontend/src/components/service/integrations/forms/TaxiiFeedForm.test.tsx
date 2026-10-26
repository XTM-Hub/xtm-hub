import {
  buildDocument,
  defineReplaceFileConfirmationTest,
  defineSlugGenerationTests,
  JSON_FILE_FIELD,
  ServiceFormResource,
} from '@/components/service/form/ServiceForm.test-utils';
import { TaxiiFeedForm } from '@/components/service/integrations/forms/TaxiiFeedForm';
import { describe, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

describe('TaxiiFeedForm', () => {
  defineSlugGenerationTests({
    Form: TaxiiFeedForm,
    resourceName: ServiceFormResource.TAXII_FEED,
  });

  defineReplaceFileConfirmationTest({
    Form: TaxiiFeedForm,
    fileField: JSON_FILE_FIELD,
    buildEditedDocument: buildDocument,
  });
});
