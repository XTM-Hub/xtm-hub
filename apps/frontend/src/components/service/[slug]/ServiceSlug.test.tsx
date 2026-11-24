import ServiceSlug from '@/components/service/[slug]/ServiceSlug';
import testRender from '@/utils/test/test-render';
import { serviceInstanceByIdQuery } from '@generated/serviceInstanceByIdQuery.graphql';
import { screen } from '@testing-library/react';
import { PreloadedQuery } from 'react-relay';
import { describe, expect, it, vi } from 'vitest';

const DESCRIPTION_TITLE = 'Service.Management.Description';
const SERVICE_NAME = 'OpenAEV Scenarios Library';

const SERVICE_INSTANCE = {
  id: 'service-instance-1',
  name: SERVICE_NAME,
  description: 'A service description',
  tags: [],
  service_definition: { service_capability: [] },
};

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  usePreloadedQuery: () => ({ serviceInstanceById: SERVICE_INSTANCE }),
  readInlineData: (_fragment: unknown, data: unknown) => data,
}));

const renderServiceSlug = () =>
  testRender(
    <ServiceSlug
      subscriptions={[]}
      queryRefServiceInstance={
        {} as unknown as PreloadedQuery<serviceInstanceByIdQuery>
      }
    />
  );

const getDescriptionTitle = () =>
  screen.getByRole('heading', { level: 2, name: DESCRIPTION_TITLE });

describe('ServiceSlug', () => {
  it('should display the joined organizations title as a level 2 heading without a trailing colon', () => {
    // Given / When
    renderServiceSlug();

    // Then
    expect(getDescriptionTitle()).toHaveTextContent(
      /^Service.Management.Description$/
    );
  });

  it('should render the organizations table on the design system Paper surface, with the title above it', () => {
    // Given / When
    renderServiceSlug();

    // Then
    const surface = screen.getByRole('table').closest('section');
    // The surface carries the design system radius and padding classes. These
    // pin the design system's class names on purpose, as jsdom does no layout:
    // a rename in the design system needs this test updated.
    expect(surface).toHaveClass('rounded-sm', 'p-4');
    expect(surface).not.toContainElement(getDescriptionTitle());
    expect(surface?.parentElement).toContainElement(getDescriptionTitle());
  });
});
