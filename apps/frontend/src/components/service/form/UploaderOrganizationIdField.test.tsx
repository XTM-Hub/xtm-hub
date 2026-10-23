import { ServiceFormUploaderOrganizationIdField } from '@/components/service/form/UploaderOrganizationIdField';
import { Form, FormField } from '@/components/ui/form';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import type { MeOrganizationsQuery } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useMeOrganizationsQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useMeOrganizationsQuery: mocks.useMeOrganizationsQuery,
  });
});

const PERSONAL_ORGANIZATION_ID = 'organization-personal';
const PERSONAL_ORGANIZATION_NAME = 'john.doe@filigran.io';
const SELECTED_ORGANIZATION_ID = 'organization-filigran';
const SELECTED_ORGANIZATION_NAME = 'Filigran';
const UPLOADER_ORGANIZATION_ID = 'organization-acme';
const UPLOADER_ORGANIZATION_NAME = 'Acme Corporation';
const FIELD_LABEL = 'OrganizationInServiceAction.Organization';

const ME_ORGANIZATIONS_RESPONSE: MeOrganizationsQuery = {
  me: {
    id: 'user-1',
    selected_organization_id: SELECTED_ORGANIZATION_ID,
    organizations: [
      {
        id: PERSONAL_ORGANIZATION_ID,
        name: PERSONAL_ORGANIZATION_NAME,
        personal_space: true,
      },
      {
        id: SELECTED_ORGANIZATION_ID,
        name: SELECTED_ORGANIZATION_NAME,
        personal_space: false,
      },
      {
        id: UPLOADER_ORGANIZATION_ID,
        name: UPLOADER_ORGANIZATION_NAME,
        personal_space: false,
      },
    ],
  },
};

const DOCUMENT = {
  uploader_organization: {
    id: UPLOADER_ORGANIZATION_ID,
    name: UPLOADER_ORGANIZATION_NAME,
    personal_space: false,
  },
} as documentItem_fragment$data;

const mockLoadedOrganizations = () =>
  mocks.useMeOrganizationsQuery.mockReturnValue({
    data: ME_ORGANIZATIONS_RESPONSE,
    isLoading: false,
    isError: false,
  });

const mockLoadingOrganizations = () =>
  mocks.useMeOrganizationsQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
  });

const TestForm = ({ document }: { document?: documentItem_fragment$data }) => {
  const form = useForm<{ uploader_organization_id: string }>({
    defaultValues: { uploader_organization_id: '' },
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="uploader_organization_id"
        render={({ field }) => (
          <ServiceFormUploaderOrganizationIdField
            field={field}
            isCreation={!document}
            document={document}
          />
        )}
      />
    </Form>
  );
};

// The field is hidden on creation, so the hidden elements are queried too.
const getOrganizationSelect = () =>
  screen.getByRole('combobox', { name: FIELD_LABEL, hidden: true });

describe('ServiceFormUploaderOrganizationIdField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadedOrganizations();
  });

  it("should list the user's organizations by name when the options are opened", async () => {
    // Given
    const { user } = testRender(<TestForm document={DOCUMENT} />);

    // When
    await user.click(getOrganizationSelect());

    // Then
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual([
      PERSONAL_ORGANIZATION_NAME,
      SELECTED_ORGANIZATION_NAME,
      UPLOADER_ORGANIZATION_NAME,
    ]);
  });

  it.each([
    {
      context: 'a document is created',
      document: undefined,
      expectedOrganizationName: SELECTED_ORGANIZATION_NAME,
    },
    {
      context: 'a document is edited',
      document: DOCUMENT,
      expectedOrganizationName: UPLOADER_ORGANIZATION_NAME,
    },
  ])(
    'should select $expectedOrganizationName by default when $context',
    ({ document, expectedOrganizationName }) => {
      // Given / When
      testRender(<TestForm document={document} />);

      // Then
      expect(getOrganizationSelect()).toHaveTextContent(
        expectedOrganizationName
      );
    }
  );

  it('should disable the field when the organizations are loading', () => {
    // Given
    mockLoadingOrganizations();

    // When
    testRender(<TestForm document={DOCUMENT} />);

    // Then
    expect(getOrganizationSelect()).toBeDisabled();
  });

  it('should select the selected organization by default when the organizations finish loading after the first render', () => {
    // Given
    mockLoadingOrganizations();
    const { rerender } = testRender(<TestForm />);

    // When
    mockLoadedOrganizations();
    rerender(<TestForm />);

    // Then
    expect(getOrganizationSelect()).toHaveTextContent(
      SELECTED_ORGANIZATION_NAME
    );
  });
});
