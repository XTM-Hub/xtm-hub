import { TrialsProducts } from '@/components/trials/tab/TrialsProducts';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestHubStatus,
  PlatformIdentifier,
  TrialsProductFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const makeProduct = (
  platformIdentifier: PlatformIdentifier,
  hubStatus: DeploymentRequestHubStatus
): TrialsProductFragment => ({
  id: `product-${platformIdentifier}`,
  platform_identifier: platformIdentifier,
  hub_status: hubStatus,
  platform_id: null,
  platform_url: null,
  url: null,
});

const badgeOf = (product: string) =>
  screen.getByText(product).parentElement as HTMLElement;

describe('TrialsProducts', () => {
  it('should colour each product badge according to its status', () => {
    // Given
    const products = [
      makeProduct(
        PlatformIdentifier.Opencti,
        DeploymentRequestHubStatus.Active
      ),
      makeProduct(
        PlatformIdentifier.Openaev,
        DeploymentRequestHubStatus.Provisioning
      ),
      makeProduct(
        PlatformIdentifier.Xtmone,
        DeploymentRequestHubStatus.Cancelled
      ),
    ];

    // When
    testRender(<TrialsProducts products={products} />);

    // Then
    expect(badgeOf('OPENCTI')).toHaveClass(
      'bg-feedback-success-secondary-transparency-30'
    );
    expect(badgeOf('OPENAEV')).toHaveClass(
      'bg-feedback-alert-secondary-transparency-30'
    );
    expect(badgeOf('XTMONE')).toHaveClass(
      'bg-feedback-neutral-secondary-transparency-30'
    );
  });

  it('should render the product chips as non-interactive labels, not buttons', () => {
    // Given
    const products = [
      makeProduct(
        PlatformIdentifier.Opencti,
        DeploymentRequestHubStatus.Active
      ),
    ];

    // When
    testRender(<TrialsProducts products={products} />);

    // Then
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('should fall back to a dash when the bundle holds no product', () => {
    // When
    testRender(<TrialsProducts products={[]} />);

    // Then
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
