import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomepageResourceCard, {
  HomepageResourceCardProps,
} from './HomepageResourceCard';

vi.mock('@/components/ui/BadgeOverflowCounter', () => ({
  default: ({ badges }: { badges: { id: string; name: string }[] }) => (
    <div
      role="group"
      aria-label="use cases">
      {badges.map((b) => (
        <span key={b.id}>{b.name}</span>
      ))}
    </div>
  ),
}));

const buildProps = (
  overrides: Partial<HomepageResourceCardProps> = {}
): HomepageResourceCardProps => ({
  name: 'OpenCTI',
  url: '/service/opencti',
  ...overrides,
});

describe('HomepageResourceCard', () => {
  describe('name', () => {
    it('renders the name in a heading', () => {
      testRender(<HomepageResourceCard {...buildProps()} />);

      expect(
        screen.getByRole('heading', { name: 'OpenCTI' })
      ).toBeInTheDocument();
    });
  });

  describe('link', () => {
    it('links to the provided url', () => {
      testRender(
        <HomepageResourceCard {...buildProps({ url: '/service/opencti' })} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/service/opencti');
    });
  });

  describe('logo', () => {
    it('renders an image with the logo url when provided', () => {
      testRender(
        <HomepageResourceCard
          {...buildProps({ logoUrl: 'https://cdn.example.com/logo.png' })}
        />
      );

      const img = screen.getByRole('img', { name: 'OpenCTI logo' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src');
    });

    it('renders the default Filigran icon when no logoUrl is given', () => {
      testRender(
        <HomepageResourceCard {...buildProps({ logoUrl: undefined })} />
      );

      expect(
        screen.queryByRole('img', { name: 'OpenCTI logo' })
      ).not.toBeInTheDocument();
    });
  });

  describe('short description', () => {
    it('renders the short description when provided', () => {
      testRender(
        <HomepageResourceCard
          {...buildProps({ shortDescription: 'Threat intelligence platform' })}
        />
      );

      expect(
        screen.getAllByText('Threat intelligence platform').length
      ).toBeGreaterThan(0);
    });

    it('does not render a description paragraph when shortDescription is null', () => {
      testRender(
        <HomepageResourceCard {...buildProps({ shortDescription: null })} />
      );

      expect(
        screen.queryByText('Threat intelligence platform')
      ).not.toBeInTheDocument();
    });
  });

  describe('use cases', () => {
    it('renders BadgeOverflowCounter when useCases are provided', () => {
      testRender(
        <HomepageResourceCard
          {...buildProps({
            useCases: [
              { id: 'uc-1', name: 'Threat Hunting' },
              { id: 'uc-2', name: 'SOC' },
            ],
          })}
        />
      );

      expect(
        screen.getByRole('group', { name: 'use cases' })
      ).toBeInTheDocument();
      expect(screen.getByText('Threat Hunting')).toBeInTheDocument();
      expect(screen.getByText('SOC')).toBeInTheDocument();
    });

    it('does not render BadgeOverflowCounter when useCases is empty', () => {
      testRender(<HomepageResourceCard {...buildProps({ useCases: [] })} />);

      expect(
        screen.queryByRole('group', { name: 'use cases' })
      ).not.toBeInTheDocument();
    });
  });

  describe('footer tags', () => {
    it('renders a badge for each footer tag', () => {
      testRender(
        <HomepageResourceCard
          {...buildProps({ footerTags: ['SIEM', 'EDR', 'CTI'] })}
        />
      );

      expect(screen.getByText('SIEM')).toBeInTheDocument();
      expect(screen.getByText('EDR')).toBeInTheDocument();
      expect(screen.getByText('CTI')).toBeInTheDocument();
    });

    it('renders no footer badges when footerTags is empty', () => {
      const { container } = testRender(
        <HomepageResourceCard {...buildProps({ footerTags: [] })} />
      );

      const footer = container.querySelector('.pl-3.pb-3');
      expect(footer).toBeInTheDocument();
      expect(footer).toBeEmptyDOMElement();
    });
  });

  describe('status icons', () => {
    it('renders the matching number of status icons', () => {
      testRender(
        <HomepageResourceCard
          {...buildProps({
            published: true,
            verified: true,
            deployable: false,
          })}
        />
      );

      const heading = screen.getByRole('heading', { name: 'OpenCTI' });
      const link = heading.closest('a');
      const cardContainer = link?.parentElement;
      const statusIconsContainer = cardContainer?.firstElementChild;
      expect(statusIconsContainer?.querySelectorAll('svg')).toHaveLength(2);
    });
  });

  describe('title padding', () => {
    it.each`
      published | verified | deployable | expectedPadding | description
      ${false}  | ${false} | ${false}   | ${8}            | ${'no icons → buffer only'}
      ${true}   | ${false} | ${false}   | ${32}           | ${'one icon'}
      ${true}   | ${true}  | ${false}   | ${60}           | ${'two icons'}
      ${true}   | ${true}  | ${true}    | ${88}           | ${'three icons'}
    `(
      'applies paddingRight of $expectedPadding px when $description',
      ({
        published,
        verified,
        deployable,
        expectedPadding,
      }: {
        published: boolean;
        verified: boolean;
        deployable: boolean;
        expectedPadding: number;
      }) => {
        testRender(
          <HomepageResourceCard
            {...buildProps({ published, verified, deployable })}
          />
        );

        const heading = screen.getByRole('heading', { name: 'OpenCTI' });
        const headingContainer = heading.closest('div');
        const titleContainer = headingContainer?.parentElement;

        expect(titleContainer).toHaveStyle({
          paddingRight: `${expectedPadding}px`,
        });
      }
    );
  });
});
