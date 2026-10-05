import { XtmPlatformTrialForm } from '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialForm';
import testRender from '@/utils/test/test-render';
import en from '@messages/en.json';
import fr from '@messages/fr.json';
import ja from '@messages/ja.json';
import { screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('next-intl');

const MSSA_URL = 'https://filigran.io/mssa';
const AI_TERMS_URL = 'https://filigran.io/ai-terms';

const LOCALES: [string, typeof en][] = [
  ['en', en],
  ['fr', fr],
  ['ja', ja],
];

const renderForm = (locale: string, messages: typeof en) =>
  testRender(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}>
      <XtmPlatformTrialForm handleSubmit={vi.fn()} />
    </NextIntlClientProvider>
  );

const getTermsLabel = (locale: string) => {
  const label = document.querySelector('label[for="acceptTerms"]');
  if (!label) {
    throw new Error(`No acceptTerms label rendered for locale "${locale}"`);
  }
  return label;
};

describe('XtmPlatformTrialForm terms agreement', () => {
  it.each(LOCALES)('links to both agreements in %s', (locale, messages) => {
    renderForm(locale, messages);

    const hrefs = Array.from(getTermsLabel(locale).querySelectorAll('a')).map(
      (link) => link.getAttribute('href')
    );

    expect(hrefs).toHaveLength(2);
    expect(hrefs).toContain(MSSA_URL);
    expect(hrefs).toContain(AI_TERMS_URL);
  });

  it('opens both agreements without leaking the opener', () => {
    renderForm('en', en);

    const links = Array.from(getTermsLabel('en').querySelectorAll('a'));
    expect(links).not.toHaveLength(0);
    links.forEach((link) => {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  it.each(LOCALES)(
    'localizes the unchecked terms error in %s',
    async (locale, messages) => {
      const { user } = renderForm(locale, messages);
      const expectedError = messages.Service.Trials.Form.Error.AcceptTerms;

      await user.click(
        screen.getByRole('button', {
          name: messages.Service.Trials.XtmPlatform.Page.Form.Submit,
        })
      );

      expect(await screen.findByText(expectedError)).toBeInTheDocument();
    }
  );
});
