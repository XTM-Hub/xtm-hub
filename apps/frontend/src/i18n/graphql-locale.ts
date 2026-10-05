import { Locale } from '@/i18n/config';
import { Locale as GraphqlLocale } from '@graphql/generated';

const GRAPHQL_LOCALE_BY_LOCALE = {
  en: GraphqlLocale.En,
  fr: GraphqlLocale.Fr,
  ja: GraphqlLocale.Ja,
} satisfies Record<Locale, GraphqlLocale>;

const LOCALE_BY_GRAPHQL_LOCALE = {
  [GraphqlLocale.En]: 'en',
  [GraphqlLocale.Fr]: 'fr',
  [GraphqlLocale.Ja]: 'ja',
} satisfies Record<GraphqlLocale, Locale>;

export const isLocale = (value: string): value is Locale =>
  Object.hasOwn(GRAPHQL_LOCALE_BY_LOCALE, value);

export const toGraphqlLocale = (locale: Locale): GraphqlLocale =>
  GRAPHQL_LOCALE_BY_LOCALE[locale];

export const fromGraphqlLocale = (locale: GraphqlLocale): Locale =>
  LOCALE_BY_GRAPHQL_LOCALE[locale];
