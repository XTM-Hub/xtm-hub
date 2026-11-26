import LoginTitle from '@/components/login/LoginTitle';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The SVG-to-component transform is a build step that Vitest does not run.
vi.mock('@public/logo_xtm_hub_dark.svg', async () => {
  const React = await import('react');
  return {
    default: (props: Record<string, unknown>) =>
      React.createElement('svg', props),
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

  it('should describe the XTM Hub logo to assistive technologies', () => {
    // Given / When
    testRender(<LoginTitle />);

    // Then
    expect(
      screen.getByRole('img', { name: 'LoginPage.Logo' })
    ).toBeInTheDocument();
  });
});
