import ServiceSlug from '@/components/service/[slug]/ServiceSlug';
import testRender from '@/utils/test/test-render';
import type {
  ServiceInstanceWithCapabilitiesItemFragment,
  SubscriptionItemFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/data-table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/data-table')>()),
  DataTable: ({ data }: { data: SubscriptionItemFragment[] }) => (
    <table>
      <tbody>
        {data.map((subscription) => (
          <tr key={subscription.id}>
            <td>{subscription.organization.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const DESCRIPTION_TITLE = 'Service.Management.Description';
const SERVICE_NAME = 'OpenCTI Library';
const CAPABILITY_NAME = 'upload';
const ORGANIZATION_NAME = 'Acme Corporation';

const SERVICE_INSTANCE: ServiceInstanceWithCapabilitiesItemFragment = {
  id: 'service-instance-1',
  name: SERVICE_NAME,
  description: null,
  tags: null,
  service_definition: {
    service_capability: [
      { id: 'capability-1', name: CAPABILITY_NAME, description: null },
    ],
  },
};

const SUBSCRIPTION: SubscriptionItemFragment = {
  id: 'subscription-1',
  organization: {
    id: 'organization-1',
    name: ORGANIZATION_NAME,
    personal_space: false,
  },
  service_instance: { id: SERVICE_INSTANCE.id, name: SERVICE_NAME },
  subscription_capability: [],
  start_date: null,
  end_date: null,
};

const renderServiceSlug = () =>
  testRender(
    <ServiceSlug
      subscriptions={[SUBSCRIPTION]}
      serviceInstance={SERVICE_INSTANCE}
    />
  );

const getDescriptionTitle = () =>
  screen.getByRole('heading', { level: 2, name: DESCRIPTION_TITLE });

describe('ServiceSlug', () => {
  it('should head the page with the loaded service instance', () => {
    // When
    renderServiceSlug();

    // Then
    expect(
      screen.getByRole('heading', { name: SERVICE_NAME })
    ).toBeInTheDocument();
  });

  it('should list the subscribed organizations of the service', () => {
    // When
    renderServiceSlug();

    // Then
    expect(screen.getByText(ORGANIZATION_NAME)).toBeInTheDocument();
  });

  it('should display the joined organizations title as a level 2 heading without a trailing colon', () => {
    // When
    renderServiceSlug();

    // Then
    expect(getDescriptionTitle()).toHaveTextContent(
      /^Service.Management.Description$/
    );
  });

  it('should render the organizations table on the design system Paper surface, with the title above it', () => {
    // When
    renderServiceSlug();

    // Then
    const title = getDescriptionTitle();
    const surface = screen.getByRole('table').closest('section');
    // The surface carries the design system radius and padding classes. These
    // pin the design system's class names on purpose, as jsdom does no layout:
    // a rename in the design system needs this test updated.
    expect(surface).toHaveClass('rounded-sm', 'p-4');
    expect(surface).not.toContainElement(title);
    expect(surface?.parentElement).toContainElement(title);
  });
});
