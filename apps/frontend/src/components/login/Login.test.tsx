import Login from '@/components/login/Login';
import testRender from '@/utils/test/test-render';
import { mockPlatformProvider, mockSettings } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useSettingsQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSettingsQuery: mocks.useSettingsQuery,
  });
});

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return { default: () => React.createElement('svg', { role: 'img' }) };
});

// The surrounding settings disable local login: only the loaded ones enable it.
const OIDC_ONLY_SETTINGS = {
  platform_providers: [{ name: 'Login', provider: 'oidc', type: 'SSO' }],
};

describe('Login', () => {
  it('should let a visitor log in with their email when the loaded settings enable local login', () => {
    // Given
    mocks.useSettingsQuery.mockReturnValue({
      data: {
        settings: mockSettings({
          platform_providers: [mockPlatformProvider({ provider: 'local' })],
        }),
      },
    });

    // When
    testRender(<Login />, { settings: OIDC_ONLY_SETTINGS });

    // Then
    expect(screen.getByPlaceholderText('LoginPage.Email')).toBeInTheDocument();
  });
});
