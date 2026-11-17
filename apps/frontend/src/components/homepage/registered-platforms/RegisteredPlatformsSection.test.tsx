import { RegisteredPlatformsSection } from '@/components/homepage/registered-platforms/RegisteredPlatformsSection';
import { mockTranslations } from '@/utils/test/mock-translations';
import {
  PlatformContract,
  RegisteredPlatformsQuery,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/get-translate', () => ({
  getTranslate: vi.fn(async () => mockTranslations()),
}));

vi.mock(
  '@/components/homepage/registered-platforms/RegisteredPlatformCard',
  () => ({
    default: () => <div data-testid="registered-platform-card" />,
  })
);

const buildRegisteredPlatform = (
  overrides: Partial<
    RegisteredPlatformsQuery['registeredPlatforms'][number]
  > = {}
): RegisteredPlatformsQuery['registeredPlatforms'][number] => ({
  id: 'platform-1',
  identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
  title: 'OpenCTI Platform',
  contract: PlatformContract.Ee,
  deployment_request: null,
  subscription: {
    start_date: null,
    end_date: null,
    service_instance_id: 'svc-1',
  },
  ...overrides,
});

const renderSection = async (
  registeredPlatforms: RegisteredPlatformsQuery['registeredPlatforms'],
  welcomeName?: string
) =>
  render(
    await RegisteredPlatformsSection({
      welcomeName,
      registeredPlatformsData: { registeredPlatforms },
    })
  );

describe('RegisteredPlatformsSection', () => {
  it('renders nothing when no platform is registered', async () => {
    const { container } = await renderSection([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a section surface with the design system elevation and padding', async () => {
    const { container } = await renderSection([buildRegisteredPlatform()]);

    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveClass('layer-1', 'p-4');
  });

  it('is positioned so it paints above the blue gradient', async () => {
    const { container } = await renderSection([buildRegisteredPlatform()]);

    expect(container.querySelector('section')).toHaveClass('relative');
  });

  it('keeps the responsive width, max height and scroll on the surface', async () => {
    const { container } = await renderSection([buildRegisteredPlatform()]);

    expect(container.querySelector('section')).toHaveClass(
      'w-full',
      'xl:w-3/8',
      'xl:max-h-96',
      'xl:overflow-y-auto'
    );
  });

  it.each([
    { welcomeName: undefined, expectedKey: 'PublicHomePage.XtmPlatform.Label' },
    {
      welcomeName: 'Ada',
      expectedKey: 'PublicHomePage.XtmPlatform.LabelWithName',
    },
  ])(
    'renders the welcome label $expectedKey for welcomeName $welcomeName',
    async ({ welcomeName, expectedKey }) => {
      await renderSection([buildRegisteredPlatform()], welcomeName);

      expect(screen.getByText(expectedKey)).toBeInTheDocument();
    }
  );

  it('renders one card per registered platform', async () => {
    await renderSection([
      buildRegisteredPlatform({ id: 'platform-1' }),
      buildRegisteredPlatform({ id: 'platform-2' }),
      buildRegisteredPlatform({ id: 'platform-3' }),
    ]);

    expect(screen.getAllByTestId('registered-platform-card')).toHaveLength(3);
  });
});
