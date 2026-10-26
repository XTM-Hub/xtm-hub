import {
  buildDocument,
  defineServiceFormTests,
  DESCRIPTION_PLACEHOLDER,
  fillCommonCreationFields,
  JSON_FILE_FIELD,
  renderServiceForm,
  ServiceFormResource,
} from '@/components/service/form/ServiceForm.test-utils';
import {
  descriptionValue,
  OpenctiPlaybookForm,
} from '@/components/service/opencti-playbooks/[serviceInstanceId]/OpenctiPlaybookForm';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
}));

describe('OpenctiPlaybookForm', () => {
  defineServiceFormTests({
    Form: OpenctiPlaybookForm,
    resourceName: ServiceFormResource.PLAYBOOK,
    fileField: JSON_FILE_FIELD,
    shortDescriptionMaxLength: 250,
    buildEditedDocument: buildDocument,
    fillCreationFields: fillCommonCreationFields,
    creationValues: { description: descriptionValue },
  });

  it('should pre-fill the description with the playbook template when the user creates a playbook', () => {
    // Given / When
    renderServiceForm(OpenctiPlaybookForm);

    // Then
    expect(screen.getByPlaceholderText(DESCRIPTION_PLACEHOLDER)).toHaveValue(
      descriptionValue
    );
  });
});
