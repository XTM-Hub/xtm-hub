import { CustomViewForm } from '@/components/service/custom-views/[serviceInstanceId]/CustomViewForm';
import {
  buildDocument,
  defineServiceFormTests,
  fillCustomContentCreationFields,
  JSON_FILE_FIELD,
  NEW_DESCRIPTION,
  renderServiceForm,
  ServiceFormResource,
  typeNewDescription,
  uploadFile,
  VALIDATE_LABEL,
} from '@/components/service/form/ServiceForm.test-utils';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
}));

const ENTITY_TYPES_LABEL = 'Service.Form.EntityTypesLabel';
const ENTITY_TYPE = { id: 'Intrusion-Set', name: 'Intrusion Set' };

describe('CustomViewForm', () => {
  defineServiceFormTests({
    Form: CustomViewForm,
    resourceName: ServiceFormResource.CUSTOM_VIEW,
    fileField: JSON_FILE_FIELD,
    shortDescriptionMaxLength: 250,
    buildEditedDocument: () =>
      buildDocument({ entity_types: [ENTITY_TYPE.id] }),
    fillCreationFields: async (user) => {
      await fillCustomContentCreationFields(user);
      await typeNewDescription(user);
      await user.click(
        screen.getByRole('combobox', { name: ENTITY_TYPES_LABEL })
      );
      await user.click(screen.getByRole('option', { name: ENTITY_TYPE.name }));
    },
    creationValues: {
      description: NEW_DESCRIPTION,
      entity_types: [ENTITY_TYPE.id],
    },
    editionValues: { entity_types: [ENTITY_TYPE.id] },
  });

  it('should ask for an entity type when the user creates a view without any', async () => {
    // Given
    const { user } = renderServiceForm(CustomViewForm);
    await fillCustomContentCreationFields(user);
    await typeNewDescription(user);
    await uploadFile(user, JSON_FILE_FIELD);

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: ENTITY_TYPES_LABEL })
      ).toHaveAttribute('aria-invalid', 'true')
    );
  });
});
