import { EpicItemFooter } from '@/components/epic/epic-item/EpicItemFooter';
import testRender from '@/utils/test/test-render';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { EditionType, EpicType, FiligranProduct } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { describe, expect, it } from 'vitest';

describe('EpicItemFooter', () => {
  const epic = {
    id: 'epic-1',
    title: 'Roadmap epic',
    epic_type: EpicType.Other,
    edition_type: EditionType.CommunityEdition,
    product: [FiligranProduct.Opencti],
    document_id: null,
  } as epic_fragment$data;

  const defaultProps = {
    epic,
    serviceInstanceId: 'service-instance-1',
  };

  it('renders product information', () => {
    // Given
    const environment = createMockEnvironment();

    // When
    testRender(<EpicItemFooter {...defaultProps} />, {
      relayConfig: environment,
    });

    // Then
    expect(screen.getByText('OpenCTI')).toBeInTheDocument();
  });

  it('renders every product of the epic', () => {
    // Given
    const environment = createMockEnvironment();

    // When
    testRender(
      <EpicItemFooter
        {...defaultProps}
        epic={{
          ...epic,
          product: [FiligranProduct.Opencti, FiligranProduct.Openaev],
        }}
      />,
      {
        relayConfig: environment,
      }
    );

    // Then
    expect(screen.getByText('OpenCTI')).toBeInTheDocument();
    expect(screen.getByText('OpenAEV')).toBeInTheDocument();
  });

  it('renders the products in the expected order', () => {
    // Given
    const environment = createMockEnvironment();

    // When
    const { container } = testRender(
      <EpicItemFooter
        {...defaultProps}
        epic={{
          ...epic,
          product: [
            FiligranProduct.Xtmone,
            FiligranProduct.Openaev,
            FiligranProduct.Xtmhub,
          ],
        }}
      />,
      {
        relayConfig: environment,
      }
    );

    // Then
    expect(container.textContent).toContain('XTM HubOpenAEVXTM One');
  });

  it.each`
    editionType                      | expectedLabel
    ${EditionType.CommunityEdition}  | ${'__NO_LABEL__'}
    ${EditionType.EnterpriseEdition} | ${'EE'}
    ${EditionType.PartialEe}         | ${'Partial EE'}
  `(
    'renders edition tag according to edition type (editionType=$editionType)',
    ({ editionType, expectedLabel }) => {
      // Given
      const environment = createMockEnvironment();
      const resolvedExpectedLabel =
        expectedLabel === '__NO_LABEL__' ? null : expectedLabel;

      // When
      const { queryByText } = testRender(
        <EpicItemFooter
          {...defaultProps}
          epic={{ ...epic, edition_type: editionType }}
        />,
        {
          relayConfig: environment,
        }
      );

      // Then
      if (resolvedExpectedLabel) {
        expect(screen.getByText(resolvedExpectedLabel)).toBeInTheDocument();
        return;
      }

      expect(queryByText('CE')).not.toBeInTheDocument();
      expect(queryByText('EE')).not.toBeInTheDocument();
      expect(queryByText('Partial EE')).not.toBeInTheDocument();
    }
  );

  it.each([
    {
      epicType: EpicType.Integration,
      documentId: 'document-image-1',
      shouldRenderIntegration: true,
    },
    {
      epicType: EpicType.Integration,
      documentId: null,
      shouldRenderIntegration: false,
    },
    {
      epicType: EpicType.Other,
      documentId: 'document-image-1',
      shouldRenderIntegration: false,
    },
  ])(
    'renders integration block according to type and document id (epicType=$epicType, documentId=$documentId)',
    ({ epicType, documentId, shouldRenderIntegration }) => {
      // Given
      const environment = createMockEnvironment();

      // When
      const { queryByText } = testRender(
        <EpicItemFooter
          {...defaultProps}
          epic={{ ...epic, epic_type: epicType, document_id: documentId }}
        />,
        {
          relayConfig: environment,
        }
      );

      const integrationBadge = queryByText('integration');

      // Then
      if (shouldRenderIntegration) {
        expect(integrationBadge).toBeInTheDocument();
        expect(
          screen.getByRole('img', { name: 'Roadmap epic logo' })
        ).toHaveAttribute(
          'src',
          '/document/images/service-instance-1/document-image-1'
        );
        return;
      }

      expect(integrationBadge).toBeNull();
    }
  );
});
