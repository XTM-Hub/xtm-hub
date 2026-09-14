import { TrialsExternalLink } from '@/components/trials/tab/TrialsExternalLink';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('TrialsExternalLink', () => {
  it('should render a scheme-less url as an external https link', () => {
    testRender(<TrialsExternalLink url="opencti.example.com" />);

    const link = screen.getByRole('link', { name: 'opencti.example.com' });
    expect(link).toHaveAttribute('href', 'https://opencti.example.com/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render unsafe urls as plain text', () => {
    testRender(<TrialsExternalLink url="javascript:alert(1)" />);

    expect(
      screen.queryByRole('link', { name: 'javascript:alert(1)' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });

  it('should fall back to a dash when no url is provided', () => {
    testRender(<TrialsExternalLink url={null} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should fall back to a dash for a whitespace-only url', () => {
    testRender(<TrialsExternalLink url="   " />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
