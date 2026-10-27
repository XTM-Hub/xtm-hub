import {
  buildDocument,
  defineServiceFormTests,
  fillCustomContentCreationFields,
  NEW_DESCRIPTION,
  renderServiceForm,
  ServiceFormFileField,
  ServiceFormResource,
  typeNewDescription,
} from '@/components/service/form/ServiceForm.test-utils';
import { OpenaevScenarioForm } from '@/components/service/openaev-scenarios/[serviceInstanceId]/OpenaevScenarioForm';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUseCasesListQuery: vi.fn(),
}));

const CANCEL_LABEL = 'Utils.Cancel';
const PREVENT_CLOSE_TITLE = 'DialogActions.PreventSheetTitle';
const SCENARIO_FILE_FIELD: ServiceFormFileField = {
  name: 'scenario file',
  label: 'Service.OpenAEVScenario.Form.OpenAEVScenarioFile',
  updateLabel: 'Service.OpenAEVScenario.Form.UpdateZIPFile',
  file: new File(['zip'], 'scenario.zip', { type: 'application/zip' }),
};

describe('OpenaevScenarioForm', () => {
  defineServiceFormTests({
    Form: OpenaevScenarioForm,
    resourceName: ServiceFormResource.SCENARIO,
    fileField: SCENARIO_FILE_FIELD,
    shortDescriptionMaxLength: 250,
    buildEditedDocument: buildDocument,
    fillCreationFields: async (user) => {
      await fillCustomContentCreationFields(user);
      await typeNewDescription(user);
    },
    creationValues: { description: NEW_DESCRIPTION },
  });

  it('should ask for confirmation before closing when the user started replacing the scenario file', async () => {
    // Given
    const { user } = renderServiceForm(OpenaevScenarioForm, buildDocument());
    await user.click(
      screen.getByRole('button', { name: SCENARIO_FILE_FIELD.updateLabel })
    );
    await user.click(
      within(
        screen.getByRole('alertdialog', {
          name: SCENARIO_FILE_FIELD.updateLabel,
        })
      ).getByRole('button', { name: CANCEL_LABEL })
    );

    // When
    await user.click(screen.getByRole('button', { name: CANCEL_LABEL }));

    // Then
    expect(
      await screen.findByRole('alertdialog', { name: PREVENT_CLOSE_TITLE })
    ).toBeInTheDocument();
  });
});
