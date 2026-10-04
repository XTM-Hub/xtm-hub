import OpenctiHuntPackSlug from '@/components/service/opencti-hunt-packs/[slug]/OpenctiHuntPackSlug';
import testRender from '@/utils/test/test-render';
import { documentQuery } from '@generated/documentQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { screen } from '@testing-library/react';
import { PreloadedQuery, readInlineData } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  usePreloadedQuery: vi.fn(() => ({ document: null })),
  readInlineData: vi.fn(),
}));

vi.mock('@/components/service/document/use-document-context', () => ({
  useDocumentContext: () => ({}),
}));

vi.mock('@/components/service/document/ShareableResourceSlug', () => ({
  default: ({ breadcrumbValue }: { breadcrumbValue: { label: string }[] }) => (
    <div data-testid="hunt-pack-slug">
      {breadcrumbValue.map(({ label }) => label).join('/')}
    </div>
  ),
}));

vi.mock('@/components/service/document/DeleteShareableResourceSlug', () => ({
  default: () => null,
}));

vi.mock('@/components/service/components/ServiceManageSheet', () => ({
  ServiceManageSheet: () => null,
}));

const serviceInstance = {
  id: 'service-1',
  name: 'Hunt packs',
  service_definition: { identifier: 'opencti_hunt_packs' },
} as unknown as serviceInstance_fragment$data;

const renderSlug = () =>
  testRender(
    <OpenctiHuntPackSlug
      queryRef={{} as PreloadedQuery<documentQuery>}
      serviceInstance={serviceInstance}
    />
  );

describe('OpenctiHuntPackSlug', () => {
  beforeEach(() => {
    vi.mocked(readInlineData).mockReset();
  });

  it('shows the not-found message when the document is null', () => {
    vi.mocked(readInlineData).mockReturnValue(null);

    renderSlug();

    expect(screen.getByText('Utils.DocumentNotFound')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-pack-slug')).not.toBeInTheDocument();
  });

  it('names the hunt pack in the breadcrumb of an accessible document', () => {
    vi.mocked(readInlineData).mockReturnValue({
      id: 'document-1',
      name: 'Credential access hunts',
    });

    renderSlug();

    expect(screen.getByTestId('hunt-pack-slug')).toHaveTextContent(
      'MenuLinks.Home/Hunt packs/Credential access hunts'
    );
  });
});
