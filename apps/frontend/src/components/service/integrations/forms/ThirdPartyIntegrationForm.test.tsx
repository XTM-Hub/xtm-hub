import {
  defineSlugGenerationTests,
  ServiceFormResource,
} from '@/components/service/form/ServiceForm.test-utils';
import { ThirdPartyIntegrationForm } from '@/components/service/integrations/forms/ThirdPartyIntegrationForm';
import { describe, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
  useSolutionCategoriesListQuery: vi.fn(() => ({ data: undefined })),
}));

describe('ThirdPartyIntegrationForm', () => {
  defineSlugGenerationTests({
    Form: ThirdPartyIntegrationForm,
    resourceName: ServiceFormResource.THIRD_PARTY_INTEGRATION,
  });
});
