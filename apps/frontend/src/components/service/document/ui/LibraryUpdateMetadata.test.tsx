import testRender from '@/utils/test/test-render';
import { Locale, PortalCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryUpdateMetadata } from './LibraryUpdateMetadata';

const commitMutationAsync = vi.fn();
let seoServiceInstanceMetadata: Array<{
  language: Locale;
  meta_title: string;
  meta_description: string;
}> = [];
let lastQueryVariables: Record<string, unknown> | null = null;

vi.mock('@graphql/generated', async (importOriginal) => {
  const generatedModule =
    await importOriginal<typeof import('@graphql/generated')>();
  const useServiceInstanceSeoMetadataByIdQuery = Object.assign(
    vi.fn((_client: unknown, variables: Record<string, unknown>) => {
      lastQueryVariables = variables;
      return { data: { seoServiceInstanceMetadata } };
    }),
    {
      getKey: vi.fn((variables: Record<string, unknown>) => [
        'ServiceInstanceSeoMetadataById',
        variables,
      ]),
    }
  );
  return {
    ...generatedModule,
    useServiceInstanceSeoMetadataByIdQuery,
    useEditSeoServiceInstanceMetadataMutation: vi.fn(() => ({
      mutateAsync: commitMutationAsync,
    })),
  };
});

vi.mock('@/components/service/components/ServiceContext', () => ({
  useServiceContext: () => ({
    serviceInstance: { id: 'service-instance-1' },
  }),
}));

const renderComponent = () =>
  testRender(<LibraryUpdateMetadata />, {
    me: {
      capabilities: [{ name: PortalCapability.ModifyServiceMetadata }],
    },
  });

describe('LibraryUpdateMetadata', () => {
  beforeEach(() => {
    seoServiceInstanceMetadata = [];
    lastQueryVariables = null;
    commitMutationAsync.mockReset();
  });

  it('loads metadata with service instance id and maps values by locale with defaults', async () => {
    seoServiceInstanceMetadata = [
      {
        language: Locale.En,
        meta_title: 'Title EN',
        meta_description: 'Description EN',
      },
      {
        language: Locale.Fr,
        meta_title: 'Title FR',
        meta_description: 'Description FR',
      },
      {
        language: 'unknown' as Locale,
        meta_title: 'Ignored title',
        meta_description: 'Ignored description',
      },
    ];

    const { user } = renderComponent();
    await user.click(screen.getByRole('button', { name: 'Utils.Edit' }));

    expect(lastQueryVariables).toEqual({
      service_instance_id: 'service-instance-1',
    });
    expect(screen.getByLabelText('Metadata.SeoMetaTitle (EN)')).toHaveValue(
      'Title EN'
    );
    expect(
      screen.getByLabelText('Metadata.SeoMetaDescription (EN)')
    ).toHaveValue('Description EN');
    expect(screen.getByLabelText('Metadata.SeoMetaTitle (FR)')).toHaveValue(
      'Title FR'
    );
    expect(
      screen.getByLabelText('Metadata.SeoMetaDescription (FR)')
    ).toHaveValue('Description FR');
    expect(screen.getByLabelText('Metadata.SeoMetaTitle (JA)')).toHaveValue('');
    expect(
      screen.getByLabelText('Metadata.SeoMetaDescription (JA)')
    ).toHaveValue('');
  });

  it('submits one mutation per locale, includes edited values and closes dialog on success', async () => {
    commitMutationAsync.mockResolvedValue({});

    const { user } = renderComponent();
    await user.click(screen.getByRole('button', { name: 'Utils.Edit' }));
    await user.type(
      screen.getByLabelText('Metadata.SeoMetaTitle (EN)'),
      'SEO EN'
    );
    await user.type(
      screen.getByLabelText('Metadata.SeoMetaDescription (FR)'),
      'SEO FR'
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    expect(commitMutationAsync).toHaveBeenCalledTimes(3);
    const callsByLanguage = new Map(
      commitMutationAsync.mock.calls.map(([variables]) => [
        (variables as { language: Locale }).language,
        variables,
      ])
    );
    expect(callsByLanguage.get(Locale.En)).toEqual(
      expect.objectContaining({
        service_instance_id: 'service-instance-1',
        language: Locale.En,
        input: { meta_title: 'SEO EN', meta_description: '' },
      })
    );
    expect(callsByLanguage.get(Locale.Fr)).toEqual(
      expect.objectContaining({
        service_instance_id: 'service-instance-1',
        language: Locale.Fr,
        input: { meta_title: '', meta_description: 'SEO FR' },
      })
    );
    expect(callsByLanguage.get(Locale.Ja)).toEqual(
      expect.objectContaining({
        service_instance_id: 'service-instance-1',
        language: Locale.Ja,
        input: { meta_title: '', meta_description: '' },
      })
    );
    expect(
      screen.queryByRole('button', { name: 'Utils.Validate' })
    ).not.toBeInTheDocument();
  });

  it('keeps dialog open when mutation fails with an Error', async () => {
    commitMutationAsync.mockRejectedValue(new Error('ACCESS_DENIED'));

    const { user } = renderComponent();
    await user.click(screen.getByRole('button', { name: 'Utils.Edit' }));
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    expect(
      screen.getByRole('button', { name: 'Utils.Validate' })
    ).toBeInTheDocument();
  });

  it('keeps dialog open when mutation fails with a non-Error', async () => {
    commitMutationAsync.mockRejectedValue('string-error');

    const { user } = renderComponent();
    await user.click(screen.getByRole('button', { name: 'Utils.Edit' }));
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    expect(
      screen.getByRole('button', { name: 'Utils.Validate' })
    ).toBeInTheDocument();
  });
});
