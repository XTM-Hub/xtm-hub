import {
  buildDocument,
  defineIntegrationFormTests,
  defineReplaceFileConfirmationTest,
  defineSlugGenerationTests,
  JSON_FILE_FIELD,
  ServiceFormResource,
} from '@/components/service/form/ServiceForm.test-utils';
import { StreamForm } from '@/components/service/integrations/forms/StreamForm';
import { IntegrationType } from '@graphql/generated';
import { describe, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

describe('StreamForm', () => {
  defineSlugGenerationTests({
    Form: StreamForm,
    resourceName: ServiceFormResource.STREAM,
  });

  defineReplaceFileConfirmationTest({
    Form: StreamForm,
    fileField: JSON_FILE_FIELD,
    buildEditedDocument: buildDocument,
  });

  defineIntegrationFormTests({
    Form: StreamForm,
    resourceName: ServiceFormResource.STREAM,
    integrationType: IntegrationType.Stream,
  });
});
