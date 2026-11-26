import { IntegrationType } from '@graphql/generated';
import { afterEach, describe, expect, it } from 'vitest';
import {
  allFiltersKey,
  buildAllFiltersSearchParams,
  DEPLOYABLE_PARAM,
  emptyFilters,
  INTEGRATION_TYPE_PARAM,
  LABEL_PARAM,
  parseAllFiltersFromWindowSearch,
  parseSelection,
  serializeSelection,
  VERIFIED_PARAM,
} from './integration-list-url-filters.utils';

describe('serializeSelection', () => {
  it.each`
    description                   | input                             | expected
    ${'empty'}                    | ${{}}                             | ${''}
    ${'key'}                      | ${{ csv_feed: [] }}               | ${'csv_feed'}
    ${'multiple keys are sorted'} | ${{ rss_feed: [], csv_feed: [] }} | ${'csv_feed,rss_feed'}
  `('$description', ({ input, expected }) => {
    expect(serializeSelection(input)).toBe(expected);
  });
});

describe('parseSelection (integrationType)', () => {
  it.each`
    description                  | raw                    | expected
    ${'null'}                    | ${null}                | ${{}}
    ${'single type'}             | ${'csv_feed'}          | ${{ [IntegrationType.CsvFeed]: [] }}
    ${'multiple types'}          | ${'csv_feed,rss_feed'} | ${{ [IntegrationType.CsvFeed]: [], [IntegrationType.RssFeed]: [] }}
    ${'invalid type is dropped'} | ${'not_a_type'}        | ${{}}
  `('$description', ({ raw, expected }) => {
    expect(parseSelection(raw, INTEGRATION_TYPE_PARAM)).toEqual(expected);
  });
});

describe('parseSelection (simple filter)', () => {
  it.each`
    description        | raw          | expected
    ${'null'}          | ${null}      | ${{}}
    ${'single key'}    | ${'id1'}     | ${{ id1: [] }}
    ${'multiple keys'} | ${'id1,id2'} | ${{ id1: [], id2: [] }}
    ${'empty entry'}   | ${',id1'}    | ${{ id1: [] }}
  `('$description', ({ raw, expected }) => {
    expect(parseSelection(raw, LABEL_PARAM)).toEqual(expected);
  });
});

describe('buildAllFiltersSearchParams', () => {
  it('returns empty string for empty filters', () => {
    expect(buildAllFiltersSearchParams(emptyFilters())).toBe('');
  });

  it('round-trips through parseSelection', () => {
    const filters = {
      ...emptyFilters(),
      [INTEGRATION_TYPE_PARAM]: {
        [IntegrationType.Connector]: [],
        [IntegrationType.CsvFeed]: [],
      },
      [LABEL_PARAM]: { id1: [], id2: [] },
    };
    const params = new URLSearchParams(buildAllFiltersSearchParams(filters));
    expect(
      parseSelection(params.get(INTEGRATION_TYPE_PARAM), INTEGRATION_TYPE_PARAM)
    ).toEqual(filters[INTEGRATION_TYPE_PARAM]);
    expect(parseSelection(params.get(LABEL_PARAM), LABEL_PARAM)).toEqual(
      filters[LABEL_PARAM]
    );
  });
});

describe('allFiltersKey', () => {
  it('is empty for empty filters', () => {
    expect(allFiltersKey(emptyFilters())).toBe('||||||||||||');
  });

  it('differs when any filter changes', () => {
    const base = allFiltersKey(emptyFilters());
    expect(
      allFiltersKey({ ...emptyFilters(), [LABEL_PARAM]: { id1: [] } })
    ).not.toBe(base);
    expect(
      allFiltersKey({
        ...emptyFilters(),
        [INTEGRATION_TYPE_PARAM]: { [IntegrationType.Connector]: [] },
      })
    ).not.toBe(base);
  });

  it('is stable regardless of key insertion order', () => {
    const a = { ...emptyFilters(), [LABEL_PARAM]: { b: [], a: [] } };
    const b = { ...emptyFilters(), [LABEL_PARAM]: { a: [], b: [] } };
    expect(allFiltersKey(a)).toBe(allFiltersKey(b));
  });
});

describe('parseAllFiltersFromWindowSearch', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('returns empty filters when no params are present', () => {
    expect(parseAllFiltersFromWindowSearch()).toEqual(emptyFilters());
  });

  it('parses a single integration type', () => {
    window.history.pushState({}, '', `?${INTEGRATION_TYPE_PARAM}=csv_feed`);
    const result = parseAllFiltersFromWindowSearch();
    expect(result[INTEGRATION_TYPE_PARAM]).toEqual({
      [IntegrationType.CsvFeed]: [],
    });
  });

  it('parses simple filters alongside integration filter', () => {
    window.history.pushState(
      {},
      '',
      `?${INTEGRATION_TYPE_PARAM}=csv_feed&${LABEL_PARAM}=id1,id2&${DEPLOYABLE_PARAM}=true&${VERIFIED_PARAM}=true`
    );
    const result = parseAllFiltersFromWindowSearch();
    expect(result[INTEGRATION_TYPE_PARAM]).toEqual({
      [IntegrationType.CsvFeed]: [],
    });
    expect(result[LABEL_PARAM]).toEqual({ id1: [], id2: [] });
    expect(result[DEPLOYABLE_PARAM]).toEqual({ true: [] });
    expect(result[VERIFIED_PARAM]).toEqual({ true: [] });
  });

  it('ignores unrelated query params', () => {
    window.history.pushState(
      {},
      '',
      `?${INTEGRATION_TYPE_PARAM}=csv_feed&someOtherParam=value`
    );
    const result = parseAllFiltersFromWindowSearch();
    expect(result[INTEGRATION_TYPE_PARAM]).toEqual({
      [IntegrationType.CsvFeed]: [],
    });
  });

  it('round-trips through buildAllFiltersSearchParams', () => {
    const original = {
      ...emptyFilters(),
      [INTEGRATION_TYPE_PARAM]: {
        [IntegrationType.Connector]: [],
      },
      [LABEL_PARAM]: { id1: [], id2: [] },
    };
    window.history.pushState(
      {},
      '',
      `?${buildAllFiltersSearchParams(original)}`
    );
    expect(parseAllFiltersFromWindowSearch()).toEqual(original);
  });
});
