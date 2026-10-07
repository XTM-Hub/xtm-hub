import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  IntegrationCoverageObjectTypesQuery,
  useIntegrationCoverageObjectTypesQuery,
} from '@graphql/generated';
import en from '@messages/en.json';
import fr from '@messages/fr.json';
import ja from '@messages/ja.json';
import { renderHook } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readableObjectType,
  useCoverageObjectTypes,
} from './UseCoverageObjectTypes';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useIntegrationCoverageObjectTypesQuery: vi.fn(),
}));

// The English messages, so the labels are the ones shown to users
const lookup = (key: string) =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      en
    );
const englishTranslations = Object.assign(
  (key: string) => String(lookup(key) ?? key),
  { has: (key: string) => typeof lookup(key) === 'string' }
) as unknown as ReturnType<typeof useTranslations>;

const mockObjectTypesQueryResult = (
  data: IntegrationCoverageObjectTypesQuery | undefined
) => {
  vi.mocked(useIntegrationCoverageObjectTypesQuery).mockReturnValue({
    data,
  } as ReturnType<typeof useIntegrationCoverageObjectTypesQuery>);
};

describe('useCoverageObjectTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTranslations).mockReturnValue(englishTranslations);
  });

  it('should query the object types accepted by the backend', () => {
    mockObjectTypesQueryResult(undefined);

    const { result } = renderHook(() => useCoverageObjectTypes());

    expect({
      calledWith: vi.mocked(useIntegrationCoverageObjectTypesQuery).mock
        .calls[0],
      options: result.current,
    }).toEqual({ calledWith: [portalGraphqlClient], options: [] });
  });

  it('should label every type, keep its key as value and sort by label', () => {
    mockObjectTypesQueryResult({
      integrationCoverageObjectTypes: [
        'IPv4-Addr',
        'Attack-Pattern',
        'Url',
        'Some-New-Type',
        'Threat-Actor-Group',
      ],
    });

    const { result } = renderHook(() => useCoverageObjectTypes());

    expect(result.current).toEqual([
      { id: 'Attack-Pattern', name: 'Attack pattern' },
      { id: 'IPv4-Addr', name: 'IPv4 address' },
      { id: 'Some-New-Type', name: 'Some new type' },
      { id: 'Threat-Actor-Group', name: 'Threat actor group' },
      { id: 'Url', name: 'URL' },
    ]);
  });
});

describe('object type labels', () => {
  it('should read an unknown type as words', () => {
    expect(readableObjectType('Some-New-Type')).toBe('Some new type');
    expect(readableObjectType('IPv4-Addr')).toBe('IPv4 addr');
  });

  it('should label the same object types in every language', () => {
    const keys = (messages: typeof en) =>
      Object.keys(messages.Service.OpenctiIntegrations.ObjectType).sort();

    expect(keys(fr as typeof en)).toEqual(keys(en));
    expect(keys(ja as typeof en)).toEqual(keys(en));
  });
});
