import { mockTranslations } from '@/utils/test/mock-translations';
import {
  SeoServiceInstanceItemFragment,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';
import {
  isExternalService,
  localizedCardDescription,
  localizedCardName,
  seoServiceInstanceToInstanceCardData,
} from './services';

const INSTANCE_ID = 'instance-id';
const INSTANCE_NAME = 'OpenCTI Integrations';
const INSTANCE_SLUG = 'opencti-integrations';
const INSTANCE_DESCRIPTION = 'Integrations for OpenCTI';
const LOGO_DOCUMENT_ID = 'logo-document-id';
const ILLUSTRATION_DOCUMENT_ID = 'illustration-document-id';
const EXTERNAL_LINK = 'https://filigran.io/external';
const NAME_KEY = `Service.Cards.${INSTANCE_SLUG}.Name`;
const DESCRIPTION_KEY = `Service.Cards.${INSTANCE_SLUG}.Description`;

const makeSeoInstance = (
  overrides: Partial<SeoServiceInstanceItemFragment> = {}
): SeoServiceInstanceItemFragment => ({
  id: INSTANCE_ID,
  name: INSTANCE_NAME,
  slug: INSTANCE_SLUG,
  description: INSTANCE_DESCRIPTION,
  logo_document_id: null,
  illustration_document_id: null,
  tags: null,
  service_definition: {
    identifier: ServiceDefinitionIdentifier.OpenctiIntegrations,
  },
  links: null,
  ...overrides,
});

const translatorWithKeys = (keys: string[]) =>
  mockTranslations({ has: (key) => keys.includes(key) });
const translatorWithEveryKey = () => mockTranslations({ has: () => true });

describe('isExternalService', () => {
  it.each([
    [ServiceDefinitionIdentifier.Link],
    [ServiceDefinitionIdentifier.OpenctiRegistration],
    [ServiceDefinitionIdentifier.OpenaevRegistration],
  ])('should treat the %s service as external', (identifier) => {
    // Given / When
    const result = isExternalService(identifier);

    // Then
    expect(result).toBe(true);
  });

  it.each([
    [ServiceDefinitionIdentifier.OpenctiIntegrations],
    [ServiceDefinitionIdentifier.XtmoneRegistration],
    [ServiceDefinitionIdentifier.XtmPlatformBundle],
  ])('should treat the %s service as internal', (identifier) => {
    // Given / When
    const result = isExternalService(identifier);

    // Then
    expect(result).toBe(false);
  });
});

describe('localizedCardName', () => {
  it('should return the translation key when a translation exists for the slug', () => {
    // Given
    const t = translatorWithKeys([NAME_KEY]);

    // When
    const result = localizedCardName(
      { slug: INSTANCE_SLUG, name: INSTANCE_NAME },
      t
    );

    // Then
    expect(result).toBe(NAME_KEY);
  });

  it.each([
    [
      'no translation exists for the slug',
      INSTANCE_SLUG,
      translatorWithKeys([]),
    ],
    ['the instance has no slug', null, translatorWithEveryKey()],
  ])('should fall back to the instance name when %s', (_context, slug, t) => {
    // Given / When
    const result = localizedCardName({ slug, name: INSTANCE_NAME }, t);

    // Then
    expect(result).toBe(INSTANCE_NAME);
  });
});

describe('localizedCardDescription', () => {
  it('should return the translation key when a translation exists for the slug', () => {
    // Given
    const t = translatorWithKeys([DESCRIPTION_KEY]);

    // When
    const result = localizedCardDescription(
      { slug: INSTANCE_SLUG, description: INSTANCE_DESCRIPTION },
      t
    );

    // Then
    expect(result).toBe(DESCRIPTION_KEY);
  });

  it.each([
    [
      'no translation exists for the slug',
      INSTANCE_SLUG,
      translatorWithKeys([]),
    ],
    ['the instance has no slug', null, translatorWithEveryKey()],
  ])(
    'should fall back to the instance description when %s',
    (_context, slug, t) => {
      // Given / When
      const result = localizedCardDescription(
        { slug, description: INSTANCE_DESCRIPTION },
        t
      );

      // Then
      expect(result).toBe(INSTANCE_DESCRIPTION);
    }
  );
});

describe('seoServiceInstanceToInstanceCardData', () => {
  it('should map a SEO service instance to the card data', () => {
    // Given
    const instance = makeSeoInstance({
      logo_document_id: LOGO_DOCUMENT_ID,
      illustration_document_id: ILLUSTRATION_DOCUMENT_ID,
    });

    // When
    const result = seoServiceInstanceToInstanceCardData(
      instance,
      translatorWithKeys([NAME_KEY, DESCRIPTION_KEY])
    );

    // Then
    expect(result).toEqual({
      id: INSTANCE_ID,
      name: NAME_KEY,
      slug: INSTANCE_SLUG,
      description: DESCRIPTION_KEY,
      displayLinkArrow: false,
      illustrationDocumentUrl: `/document/images/${INSTANCE_ID}/${ILLUSTRATION_DOCUMENT_ID}`,
      logoBackgroundImageUrl: `url(/document/images/${INSTANCE_ID}/${LOGO_DOCUMENT_ID})`,
      url: `/cybersecurity-solutions/${INSTANCE_SLUG}`,
    });
  });

  it('should have no illustration nor logo when the instance has no documents', () => {
    // Given
    const instance = makeSeoInstance();

    // When
    const result = seoServiceInstanceToInstanceCardData(
      instance,
      translatorWithKeys([])
    );

    // Then
    expect(result).toMatchObject({
      illustrationDocumentUrl: null,
      logoBackgroundImageUrl: null,
    });
  });

  it.each([
    [
      'an external service with a link',
      ServiceDefinitionIdentifier.Link,
      [{ url: EXTERNAL_LINK, name: null }],
      { url: EXTERNAL_LINK, displayLinkArrow: true },
    ],
    [
      'an external service without a link',
      ServiceDefinitionIdentifier.OpenctiRegistration,
      null,
      {
        url: `/cybersecurity-solutions/${INSTANCE_SLUG}`,
        displayLinkArrow: true,
      },
    ],
    [
      'an internal service with a link',
      ServiceDefinitionIdentifier.OpenctiIntegrations,
      [{ url: EXTERNAL_LINK, name: null }],
      {
        url: `/cybersecurity-solutions/${INSTANCE_SLUG}`,
        displayLinkArrow: false,
      },
    ],
  ])(
    'should point the card to the right url when the instance is %s',
    (_context, identifier, links, expected) => {
      // Given
      const instance = makeSeoInstance({
        service_definition: { identifier },
        links,
      });

      // When
      const result = seoServiceInstanceToInstanceCardData(
        instance,
        translatorWithKeys([])
      );

      // Then
      expect(result).toMatchObject(expected);
    }
  );
});
