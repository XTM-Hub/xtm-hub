import { PortalContext } from '@/components/me/AppPortalContext';
import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import testRender from '@/utils/test/test-render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('should explain that a connected product is needed when a user without permission opens it from the library', () => {
    // Given / When
    testRender(
      <ConnectProductFromHubModal
        isOpen={true}
        onOpenChange={onOpenChange}
        origin={ConnectProductOrigin.library}
      />
    );

    // Then
    expect(
      screen.getByText(/Register\.ConnectFromHub\.ConnectedProductSentence/)
    ).toBeInTheDocument();
  });

  it('should not mention a connected product when a user without permission opens it from the homepage', () => {
    // Given / When
    testRender(
      <ConnectProductFromHubModal
        isOpen={true}
        onOpenChange={onOpenChange}
        origin={ConnectProductOrigin.homepage}
      />
    );

    // Then
    expect(
      screen.queryByText(/Register\.ConnectFromHub\.ConnectedProductSentence/)
    ).not.toBeInTheDocument();
  });

  it('should explain that a connected product is needed when an allowed user opens it from the library', () => {
    mockUseGranted.mockReturnValueOnce(true).mockReturnValueOnce(false);

    // Given / When
    testRender(
      <ConnectProductFromHubModal
        isOpen={true}
        onOpenChange={onOpenChange}
        origin={ConnectProductOrigin.library}
      />
    );

    // Then
    expect(
      screen.getByText(/Register\.ConnectFromHub\.ConnectedProductSentence/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Register\.ConnectFromHub\.RedirectionMessage/)
    ).toBeInTheDocument();
  });

  it('should send a visitor without a session back to the app when opening it', () => {
    // Given
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });

    // When
    testRender(
      <PortalContext.Provider value={{ me: null }}>
        <ConnectProductFromHubModal
          isOpen={true}
          onOpenChange={onOpenChange}
          origin={ConnectProductOrigin.homepage}
        />
      </PortalContext.Provider>
    );

    // Then
    expect(push).toHaveBeenCalledExactlyOnceWith('/app');
  });

  describe('when a user without permission reaches out to administrators', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should open an email to the first administrator with the others in copy', async () => {
      // Given
      const location = { href: '' };
      vi.stubGlobal('location', location);
      const { user } = testRender(
        <ConnectProductFromHubModal
          isOpen={true}
          onOpenChange={onOpenChange}
          origin={ConnectProductOrigin.homepage}
        />
      );

      // When
      await user.click(
        screen.getByRole('button', {
          name: 'Register.ConnectFromHub.ReachAdmin',
        })
      );

      // Then
      expect(location.href).toMatch(/^mailto:admin1@example\.com\?/);
      expect(location.href).toContain(
        `cc=${encodeURIComponent('admin2@example.com')}`
      );
    });

    it('should not copy anyone when there is a single administrator', async () => {
      // Given
      mockUseUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
        data: {
          usersWithCapabilitiesInOrganization: [
            { email: 'admin1@example.com' },
          ],
        },
      });
      const location = { href: '' };
      vi.stubGlobal('location', location);
      const { user } = testRender(
        <ConnectProductFromHubModal
          isOpen={true}
          onOpenChange={onOpenChange}
          origin={ConnectProductOrigin.homepage}
        />
      );

      // When
      await user.click(
        screen.getByRole('button', {
          name: 'Register.ConnectFromHub.ReachAdmin',
        })
      );

      // Then
      expect(location.href).toMatch(/^mailto:admin1@example\.com\?/);
      expect(location.href).not.toContain('cc=');
    });
  });
});
