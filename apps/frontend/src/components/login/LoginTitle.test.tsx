import LoginTitle from '@/components/login/LoginTitle';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { XTM_HUB_LOGO_LABEL } = vi.hoisted(() => ({
  XTM_HUB_LOGO_LABEL: 'XTM Hub logo',
}));

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return {
    default: () =>
      React.createElement('svg', {
        role: 'img',
        'aria-label': XTM_HUB_LOGO_LABEL,
      }),
  };
});

describe('LoginTitle', () => {
  it('should announce the login page to assistive technologies', () => {
    // Given / When
    testRender(<LoginTitle />);

    // Then
    expect(
      screen.getByRole('heading', { level: 1, name: 'LoginPage.Title' })
    ).toBeInTheDocument();
  });

  it('should show the XTM Hub logo', () => {
    // Given / When
    testRender(<LoginTitle />);

    // Then
    expect(
      screen.getByRole('img', { name: XTM_HUB_LOGO_LABEL })
    ).toBeInTheDocument();
  });
});
