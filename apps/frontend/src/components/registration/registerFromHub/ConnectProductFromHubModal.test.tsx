import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import testRender from '@/utils/test/test-render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONNECTABLE_PRODUCTS } from './ConnectFromHubForm';

const { mockUseGranted, mockUseUsersWithCapabilitiesInOrganizationQuery } =
  vi.hoisted(() => ({
    mockUseGranted: vi.fn(),
    mockUseUsersWithCapabilitiesInOrganizationQuery: vi.fn(),
  }));

vi.mock('@/hooks/use-granted', () => ({
  default: mockUseGranted,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUsersWithCapabilitiesInOrganizationQuery:
    mockUseUsersWithCapabilitiesInOrganizationQuery,
}));

describe('ConnectProductFromHubModal', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockReset();
    mockUseGranted.mockReset();
    mockUseUsersWithCapabilitiesInOrganizationQuery.mockReset();
    mockUseUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
      data: {
        usersWithCapabilitiesInOrganization: [
          { email: 'admin1@example.com' },
          { email: 'admin2@example.com' },
        ],
      },
    });
    mockUseGranted.mockReturnValue(false);
  });

  it('shows denied content and lists administrators when user has no capability', () => {
    testRender(
      <ConnectProductFromHubModal
        isOpen={true}
        onOpenChange={onOpenChange}
        origin={ConnectProductOrigin.library}
      />
    );

    expect(
      screen.getByText('Register.ConnectFromHub.PermissionRequired')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Register\.ConnectFromHub\.NotAllowedMessage/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Register.ConnectFromHub.MinimumVersionRequired')
    ).not.toBeInTheDocument();
    expect(screen.getByText('admin1@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin2@example.com')).toBeInTheDocument();
    expect(
      mockUseUsersWithCapabilitiesInOrganizationQuery
    ).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ enabled: true })
    );
  });

  it('shows allowed content when user can manage organization', () => {
    mockUseGranted.mockReturnValueOnce(true).mockReturnValueOnce(false);

    testRender(
      <ConnectProductFromHubModal
        isOpen={true}
        onOpenChange={onOpenChange}
        origin={ConnectProductOrigin.library}
      />
    );

    expect(
      screen.getByText('Register.ConnectFromHub.ConnectProduct')
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent(
      CONNECTABLE_PRODUCTS.OpenCTI
    );
    expect(
      screen.getByPlaceholderText('Register.Details.ProductURL')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Utils.Continue' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Register.ConnectFromHub.ReachAdmin',
      })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Register.ConnectFromHub.MinimumVersionRequired')
    ).toBeInTheDocument();
  });

  it('submits form and opens redirect URL when user can manage organization', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    mockUseGranted.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const { user } = testRender(
      <ConnectProductFromHubModal
        isOpen={true}
        onOpenChange={onOpenChange}
        origin={ConnectProductOrigin.homepage}
      />
    );

    const productSelect = document.querySelector(
      'select[name="product"]'
    ) as HTMLSelectElement | null;
    expect(productSelect).not.toBeNull();
    fireEvent.change(productSelect!, {
      target: { value: CONNECTABLE_PRODUCTS.OpenCTI },
    });
    await user.type(
      screen.getByPlaceholderText('Register.Details.ProductURL'),
      'https://opencti.example.com'
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Continue' }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://opencti.example.com/redirect/connect-xtm-hub?from=xtmhub_homepage',
        '_blank',
        'noopener,noreferrer'
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('disables administrators query when modal is closed', () => {
    testRender(
      <ConnectProductFromHubModal
        isOpen={false}
        onOpenChange={onOpenChange}
        origin={ConnectProductOrigin.library}
      />
    );

    expect(
      mockUseUsersWithCapabilitiesInOrganizationQuery
    ).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });
});
