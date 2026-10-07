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
    products: [FiligranProduct.Opencti],
  } as epic_fragment$data;

  const defaultProps = {
    epic,
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
          products: [FiligranProduct.Opencti, FiligranProduct.Openaev],
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
          products: [
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

  it.each`
    epicType                | shouldRenderIntegration
    ${EpicType.Integration} | ${true}
    ${EpicType.Other}       | ${false}
  `(
    'should render the integration badge only when the epic type is integration (epicType=$epicType)',
    ({ epicType, shouldRenderIntegration }) => {
      // Given
      const environment = createMockEnvironment();

      // When
      const { queryByText, container } = testRender(
        <EpicItemFooter
          {...defaultProps}
          epic={{ ...epic, epic_type: epicType }}
        />,
        {
          relayConfig: environment,
        }
      );

      // Then
      if (shouldRenderIntegration) {
        expect(queryByText('integration')).toBeInTheDocument();
      } else {
        expect(queryByText('integration')).not.toBeInTheDocument();
      }
      expect(container.querySelector('img')).toBeNull();
    }
  );
});
