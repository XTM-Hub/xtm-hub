import testRender from '@/utils/test/test-render';
import { PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Page from './page';

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };

describe('Admin parameters page', () => {
  it('should show the platform parameters to an administrator', () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: 'MenuLinks.Parameter' })
    ).toBeInTheDocument();
    expect(screen.getByText('Parameters.Version')).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the parameters', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByText('Parameters.Version')).not.toBeInTheDocument();
  });
});
