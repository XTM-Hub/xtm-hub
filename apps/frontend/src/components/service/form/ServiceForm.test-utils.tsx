import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import {
  DocumentImageType,
  DocumentSourceType,
  FiligranProduct,
  LicenseType,
  useSolutionCategoriesListQuery,
  useUseCasesListQuery,
} from '@graphql/generated';
import '@testing-library/jest-dom/vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { ComponentType } from 'react';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import { expect, it, vi } from 'vitest';

const SHEET_TITLE = 'Service form';
const NAME_LABEL = 'Service.Form.NameLabel';
const SLUG_LABEL = 'Service.Form.SlugLabel';
const SHORT_DESCRIPTION_LABEL = 'Service.Form.ShortDescriptionLabel';
export const PRODUCT_VERSION_LABEL = 'Service.Form.ProductVersionLabel';
const USE_CASES_LABEL = 'Service.Form.UseCasesLabel';
const SOLUTION_CATEGORIES_LABEL = 'Service.Form.SolutionCategoriesLabel';
const DELETE_IMAGE_LABEL = 'Service.Form.DeleteImage';
const PRODUCT_VERSION_ERROR = 'Product version must be X.Y.Z';
export const DESCRIPTION_PLACEHOLDER = 'Service.Form.DescriptionPlaceholder';
export const VALIDATE_LABEL = 'Utils.Validate';

export const CURRENT_USER_ID = 'current-user';
const CURRENT_USER_EMAIL = 'current.user@filigran.io';
export const CURRENT_ORGANIZATION = {
  id: 'organization-current',
  name: 'Current Organization',
  personal_space: false,
};
export const DOCUMENT_ORGANIZATION = {
  id: 'organization-document',
  name: 'Document Organization',
  personal_space: false,
};
export const UPLOADER = {
  id: 'uploader-1',
  email: 'uploader@filigran.io',
  first_name: null,
  last_name: null,
  picture: null,
};
export const USE_CASE = {
  id: 'use-case-threat-hunting',
  name: 'Threat hunting',
  color: '#001122',
};
export const SOLUTION_CATEGORY = {
  id: 'solution-category-threat-feeds',
  name: 'Threat feeds',
};

export const DOCUMENT_NAME = 'Ransomware overview';
export const DOCUMENT_SLUG = 'ransomware-overview';
export const DOCUMENT_SHORT_DESCRIPTION = 'Track ransomware activity';
export const DOCUMENT_DESCRIPTION = 'Every ransomware campaign at a glance';
export const DOCUMENT_PRODUCT_VERSION = '6.4.0';
export const NEW_NAME = 'Threat Intel: APT-28 (v2)';
export const NEW_SLUG = 'threat-intel-apt-28-v2';
export const NEW_SHORT_DESCRIPTION = 'Follow APT-28';
const NEW_PRODUCT_VERSION = '6.5.1';
export const NEW_DESCRIPTION = 'Everything about APT-28';

const buildImage = (id: string, fileName: string) => ({
  id,
  file_name: fileName,
  name: null,
  description: null,
  active: true,
  created_at: '2026-01-15T10:00:00',
  download_number: 0,
  image_type: DocumentImageType.Image,
  source_type: DocumentSourceType.Internal,
});

export const KEPT_IMAGE = buildImage('image-kept', 'kept.png');
export const DELETED_IMAGE = buildImage('image-deleted', 'deleted.png');

export const buildDocument = (
  overrides: Partial<documentItem_fragment$data> = {}
): documentItem_fragment$data => ({
  __typename: 'Document',
  id: 'document-1',
  type: 'document',
  name: DOCUMENT_NAME,
  slug: DOCUMENT_SLUG,
  short_description: DOCUMENT_SHORT_DESCRIPTION,
  description: DOCUMENT_DESCRIPTION,
  product_version: DOCUMENT_PRODUCT_VERSION,
  active: true,
  file_name: null,
  created_at: '2026-01-15T10:00:00',
  updated_at: null,
  download_number: 0,
  share_number: 0,
  service_instance: { id: 'service-instance-1', slug: null },
  subscription: null,
  children_documents: [DELETED_IMAGE, KEPT_IMAGE],
  uploader: UPLOADER,
  uploader_organization: DOCUMENT_ORGANIZATION,
  use_cases: [USE_CASE],
  ' $fragmentType': 'documentItem_fragment',
  ...overrides,
});

export const buildIntegrationDocument = (
  overrides: Partial<documentItem_fragment$data> = {}
): documentItem_fragment$data =>
  buildDocument({
    solution_categories: [SOLUTION_CATEGORY],
    license_type: LicenseType.Commercial,
    ...overrides,
  });

export enum ServiceFormResource {
  CUSTOM_DASHBOARD = 'dashboard',
  CUSTOM_VIEW = 'view',
  PLAYBOOK = 'playbook',
  SCENARIO = 'scenario',
  CSV_FEED = 'CSV feed',
  RSS_FEED = 'RSS feed',
  STREAM = 'stream',
  TAXII_FEED = 'TAXII feed',
  THIRD_PARTY_INTEGRATION = 'third party integration',
  CONNECTOR = 'connector',
}

export interface ServiceFormFileField {
  name: string;
  label: string;
  updateLabel: string;
  file: File;
}

export const JSON_FILE_FIELD: ServiceFormFileField = {
  name: 'JSON file',
  label: 'Service.Form.SelectJSONFile',
  updateLabel: 'Service.Form.UpdateJSONFile',
  file: new File(['{}'], 'document.json', { type: 'application/json' }),
};

type ServiceFormComponent<Values> = ComponentType<{
  document: documentItem_fragment$data | undefined;
  handleSubmit: (values: Values) => void;
}>;

export type ServiceFormUser = ReturnType<typeof testRender>['user'];

const createUsersEnvironment = () => {
  const environment = createMockEnvironment();
  environment.mock.queueOperationResolver((operation) =>
    MockPayloadGenerator.generate(operation, {
      Query: () => ({ users: { edges: [] } }),
    })
  );
  return environment;
};

export const renderServiceForm = <Values,>(
  Form: ServiceFormComponent<Values>,
  document?: documentItem_fragment$data
) => {
  const handleSubmit = vi.fn();
  vi.mocked(useUseCasesListQuery).mockReturnValue({
    data: {
      useCases: {
        totalCount: 1,
        edges: [{ node: USE_CASE }],
      },
    },
  } as ReturnType<typeof useUseCasesListQuery>);

  return {
    handleSubmit,
    ...testRender(
      <SheetWithPreventingDialog
        open
        setOpen={vi.fn()}
        title={SHEET_TITLE}>
        <Form
          document={document}
          handleSubmit={handleSubmit}
        />
      </SheetWithPreventingDialog>,
      {
        relayConfig: createUsersEnvironment(),
        me: {
          id: CURRENT_USER_ID,
          email: CURRENT_USER_EMAIL,
          selected_organization_id: CURRENT_ORGANIZATION.id,
          organizations: [CURRENT_ORGANIZATION, DOCUMENT_ORGANIZATION],
        },
      }
    ),
  };
};

const typeNewNameAndShortDescription = async (user: ServiceFormUser) => {
  await user.type(screen.getByRole('textbox', { name: NAME_LABEL }), NEW_NAME);
  await user.type(
    screen.getByRole('textbox', { name: SHORT_DESCRIPTION_LABEL }),
    NEW_SHORT_DESCRIPTION
  );
};

const selectOption = async (
  user: ServiceFormUser,
  comboboxName: string,
  optionName: string
) => {
  await user.click(screen.getByRole('combobox', { name: comboboxName }));
  await user.click(screen.getByRole('option', { name: optionName }));
};

export const fillCommonCreationFields = async (user: ServiceFormUser) => {
  await typeNewNameAndShortDescription(user);
  await user.type(
    screen.getByRole('textbox', { name: PRODUCT_VERSION_LABEL }),
    NEW_PRODUCT_VERSION
  );
  await selectOption(user, USE_CASES_LABEL, USE_CASE.name);
};

export const typeNewDescription = (user: ServiceFormUser) =>
  user.type(
    screen.getByPlaceholderText(DESCRIPTION_PLACEHOLDER),
    NEW_DESCRIPTION
  );

export const uploadFile = (
  user: ServiceFormUser,
  { label, file }: ServiceFormFileField
) => user.upload(screen.getByLabelText(label, { selector: 'input' }), file);

export const givenSolutionCategories = () =>
  vi.mocked(useSolutionCategoriesListQuery).mockReturnValue({
    data: {
      solutionCategories: {
        totalCount: 1,
        edges: [
          {
            node: { ...SOLUTION_CATEGORY, product: [FiligranProduct.Opencti] },
          },
        ],
      },
    },
  } as ReturnType<typeof useSolutionCategoriesListQuery>);

export const fillIntegrationCreationFields = async (user: ServiceFormUser) => {
  await typeNewNameAndShortDescription(user);
  await typeNewDescription(user);
  await selectOption(user, USE_CASES_LABEL, USE_CASE.name);
  await selectOption(user, SOLUTION_CATEGORIES_LABEL, SOLUTION_CATEGORY.name);
};

interface ServiceFormTestTarget<Values> {
  Form: ServiceFormComponent<Values>;
  resourceName: ServiceFormResource;
}

export const defineSlugGenerationTests = <Values,>({
  Form,
  resourceName,
}: ServiceFormTestTarget<Values>) => {
  it.each([
    { name: 'Threat hunting', slug: 'threat-hunting' },
    { name: NEW_NAME, slug: NEW_SLUG },
    { name: 'Été à Paris', slug: 'ete-a-paris' },
    { name: '--Threat--hunting--', slug: 'threat-hunting' },
  ])(
    `should fill the slug with $slug when the user names a new ${resourceName} $name`,
    async ({ name, slug }) => {
      // Given
      const { user } = renderServiceForm(Form);

      // When
      await user.type(screen.getByRole('textbox', { name: NAME_LABEL }), name);

      // Then
      expect(screen.getByRole('textbox', { name: SLUG_LABEL })).toHaveValue(
        slug
      );
    }
  );

  it.each([{ name: '!!!' }, { name: '   ' }])(
    `should leave the slug empty when the user names a new ${resourceName} $name`,
    async ({ name }) => {
      // Given
      const { user } = renderServiceForm(Form);

      // When
      await user.type(screen.getByRole('textbox', { name: NAME_LABEL }), name);

      // Then
      expect(screen.getByRole('textbox', { name: SLUG_LABEL })).toHaveValue('');
    }
  );

  it(`should empty the slug when the user clears the name of a new ${resourceName}`, async () => {
    // Given
    const { user } = renderServiceForm(Form);
    const nameField = screen.getByRole('textbox', { name: NAME_LABEL });
    await user.type(nameField, NEW_NAME);

    // When
    await user.clear(nameField);

    // Then
    expect(screen.getByRole('textbox', { name: SLUG_LABEL })).toHaveValue('');
  });
};

interface ReplaceFileConfirmationTestOptions<Values> {
  Form: ServiceFormComponent<Values>;
  fileField: ServiceFormFileField;
  buildEditedDocument: () => documentItem_fragment$data;
}

export const defineReplaceFileConfirmationTest = <Values,>({
  Form,
  fileField,
  buildEditedDocument,
}: ReplaceFileConfirmationTestOptions<Values>) => {
  it(`should ask to confirm the replacement of the ${fileField.name} when the user clicks to update it`, async () => {
    // Given
    const { user } = renderServiceForm(Form, buildEditedDocument());

    // When
    await user.click(
      screen.getByRole('button', { name: fileField.updateLabel })
    );

    // Then
    expect(
      screen.getByRole('alertdialog', { name: fileField.updateLabel })
    ).toBeInTheDocument();
  });
};

interface EditedServiceFormTestsOptions<
  Values,
> extends ServiceFormTestTarget<Values> {
  buildEditedDocument: () => documentItem_fragment$data;
}

export const defineDeletedImagesTest = <Values,>({
  Form,
  resourceName,
  buildEditedDocument,
}: EditedServiceFormTestsOptions<Values>) => {
  it(`should not send the images the user deleted when the user edits the ${resourceName}`, async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      Form,
      buildEditedDocument()
    );
    await user.click(
      within(
        screen.getByText(DELETED_IMAGE.file_name).parentElement as HTMLElement
      ).getByRole('button', { name: DELETE_IMAGE_LABEL })
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ images: [KEPT_IMAGE] })
      )
    );
  });
};

export const defineProductVersionFormatTests = <Values,>({
  Form,
  resourceName,
  buildEditedDocument,
}: EditedServiceFormTestsOptions<Values>) => {
  it.each(['6.4', 'v6.4.0', '6.4.0-rc1'])(
    `should reject the product version %s when the user saves the ${resourceName}`,
    async (productVersion) => {
      // Given
      const { user } = renderServiceForm(Form, buildEditedDocument());
      const productVersionField = screen.getByRole('textbox', {
        name: PRODUCT_VERSION_LABEL,
      });
      await user.clear(productVersionField);
      await user.type(productVersionField, productVersion);

      // When
      await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

      // Then
      expect(
        await screen.findByText(PRODUCT_VERSION_ERROR)
      ).toBeInTheDocument();
    }
  );
};

interface ShortDescriptionLengthTestsOptions<
  Values,
> extends EditedServiceFormTestsOptions<Values> {
  shortDescriptionMaxLength: number;
}

const fillShortDescription = async (
  user: ServiceFormUser,
  shortDescription: string
) => {
  const shortDescriptionField = screen.getByRole('textbox', {
    name: SHORT_DESCRIPTION_LABEL,
  });
  await user.clear(shortDescriptionField);
  await user.click(shortDescriptionField);
  await user.paste(shortDescription);
  return shortDescriptionField;
};

export const defineShortDescriptionLengthTests = <Values,>({
  Form,
  resourceName,
  buildEditedDocument,
  shortDescriptionMaxLength,
}: ShortDescriptionLengthTestsOptions<Values>) => {
  it(`should save a short description of ${shortDescriptionMaxLength} characters when the user edits the ${resourceName}`, async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      Form,
      buildEditedDocument()
    );
    const shortDescription = 'a'.repeat(shortDescriptionMaxLength);
    await fillShortDescription(user, shortDescription);

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ short_description: shortDescription })
      )
    );
  });

  it(`should reject a short description longer than ${shortDescriptionMaxLength} characters when the user edits the ${resourceName}`, async () => {
    // Given
    const { user } = renderServiceForm(Form, buildEditedDocument());
    const shortDescriptionField = await fillShortDescription(
      user,
      'a'.repeat(shortDescriptionMaxLength + 1)
    );

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(shortDescriptionField).toHaveAttribute('aria-invalid', 'true')
    );
  });
};

interface RequiredFileTestOptions<
  Values,
> extends ServiceFormTestTarget<Values> {
  fileField: ServiceFormFileField;
  fillCreationFields: (user: ServiceFormUser) => Promise<void>;
}

export const defineRequiredFileTest = <Values,>({
  Form,
  resourceName,
  fileField,
  fillCreationFields,
}: RequiredFileTestOptions<Values>) => {
  it(`should ask for the ${fileField.name} when the user creates a ${resourceName} without it`, async () => {
    // Given
    const { user } = renderServiceForm(Form);
    await fillCreationFields(user);

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(
        screen.getByLabelText(fileField.label, { selector: 'input' })
      ).toHaveAttribute('aria-invalid', 'true')
    );
  });
};

interface ServiceFormTestsOptions<Values>
  extends
    ShortDescriptionLengthTestsOptions<Values>,
    ReplaceFileConfirmationTestOptions<Values>,
    RequiredFileTestOptions<Values> {
  creationValues: NoInfer<Partial<Values>>;
  editionValues?: NoInfer<Partial<Values>>;
}

export const defineServiceFormTests = <Values,>({
  Form,
  resourceName,
  fileField,
  shortDescriptionMaxLength,
  buildEditedDocument,
  fillCreationFields,
  creationValues,
  editionValues = {},
}: ServiceFormTestsOptions<Values>) => {
  defineSlugGenerationTests({ Form, resourceName });

  it(`should keep the slug of the ${resourceName} when the user renames it`, async () => {
    // Given
    const { user } = renderServiceForm(Form, buildEditedDocument());
    const nameField = screen.getByRole('textbox', { name: NAME_LABEL });

    // When
    await user.clear(nameField);
    await user.type(nameField, NEW_NAME);

    // Then
    expect(screen.getByRole('textbox', { name: SLUG_LABEL })).toHaveValue(
      DOCUMENT_SLUG
    );
  });

  it(`should send the filled ${resourceName} when the user creates it`, async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(Form);
    await fillCreationFields(user);
    await uploadFile(user, fileField);

    // When
    await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

    // Then
    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith({
        name: NEW_NAME,
        slug: NEW_SLUG,
        uploader_id: CURRENT_USER_ID,
        short_description: NEW_SHORT_DESCRIPTION,
        product_version: NEW_PRODUCT_VERSION,
        uploader_organization_id: CURRENT_ORGANIZATION.id,
        use_cases: [USE_CASE.id],
        document: [fileField.file],
        logo: [],
        images: [],
        ...creationValues,
      })
    );
  });

  defineRequiredFileTest({ Form, resourceName, fileField, fillCreationFields });

  defineReplaceFileConfirmationTest({ Form, fileField, buildEditedDocument });

  it(`should save the ${resourceName} without a new ${fileField.name} when the user edits it`, async () => {
    // Given
    const { user, handleSubmit } = renderServiceForm(
      Form,
      buildEditedDocument()
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
        product_version: DOCUMENT_PRODUCT_VERSION,
        uploader_organization_id: DOCUMENT_ORGANIZATION.id,
        use_cases: [USE_CASE.id],
        active: true,
        logo: [],
        images: [DELETED_IMAGE, KEPT_IMAGE],
        ...editionValues,
      })
    );
  });

  defineDeletedImagesTest({ Form, resourceName, buildEditedDocument });

  defineProductVersionFormatTests({ Form, resourceName, buildEditedDocument });

  defineShortDescriptionLengthTests({
    Form,
    resourceName,
    buildEditedDocument,
    shortDescriptionMaxLength,
  });
};
