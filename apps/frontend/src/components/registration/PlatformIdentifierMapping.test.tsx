import {
  PlatformMetadataMapping,
  translateServiceDefinitionIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PlatformMetadataMapping', () => {
  it('renders the XTM One icon for the xtmone placeholder entry', () => {
    const { Icon } = PlatformMetadataMapping[PlatformIdentifier.Xtmone];
    const { container } = render(<Icon className="size-6" />);

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveClass('size-6');
  });
});

describe('translateServiceDefinitionIdentifier', () => {
  it.each([
    [ServiceDefinitionIdentifier.OpenctiRegistration, 'OpenCTI'],
    [ServiceDefinitionIdentifier.OpenaevRegistration, 'OpenAEV'],
    [ServiceDefinitionIdentifier.XtmoneRegistration, 'XTM One'],
  ])(
    'should return the platform label when the identifier %s is mapped',
    (identifier, expectedLabel) => {
      // Given a service definition identifier mapped to a platform

      // When translating it
      const label = translateServiceDefinitionIdentifier(identifier);

      // Then the platform's own label is returned
      expect(label).toBe(expectedLabel);
    }
  );

  it('should not label the service as OpenAEV when the identifier is not mapped', () => {
    // Given a service definition identifier that has no platform mapping
    const unmappedIdentifier = ServiceDefinitionIdentifier.XtmPlatformRoadmap;

    // When translating it
    const label = translateServiceDefinitionIdentifier(unmappedIdentifier);

    // Then it is displayed as its raw identifier and never as OpenAEV
    expect(label).not.toBe('OpenAEV');
    expect(label).toBe(unmappedIdentifier);
  });
});
