import OpenctiHuntPackSlug from '@/components/service/opencti-hunt-packs/[slug]/OpenctiHuntPackSlug';
import testRender from '@/utils/test/test-render';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/service/opencti-hunt-packs/hunt-pack-documents', () => ({
  useHuntPackDocumentContext: () => ({}),
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

describe('OpenctiHuntPackSlug', () => {
  it('names the hunt pack in the breadcrumb', () => {
    testRender(
      <OpenctiHuntPackSlug
        documentData={
          {
            id: 'document-1',
            name: 'Credential access hunts',
          } as unknown as documentItem_fragment$data
        }
        serviceInstance={serviceInstance}
      />
    );

    expect(screen.getByTestId('hunt-pack-slug')).toHaveTextContent(
      'MenuLinks.Home/Hunt packs/Credential access hunts'
    );
  });
});
