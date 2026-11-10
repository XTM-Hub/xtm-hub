import {
  MANAGE_USER_CAPABILITIES_DOCUMENTATION_URL,
  MAX_DISPLAYED_ADMINISTRATORS,
  PlatformMetricsAccessRequest,
} from '@/components/service/registration/PlatformMetricsAccessRequest';
import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  useUsersWithCapabilitiesInOrganizationQuery,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUsersWithCapabilitiesInOrganizationQuery: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORGANIZATION_ID = 'organization-id';
const PLATFORM_TITLE = 'Acme OpenCTI';
const ADMINISTRATORS = [
  {
    id: 'admin-1',
    email: 'j.martin@acme.example',
    first_name: 'Jeanne',
    last_name: 'Martin',
  },
  {
    id: 'admin-2',
    email: 's.chen@acme.example',
    first_name: 'Sam',
    last_name: 'Chen',
  },
];
const ADMINISTRATOR_LIST = 'Register.Metrics.AccessRequest.AdministratorList';

const mockAdministrators = (administrators: typeof ADMINISTRATORS | null) =>
  vi.mocked(useUsersWithCapabilitiesInOrganizationQuery).mockReturnValue({
    data: administrators
      ? { usersWithCapabilitiesInOrganization: administrators }
      : undefined,
  } as ReturnType<typeof useUsersWithCapabilitiesInOrganizationQuery>);

const renderAccessRequest = (organizationId: string | null = ORGANIZATION_ID) =>
  testRender(<PlatformMetricsAccessRequest platformTitle={PLATFORM_TITLE} />, {
    me: { selected_organization_id: organizationId },
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlatformMetricsAccessRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdministrators(ADMINISTRATORS);
  });

  it('should query the administrators of the selected organization', () => {
    // Given / When
    renderAccessRequest();

    // Then
    expect(useUsersWithCapabilitiesInOrganizationQuery).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          organizationId: ORGANIZATION_ID,
          capabilities: [OrganizationCapability.AdministrateOrganization],
        },
      },
      { enabled: true }
    );
  });

  it('should not query the administrators without a selected organization', () => {
    // Given / When
    renderAccessRequest(null);

    // Then
    expect(useUsersWithCapabilitiesInOrganizationQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { enabled: false }
    );
  });

  it('should explain which capability the metrics need', () => {
    // Given / When
    renderAccessRequest();

    // Then
    expect(
      screen.getByText('Register.Metrics.AccessRequest.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Register.Metrics.AccessRequest.Description', {
        exact: false,
      })
    ).toBeInTheDocument();
  });

  it('should link every administrator to a prefilled access request email', () => {
    // Given / When
    renderAccessRequest();

    // Then
    expect(
      screen.getByText(ADMINISTRATOR_LIST, { exact: false })
    ).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(ADMINISTRATORS.length);
    ADMINISTRATORS.forEach(({ email }) => {
      expect(screen.getByRole('link', { name: email })).toHaveAttribute(
        'href',
        `mailto:${email}?subject=Register.Metrics.AccessRequest.EmailSubject&body=Register.Metrics.AccessRequest.EmailBody`
      );
    });
  });

  it('should only display the first administrators of a large organization', () => {
    // Given more administrators than the access request displays
    const administrators = Array.from(
      { length: MAX_DISPLAYED_ADMINISTRATORS + 2 },
      (_, index) => ({
        id: `admin-${index}`,
        email: `admin-${index}@acme.example`,
        first_name: 'Admin',
        last_name: `${index}`,
      })
    );
    mockAdministrators(administrators);

    // When
    renderAccessRequest();

    // Then
    expect(screen.getAllByRole('listitem')).toHaveLength(
      MAX_DISPLAYED_ADMINISTRATORS
    );
    expect(
      screen.getByRole('link', { name: administrators[0].email })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: administrators[MAX_DISPLAYED_ADMINISTRATORS].email,
      })
    ).not.toBeInTheDocument();
  });

  it.each`
    description                                | administrators
    ${'the administrators are still loading'}  | ${null}
    ${'the organization has no administrator'} | ${[]}
  `(
    'should leave the administrator list out when $description',
    ({ administrators }) => {
      // Given
      mockAdministrators(administrators);

      // When
      renderAccessRequest();

      // Then
      expect(
        screen.queryByText(ADMINISTRATOR_LIST, { exact: false })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    }
  );

  it('should open the documentation on user capabilities in a new tab', () => {
    // Given / When
    renderAccessRequest();

    // Then
    const documentationLink = screen.getByRole('link', {
      name: 'Register.Metrics.AccessRequest.SeeDocumentation',
    });
    expect(documentationLink).toHaveAttribute(
      'href',
      MANAGE_USER_CAPABILITIES_DOCUMENTATION_URL
    );
    expect(documentationLink).toHaveAttribute('target', '_blank');
    expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
