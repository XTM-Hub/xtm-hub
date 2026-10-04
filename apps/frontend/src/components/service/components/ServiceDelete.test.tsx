import { ServiceDelete } from '@/components/service/components/ServiceDelete';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { IntegrationType } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { describe, expect, it, vi } from 'vitest';

describe('ServiceDelete', () => {
  it.each`
    userCanDelete | shouldRender
    ${true}       | ${true}
    ${false}      | ${false}
    ${undefined}  | ${false}
  `(
    'renders delete trigger according to userCanDelete=$userCanDelete',
    ({ userCanDelete, shouldRender }) => {
      // Given
      const environment = createMockEnvironment();

      const { queryByRole } = testRender(
        <ServiceDelete
          userCanDelete={userCanDelete}
          serviceName={'My service'}
          integrationType={IntegrationType.CsvFeed}
        />,
        { relayConfig: environment }
      );

      // Then
      const deleteButton = queryByRole('button', { name: 'Utils.Delete' });

      if (shouldRender) {
        expect(deleteButton).toHaveTextContent('Utils.Delete');
        return;
      }

      expect(deleteButton).toBeNull();
    }
  );

  it.each`
    shareableResourceType                             | expectedTextKey
    ${IntegrationType.CsvFeed}                        | ${'Service.CsvFeed.SureDeleteService'}
    ${IntegrationType.Connector}                      | ${'Service.Connector.SureDeleteService'}
    ${IntegrationType.TaxiiFeed}                      | ${'Service.TaxiiFeed.SureDeleteService'}
    ${IntegrationType.RssFeed}                        | ${'Service.RssFeed.SureDeleteService'}
    ${IntegrationType.Stream}                         | ${'Service.Stream.SureDeleteService'}
    ${IntegrationType.ThirdPartyIntegration}          | ${'Service.ThirdPartyIntegration.SureDeleteService'}
    ${ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD} | ${'Service.OpenctiCustomDashboards.SureDeleteService'}
    ${ShareableResourceType.OPENAEV_SCENARIO}         | ${'Service.OpenAEVScenario.SureDeleteService'}
    ${ShareableResourceType.OPENCTI_HUNT_PACK}        | ${'Service.OpenCTIHuntPack.SureDeleteService'}
  `(
    'maps deletion texts for shareableResourceType=shareableResourceType',
    async ({ shareableResourceType, expectedTextKey }) => {
      // Given
      const environment = createMockEnvironment();
      const serviceName = 'another service name';
      const { user } = testRender(
        <ServiceDelete
          userCanDelete={true}
          serviceName={serviceName}
          integrationType={shareableResourceType}
        />,
        { relayConfig: environment }
      );

      // When
      await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

      // Then
      expect(await screen.findByText(expectedTextKey)).toBeInTheDocument();
    }
  );

  it('calls onDelete when confirming deletion', async () => {
    // Given
    const environment = createMockEnvironment();
    const onDelete = vi.fn();
    const { user } = testRender(
      <ServiceDelete
        userCanDelete={true}
        serviceName={'Connector A'}
        integrationType={IntegrationType.Connector}
        onDelete={onDelete}
      />,
      { relayConfig: environment }
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    const alertDialog = await screen.findByRole('alertdialog');
    await user.click(
      within(alertDialog).getByRole('button', { name: 'Utils.Delete' })
    );

    // Then
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith();
  });
});
