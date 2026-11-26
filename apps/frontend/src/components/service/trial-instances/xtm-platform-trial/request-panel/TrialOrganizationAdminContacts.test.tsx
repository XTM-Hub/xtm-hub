import { TrialOrganizationAdminContacts } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/TrialOrganizationAdminContacts';
import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  UsersWithCapabilitiesInOrganizationQuery,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlMocks = vi.hoisted(() => ({
  useUsersWithCapabilitiesInOrganizationQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    useUsersWithCapabilitiesInOrganizationQuery:
      graphqlMocks.useUsersWithCapabilitiesInOrganizationQuery,
  };
});

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

const ORGANIZATION_ID = 'organization-id';
const ADMIN_LIST_TITLE =
  'Service.Trials.XtmPlatform.Page.NotAdmin.AdminListTitle';

describe('TrialOrganizationAdminContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries both capabilities that allow requesting a trial', () => {
    graphqlMocks.useUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
      data: undefined,
    });

    testRender(
      <TrialOrganizationAdminContacts organizationId={ORGANIZATION_ID} />
    );

    const [, variables, options] =
      graphqlMocks.useUsersWithCapabilitiesInOrganizationQuery.mock.calls[0];
    expect(variables).toEqual({
      input: {
        organizationId: ORGANIZATION_ID,
        capabilities: [
          OrganizationCapability.AdministrateOrganization,
          OrganizationCapability.ManagePlatformRegistration,
        ],
      },
    });
    expect(options.enabled).toBe(true);
  });

  it('renders the email of every administrator', () => {
    graphqlMocks.useUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
      data: {
        usersWithCapabilitiesInOrganization: [
          { id: 'user-1', email: 'alice@acme.com' },
          { id: 'user-2', email: 'bob@acme.com' },
        ],
      },
    });

    testRender(
      <TrialOrganizationAdminContacts organizationId={ORGANIZATION_ID} />
    );

    expect(
      screen.getByText(ADMIN_LIST_TITLE, { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
    expect(screen.getByText('bob@acme.com')).toBeInTheDocument();
  });

  it('displays at most five administrators', () => {
    graphqlMocks.useUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
      data: {
        usersWithCapabilitiesInOrganization: Array.from(
          { length: 8 },
          (_, index) => ({
            id: `user-${index}`,
            email: `admin${index}@acme.com`,
          })
        ),
      },
    });

    testRender(
      <TrialOrganizationAdminContacts organizationId={ORGANIZATION_ID} />
    );

    expect(screen.getByText('admin4@acme.com')).toBeInTheDocument();
    expect(screen.queryByText('admin5@acme.com')).not.toBeInTheDocument();
    expect(screen.getAllByText(/@acme\.com$/)).toHaveLength(5);
  });

  it.each<[string, UsersWithCapabilitiesInOrganizationQuery | undefined]>([
    ['the query has not resolved yet', undefined],
    [
      'the organization has no administrator',
      { usersWithCapabilitiesInOrganization: [] },
    ],
  ])('renders nothing when %s', (_label, data) => {
    graphqlMocks.useUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
      data,
    });

    const { container } = testRender(
      <TrialOrganizationAdminContacts organizationId={ORGANIZATION_ID} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
