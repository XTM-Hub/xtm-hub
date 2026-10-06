import { describe, expect, it, vi } from 'vitest';
import {
  addLocalePrefixToPath,
  resolveBaseServiceInstanceLink,
  resolvePrivateServiceInstanceLink,
  resolvePublicServiceInstanceLink,
} from './service-instance-link.util';

vi.mock('@/i18n/config', () => ({
  publicLocales: ['en', 'fr', 'ja'],
}));

describe('resolveBaseServiceInstanceLink', () => {
  it.each`
    description                                       | url                           | isLinkDisabled | expectedHref                  | expectedTarget | expectedIsExternal
    ${'http URL is external, _blank, full href'}      | ${'http://example.com'}       | ${false}       | ${'http://example.com'}       | ${'_blank'}    | ${true}
    ${'https URL is external, _blank, full href'}     | ${'https://example.com/path'} | ${false}       | ${'https://example.com/path'} | ${'_blank'}    | ${true}
    ${'internal path, _self, full href'}              | ${'/dashboard'}               | ${false}       | ${'/dashboard'}               | ${'_self'}     | ${false}
    ${'path without leading slash, _self, full href'} | ${'dashboard'}                | ${false}       | ${'dashboard'}                | ${'_self'}     | ${false}
    ${'root path, _self'}                             | ${'/'}                        | ${false}       | ${'/'}                        | ${'_self'}     | ${false}
    ${'disabled internal returns #'}                  | ${'/some/path'}               | ${true}        | ${'#'}                        | ${'_self'}     | ${false}
    ${'disabled external returns #'}                  | ${'https://example.com'}      | ${true}        | ${'#'}                        | ${'_blank'}    | ${true}
    ${'isLinkDisabled unset uses url'}                | ${'/some/path'}               | ${undefined}   | ${'/some/path'}               | ${'_self'}     | ${false}
  `(
    '$description',
    ({
      url,
      isLinkDisabled,
      expectedHref,
      expectedTarget,
      expectedIsExternal,
    }) => {
      const result = resolveBaseServiceInstanceLink({ url, isLinkDisabled });

      expect(result).toMatchObject({
        href: expectedHref,
        target: expectedTarget,
        isExternal: expectedIsExternal,
      });
    }
  );
});

describe('addLocalePrefixToPath', () => {
  it.each`
    description                                       | href               | locale  | expectedHref
    ${'plain path gets en prefix'}                    | ${'/dashboard'}    | ${'en'} | ${'/en/dashboard'}
    ${'plain path gets ja prefix'}                    | ${'/dashboard'}    | ${'ja'} | ${'/ja/dashboard'}
    ${'plain path gets fr prefix'}                    | ${'/dashboard'}    | ${'fr'} | ${'/fr/dashboard'}
    ${'nested path gets locale prefix'}               | ${'/a/b/c'}        | ${'ja'} | ${'/ja/a/b/c'}
    ${'root path gets locale prefix'}                 | ${'/'}             | ${'en'} | ${'/en/'}
    ${'path without leading slash is normalized'}     | ${'dashboard'}     | ${'en'} | ${'/en/dashboard'}
    ${'exact /en path is not double-prefixed'}        | ${'/en'}           | ${'en'} | ${'/en'}
    ${'exact /ja path is not double-prefixed'}        | ${'/ja'}           | ${'ja'} | ${'/ja'}
    ${'/en/... path is not double-prefixed'}          | ${'/en/dashboard'} | ${'en'} | ${'/en/dashboard'}
    ${'/ja/... path is not double-prefixed'}          | ${'/ja/settings'}  | ${'ja'} | ${'/ja/settings'}
    ${'cross-locale /en path with ja locale is kept'} | ${'/en/page'}      | ${'ja'} | ${'/en/page'}
  `('$description', ({ href, locale, expectedHref }) => {
    expect(addLocalePrefixToPath({ href, locale })).toBe(expectedHref);
  });
});

describe('resolvePublicServiceInstanceLink', () => {
  it.each`
    description                               | url                           | isLinkDisabled | locale  | expectedHref                  | expectedTarget
    ${'internal path gets locale prefix'}     | ${'/dashboard'}               | ${false}       | ${'en'} | ${'/en/dashboard'}            | ${'_self'}
    ${'internal path gets ja locale prefix'}  | ${'/dashboard'}               | ${false}       | ${'ja'} | ${'/ja/dashboard'}            | ${'_self'}
    ${'already prefixed /en path is kept'}    | ${'/en/settings'}             | ${false}       | ${'en'} | ${'/en/settings'}             | ${'_self'}
    ${'already prefixed /ja path is kept'}    | ${'/ja/settings'}             | ${false}       | ${'ja'} | ${'/ja/settings'}             | ${'_self'}
    ${'external http URL is returned as-is'}  | ${'http://example.com'}       | ${false}       | ${'en'} | ${'http://example.com'}       | ${'_blank'}
    ${'external https URL is returned as-is'} | ${'https://example.com/path'} | ${false}       | ${'ja'} | ${'https://example.com/path'} | ${'_blank'}
    ${'disabled external URL returns #'}      | ${'https://example.com'}      | ${true}        | ${'en'} | ${'#'}                        | ${'_blank'}
    ${'disabled internal URL returns #'}      | ${'/dashboard'}               | ${true}        | ${'en'} | ${'#'}                        | ${'_self'}
  `(
    '$description',
    ({ url, isLinkDisabled, locale, expectedHref, expectedTarget }) => {
      const result = resolvePublicServiceInstanceLink({
        url,
        isLinkDisabled,
        locale,
      });

      expect(result).toMatchObject({
        href: expectedHref,
        target: expectedTarget,
      });
      expect(result).not.toHaveProperty('isExternal');
    }
  );
});

describe('resolvePrivateServiceInstanceLink', () => {
  it.each`
    description                                   | url                       | isLinkDisabled | expectedHref              | expectedTarget
    ${'internal path returns url as href'}        | ${'/admin/page'}          | ${false}       | ${'/admin/page'}          | ${'_self'}
    ${'isLinkDisabled unset returns url as href'} | ${'/admin/page'}          | ${undefined}   | ${'/admin/page'}          | ${'_self'}
    ${'external url returns url with _blank'}     | ${'https://external.com'} | ${false}       | ${'https://external.com'} | ${'_blank'}
    ${'disabled internal link returns #'}         | ${'/admin/page'}          | ${true}        | ${'#'}                    | ${'_self'}
    ${'disabled external link returns #'}         | ${'https://external.com'} | ${true}        | ${'#'}                    | ${'_blank'}
  `('$description', ({ url, isLinkDisabled, expectedHref, expectedTarget }) => {
    const result = resolvePrivateServiceInstanceLink({ url, isLinkDisabled });

    expect(result).toMatchObject({
      href: expectedHref,
      target: expectedTarget,
    });
    expect(result).not.toHaveProperty('isExternal');
  });
});
