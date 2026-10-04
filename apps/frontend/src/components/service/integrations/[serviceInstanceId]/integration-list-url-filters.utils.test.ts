import { IntegrationType } from '@graphql/generated';
import { afterEach, describe, expect, it } from 'vitest';
import {
  allFiltersKey,
  buildAllFiltersSearchParams,
  DEPLOYABLE_PARAM,
  emptyFilters,
  INTEGRATION_TYPE_PARAM,
  LABEL_PARAM,
  OBJECT_TYPE_PARAM,
  parseAllFiltersFromWindowSearch,
  parseSelection,
  REGION_PARAM,
  SECTOR_PARAM,
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

describe('coverage filters (free text)', () => {
  it('round-trips values holding commas and colons', () => {
    const filters = {
      ...emptyFilters(),
      [SECTOR_PARAM]: { 'Retail, consumer goods': [], Finance: [] },
      [REGION_PARAM]: { 'Europe: Western': [] },
      [OBJECT_TYPE_PARAM]: { Malware: [] },
    };
    const params = new URLSearchParams(buildAllFiltersSearchParams(filters));
    expect(params.get(SECTOR_PARAM)).toBe(
      '["Finance","Retail, consumer goods"]'
    );
    expect(parseSelection(params.get(SECTOR_PARAM), SECTOR_PARAM)).toEqual(
      filters[SECTOR_PARAM]
    );
    expect(parseSelection(params.get(REGION_PARAM), REGION_PARAM)).toEqual(
      filters[REGION_PARAM]
    );
    expect(
      parseSelection(params.get(OBJECT_TYPE_PARAM), OBJECT_TYPE_PARAM)
    ).toEqual(filters[OBJECT_TYPE_PARAM]);
  });

  it.each`
    description                                 | raw                                             | expected
    ${'comma-separated links of earlier pages'} | ${'Finance,Energy'}                             | ${{ Finance: [], Energy: [] }}
    ${'malformed JSON read as a legacy list'}   | ${'[Finance'}                                   | ${{ '[Finance': [] }}
    ${'blank JSON values dropped'}              | ${'["Finance"," "]'}                            | ${{ Finance: [] }}
    ${'a colon kept in a legacy list value'}    | ${'Europe: Western,Asia'}                       | ${{ 'Europe: Western': [], Asia: [] }}
    ${'case and spacing duplicates once'}       | ${'["Finance","finance"," FINANCE ","Energy"]'} | ${{ Finance: [], Energy: [] }}
    ${'legacy list duplicates once'}            | ${'Finance,finance,Retail  goods,retail goods'} | ${{ Finance: [], 'Retail  goods': [] }}
  `('parses $description', ({ raw, expected }) => {
    expect(parseSelection(raw, SECTOR_PARAM)).toEqual(expected);
  });

  it('keeps a colon in every free-text coverage param of a legacy link', () => {
    expect(parseSelection('Europe: Western', REGION_PARAM)).toEqual({
      'Europe: Western': [],
    });
    expect(parseSelection('Threat-Actor:Group', OBJECT_TYPE_PARAM)).toEqual({
      'Threat-Actor:Group': [],
    });
  });

  it('keeps the compact format for the other params', () => {
    expect(serializeSelection({ id2: [], id1: [] }, LABEL_PARAM)).toBe(
      'id1,id2'
    );
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
    expect(allFiltersKey(emptyFilters())).toBe('||||||||||||||||||');
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
