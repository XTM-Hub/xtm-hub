import { ServiceFormUploaderOrganizationIdField } from '@/components/service/form/UploaderOrganizationIdField';
import { Form, FormField } from '@/components/ui/form';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import type { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import type { MeOrganizationsQuery } from '@graphql/generated';
import {
  focusManager,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchMeOrganizations: vi.fn(),
  useMeOrganizationsQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useMeOrganizationsQuery: mocks.useMeOrganizationsQuery,
  });
});

// Keeps the options the field passes, only the request is mocked.
const useMeOrganizationsQueryWithMockedFetch = (
  _client: unknown,
  _variables: unknown,
  options?: Omit<UseQueryOptions<MeOrganizationsQuery>, 'queryKey'>
) =>
  useQuery({
    ...options,
    queryKey: ['MeOrganizations'],
    queryFn: mocks.fetchMeOrganizations,
  });

const PERSONAL_ORGANIZATION_ID = 'organization-personal';
const PERSONAL_ORGANIZATION_NAME = 'john.doe@filigran.io';
const SELECTED_ORGANIZATION_ID = 'organization-filigran';
const SELECTED_ORGANIZATION_NAME = 'Filigran';
const UPLOADER_ORGANIZATION_ID = 'organization-acme';
const UPLOADER_ORGANIZATION_NAME = 'Acme Corporation';
const FIELD_LABEL = 'OrganizationInServiceAction.Organization';

// The user the server loaded into the portal context.
const PORTAL_ME: Partial<meContext_fragment$data> = {
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
};

const DOCUMENT = {
  uploader_organization: {
    id: UPLOADER_ORGANIZATION_ID,
    name: UPLOADER_ORGANIZATION_NAME,
    personal_space: false,
  },
} as documentItem_fragment$data;

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

const renderField = (document?: documentItem_fragment$data) =>
  testRender(<TestForm document={document} />, { me: PORTAL_ME });

// The field is hidden on creation, so the hidden elements are queried too.
const getOrganizationSelect = () =>
  screen.getByRole('combobox', { name: FIELD_LABEL, hidden: true });

describe('ServiceFormUploaderOrganizationIdField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useMeOrganizationsQuery.mockImplementation(
      useMeOrganizationsQueryWithMockedFetch
    );
  });

  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it("should list the user's organizations by name when the options are opened", async () => {
    // Given
    const { user } = renderField(DOCUMENT);

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
      renderField(document);

      // Then
      expect(getOrganizationSelect()).toHaveTextContent(
        expectedOrganizationName
      );
    }
  );

  it('should not query the organizations when it mounts or the window regains focus', () => {
    // Given
    renderField(DOCUMENT);

    // When
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    // Then
    expect(getOrganizationSelect()).toHaveTextContent(
      UPLOADER_ORGANIZATION_NAME
    );
    expect(mocks.fetchMeOrganizations).not.toHaveBeenCalled();
  });
});
