import testRender from '@/utils/test/test-render';
import { DocumentItemFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareableResourceCardImage } from './ShareableResourceCardImage';

const findDocumentLogoMock = vi.fn();

vi.mock('@/utils/documents', () => ({
  findDocumentLogo: (...args: unknown[]) => findDocumentLogoMock(...args),
}));

vi.mock('@filigran/icon', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@filigran/icon')>();
  return {
    ...actual,
    LogoFiligranIcon: () => <svg data-testid="fallback-logo" />,
  };
});

describe('ShareableResourceCardImage', () => {
  it('renders image path when a logo exists', () => {
    findDocumentLogoMock.mockReturnValue({ id: 'logo-1' });

    testRender(
      <ShareableResourceCardImage
        document={{ name: 'My resource' } as DocumentItemFragment}
        serviceInstanceId="service-1"
      />
    );

    expect(screen.getByAltText('My resource logo')).toHaveAttribute(
      'src',
      '/document/images/service-1/logo-1'
    );
  });

  it('renders filigran fallback icon when logo is missing', () => {
    findDocumentLogoMock.mockReturnValue(undefined);

    testRender(
      <ShareableResourceCardImage
        document={{ name: 'My resource' } as DocumentItemFragment}
        serviceInstanceId="service-1"
      />
    );

    expect(screen.getByTestId('fallback-logo')).toBeInTheDocument();
  });
});
