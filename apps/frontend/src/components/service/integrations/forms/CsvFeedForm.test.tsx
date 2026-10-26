import {
  buildDocument,
  defineReplaceFileConfirmationTest,
  defineSlugGenerationTests,
  JSON_FILE_FIELD,
  ServiceFormResource,
} from '@/components/service/form/ServiceForm.test-utils';
import { CsvFeedForm } from '@/components/service/integrations/forms/CsvFeedForm';
import { describe, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

describe('CsvFeedForm', () => {
  defineSlugGenerationTests({
    Form: CsvFeedForm,
    resourceName: ServiceFormResource.CSV_FEED,
  });

  defineReplaceFileConfirmationTest({
    Form: CsvFeedForm,
    fileField: JSON_FILE_FIELD,
    buildEditedDocument: buildDocument,
  });
});
