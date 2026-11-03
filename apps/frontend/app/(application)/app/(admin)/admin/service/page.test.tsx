import testRender from '@/utils/test/test-render';
import { PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page from './page';

vi.mock('react-relay', () => ({
  useLazyLoadQuery: () => ({}),
  useRefetchableFragment: () => [{ serviceInstances: { edges: [] } }, vi.fn()],
}));

vi.mock('@/components/service/AdminServiceTab', () => ({
  default: () => <div>admin-service-tab</div>,
  ADMIN_SERVICE_TAB_SERVICE_DEFINITION_IDENTIFIERS: [],
}));

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };

describe('Admin service page', () => {
  it('should show the services to an administrator', () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(screen.getByText('admin-service-tab')).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the services', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByText('admin-service-tab')).not.toBeInTheDocument();
  });
});
