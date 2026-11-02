import { RegistrationLearnMore } from '@/components/service/registration/RegistrationLearnMore';
import { fetchServiceInstanceLinksByTags } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
  ServiceInstanceTag,
} from '@graphql/generated';
import {
  mockSeoServiceInstance,
  mockServiceDefinition,
  mockServiceLink,
} from '@graphql/mocks';
import en from '@messages/en.json';
import openaevEcosystem from '@public/openaev_ecosystem.png';
import openctiEcosystem from '@public/opencti_ecosystem.png';
import xtmoneEcosystem from '@public/xtmone_ecosystem.png';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '@/utils/seo-service-instance/utils/seo-service-instance.server.utils',
  () => ({
    fetchServiceInstanceLinksByTags: vi.fn(),
  })
);

vi.mock('@/hooks/get-translate', () => ({
  getTranslate: vi.fn(async () =>
    mockTranslations({ translate: translateWithValues })
  ),
}));

const XTM_ONE = 'XTM One';
const OPENCTI = 'OpenCTI';
const OPENAEV = 'OpenAEV';
const XTMONE_DOCUMENTATION_NAME = 'XTM One Documentation';
const XTMONE_DOCUMENTATION_URL = 'https://docs.xtmone.io/';

const renderRegistrationLearnMore = async (
  platformIdentifier: PlatformIdentifier
) => testRender(await RegistrationLearnMore({ platformIdentifier }));

describe('RegistrationLearnMore', () => {
  beforeEach(() => {
    vi.mocked(fetchServiceInstanceLinksByTags).mockResolvedValue([]);
  });

  it.each(Object.values(PlatformIdentifier))(
    'should list the XTM One, OpenCTI and OpenAEV products in this order on the %s page',
    async (platformIdentifier) => {
      // Given / When
      await renderRegistrationLearnMore(platformIdentifier);

      // Then
      expect(
        screen
          .getAllByRole('heading', { level: 3 })
          .map((heading) => heading.textContent)
      ).toEqual([XTM_ONE, OPENCTI, OPENAEV]);
    }
  );

  it.each(Object.values(PlatformIdentifier))(
    'should introduce the platform of the %s page',
    async (platformIdentifier) => {
      // Given / When
      await renderRegistrationLearnMore(platformIdentifier);

      // Then
      expect(
        screen.getByText(
          `Service.Trials.XTMPlatform.${platformIdentifier}.Intro`
        )
      ).toBeInTheDocument();
    }
  );

  it.each(
    Object.values(PlatformIdentifier).flatMap((product) =>
      ['Tagline', 'Description'].map((text) => ({ product, text }))
    )
  )(
    'should show the $text of the $product product',
    async ({ product, text }) => {
      // Given / When
      await renderRegistrationLearnMore(PlatformIdentifier.Xtmone);

      // Then
      expect(
        screen.getByText(`Service.Trials.XTMPlatform.${product}.${text}`)
      ).toBeInTheDocument();
    }
  );

  // The keys are built from the platform identifier, so no static check sees them; i18n:check aligns the other locales on en.
  it.each(Object.values(PlatformIdentifier))(
    'should have an intro, a tagline and a description for %s in the English messages',
    (platformIdentifier) => {
      // Given / When
      const platformTexts = en.Service.Trials.XTMPlatform[platformIdentifier];

      // Then
      expect(platformTexts).toEqual({
        Intro: expect.any(String),
        Tagline: expect.any(String),
        Description: expect.any(String),
      });
    }
  );

  it.each([
    {
      platformIdentifier: PlatformIdentifier.Opencti,
      platformName: OPENCTI,
      ecosystemImage: openctiEcosystem,
    },
    {
      platformIdentifier: PlatformIdentifier.Openaev,
      platformName: OPENAEV,
      ecosystemImage: openaevEcosystem,
    },
    {
      platformIdentifier: PlatformIdentifier.Xtmone,
      platformName: XTM_ONE,
      ecosystemImage: xtmoneEcosystem,
    },
  ])(
    'should illustrate the $platformName ecosystem',
    async ({ platformIdentifier, platformName, ecosystemImage }) => {
      // Given / When
      await renderRegistrationLearnMore(platformIdentifier);

      // Then
      expect(
        screen.getByAltText(
          translateWithValues('Service.Trials.XTMPlatform.IllustrationAlt', {
            platformName,
          })
        )
      ).toHaveAttribute('src', String(ecosystemImage));
    }
  );

  it.each([
    {
      platformIdentifier: PlatformIdentifier.Opencti,
      serviceInstanceTag: ServiceInstanceTag.OpenCti,
    },
    {
      platformIdentifier: PlatformIdentifier.Openaev,
      serviceInstanceTag: ServiceInstanceTag.OpenAev,
    },
    {
      platformIdentifier: PlatformIdentifier.Xtmone,
      serviceInstanceTag: ServiceInstanceTag.XtmOne,
    },
  ])(
    'should fetch the quick start links tagged for the $platformIdentifier page',
    async ({ platformIdentifier, serviceInstanceTag }) => {
      // Given / When
      await renderRegistrationLearnMore(platformIdentifier);

      // Then
      expect(fetchServiceInstanceLinksByTags).toHaveBeenCalledWith([
        ServiceInstanceTag.Trial,
        serviceInstanceTag,
      ]);
    }
  );

  it('should link each quick start card to its page', async () => {
    // Given
    vi.mocked(fetchServiceInstanceLinksByTags).mockResolvedValue([
      mockSeoServiceInstance({
        name: XTMONE_DOCUMENTATION_NAME,
        slug: 'xtmone-documentation',
        illustration_document_id: null,
        logo_document_id: null,
        service_definition: mockServiceDefinition({
          identifier: ServiceDefinitionIdentifier.Link,
        }),
        links: [mockServiceLink({ url: XTMONE_DOCUMENTATION_URL })],
      }),
    ]);

    // When
    await renderRegistrationLearnMore(PlatformIdentifier.Xtmone);

    // Then
    expect(
      screen.getByRole('link', { name: new RegExp(XTMONE_DOCUMENTATION_NAME) })
    ).toHaveAttribute('href', XTMONE_DOCUMENTATION_URL);
  });
});
