import { XtmPlatformTrialForm } from '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm';
import testRender from '@/utils/test/test-render';
import en from '@messages/en.json';
import fr from '@messages/fr.json';
import ja from '@messages/ja.json';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('next-intl');

const MSSA_URL = 'https://filigran.io/mssa';
const AI_TERMS_URL = 'https://filigran.io/ai-terms';

const renderTermsLabel = (locale: string, messages: typeof en) => {
  testRender(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}>
      <XtmPlatformTrialForm handleSubmit={vi.fn()} />
    </NextIntlClientProvider>
  );

  const label = document.querySelector('label[for="acceptTerms"]');
  if (!label) {
    throw new Error(`No acceptTerms label rendered for locale "${locale}"`);
  }
  return label;
};

describe('XtmPlatformTrialForm terms agreement', () => {
  it.each([
    ['en', en],
    ['fr', fr],
    ['ja', ja],
  ])('links to both agreements in %s', (locale, messages: typeof en) => {
    const label = renderTermsLabel(locale, messages);

    const hrefs = Array.from(label.querySelectorAll('a')).map((link) =>
      link.getAttribute('href')
    );

    expect(hrefs).toHaveLength(2);
    expect(hrefs).toContain(MSSA_URL);
    expect(hrefs).toContain(AI_TERMS_URL);
  });

  it('opens both agreements without leaking the opener', () => {
    const label = renderTermsLabel('en', en);

    const links = Array.from(label.querySelectorAll('a'));
    expect(links).not.toHaveLength(0);
    links.forEach((link) => {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });
});
