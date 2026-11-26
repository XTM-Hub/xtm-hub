import { ExternalLink } from '@/components/ExternalLink';
import testRender from '@/utils/test/test-render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const URL = 'https://opencti.example.com';
const ANALYTICS_ID = 'admin_trial_platform_open';

describe('ExternalLink', () => {
  it('should open an http(s) url in a new tab, without giving it access to the Hub', () => {
    // Given / When
    testRender(
      <ExternalLink
        url={URL}
        analyticsId={ANALYTICS_ID}
      />
    );

    // Then
    const link = screen.getByRole('link', { name: URL });
    expect(link).toHaveAttribute('href', `${URL}/`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('data-analytics-id', ANALYTICS_ID);
  });

  it('should open a url without scheme as https', () => {
    // Given / When
    testRender(
      <ExternalLink
        url="opencti.example.com:8080"
        analyticsId={ANALYTICS_ID}
      />
    );

    // Then
    expect(
      screen.getByRole('link', { name: 'opencti.example.com:8080' })
    ).toHaveAttribute('href', 'https://opencti.example.com:8080/');
  });

  it.each([
    ['javascript:alert(1)', 'a javascript scheme'],
    ['file:///etc/passwd', 'a file scheme'],
    ['data:text/html,<p>platform</p>', 'a data scheme'],
  ])('should render the url %s, with %s, as plain text', (url) => {
    // Given / When
    testRender(
      <ExternalLink
        url={url}
        analyticsId={ANALYTICS_ID}
      />
    );

    // Then
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(url)).toBeInTheDocument();
  });

  it.each([
    [null, 'no url'],
    ['   ', 'a whitespace-only url'],
  ])('should fall back to a dash when given %j (%s)', (url) => {
    // Given / When
    testRender(
      <ExternalLink
        url={url}
        analyticsId={ANALYTICS_ID}
      />
    );

    // Then
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should not let the click reach the row around the link', () => {
    // Given
    const onRowClick = vi.fn();
    testRender(
      <div onClick={onRowClick}>
        <ExternalLink
          url={URL}
          analyticsId={ANALYTICS_ID}
        />
      </div>
    );

    // When
    fireEvent.click(screen.getByRole('link', { name: URL }));

    // Then
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
