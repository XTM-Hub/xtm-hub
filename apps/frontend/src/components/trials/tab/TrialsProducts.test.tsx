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
    expect(badgeOf('OPENCTI')).toHaveClass('text-feedback-success-primary');
    expect(badgeOf('OPENAEV')).toHaveClass('text-feedback-alert-primary');
    expect(badgeOf('XTMONE')).toHaveClass('text-feedback-neutral-primary');
  });

  it('should fall back to a dash when the bundle holds no product', () => {
    // When
    testRender(<TrialsProducts products={[]} />);

    // Then
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
