import ServiceSlug from '@/components/service/[slug]/ServiceSlug';
import { ServiceInstanceByIdQuery } from '@/components/service/service.graphql';
import testRender from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import { loadQuery } from 'react-relay';
import { MockPayloadGenerator, createMockEnvironment } from 'relay-test-utils';
import { describe, expect, it } from 'vitest';

const DESCRIPTION_TITLE = 'Service.Management.Description';
const SERVICE_NAME = 'OpenAEV Scenarios Library';
const SERVICE_INSTANCE_ID = 'service-instance-1';

const renderServiceSlug = () => {
  const environment = createMockEnvironment();
  const queryRef = loadQuery(environment, ServiceInstanceByIdQuery, {
    service_instance_id: SERVICE_INSTANCE_ID,
  });
  const rendered = testRender(
    <ServiceSlug
      subscriptions={[]}
      queryRefServiceInstance={queryRef}
    />,
    { relayConfig: environment }
  );
  act(() => {
    environment.mock.resolveMostRecentOperation((operation) =>
      MockPayloadGenerator.generate(operation, {
        ServiceInstance: () => ({
          id: SERVICE_INSTANCE_ID,
          name: SERVICE_NAME,
          description: 'A service description',
          tags: [],
          service_definition: { service_capability: [] },
        }),
      })
    );
  });

  return rendered;
};

const findDescriptionTitle = () =>
  screen.findByRole('heading', { level: 2, name: DESCRIPTION_TITLE });

describe('ServiceSlug', () => {
  it('should display the joined organizations title as a level 2 heading without a trailing colon', async () => {
    // Given / When
    renderServiceSlug();

    // Then
    expect(await findDescriptionTitle()).toHaveTextContent(
      /^Service.Management.Description$/
    );
  });

  it('should render the organizations table on the design system Paper surface, with the title above it', async () => {
    // Given / When
    renderServiceSlug();

    // Then
    const title = await findDescriptionTitle();
    const surface = screen.getByRole('table').closest('section');
    // The surface carries the design system radius and padding classes. These
    // pin the design system's class names on purpose, as jsdom does no layout:
    // a rename in the design system needs this test updated.
    expect(surface).toHaveClass('rounded-sm', 'p-4');
    expect(surface).not.toContainElement(title);
    expect(surface?.parentElement).toContainElement(title);
  });
});
