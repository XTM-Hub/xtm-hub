import {
  RegistrationContext,
  RegistrationContextProvider,
} from '@/components/registration/Context';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useContext } from 'react';
import { describe, expect, it } from 'vitest';

// A registration step: it only shows the product the registration is about.
const RegistrationStep = () => {
  const { displayedIdentifier } = useContext(RegistrationContext);
  return <p>{`Connecting ${displayedIdentifier}`}</p>;
};

describe('RegistrationContextProvider', () => {
  it.each`
    identifier                    | expectedStep
    ${PlatformIdentifier.Opencti} | ${'Connecting OpenCTI'}
    ${PlatformIdentifier.Openaev} | ${'Connecting OpenAEV'}
  `(
    'should tell the registration steps which product they are about when given $identifier',
    ({
      identifier,
      expectedStep,
    }: {
      identifier: PlatformIdentifier;
      expectedStep: string;
    }) => {
      // Given / When
      testRender(
        <RegistrationContextProvider identifier={identifier}>
          <RegistrationStep />
        </RegistrationContextProvider>
      );

      // Then
      expect(screen.getByText(expectedStep)).toBeInTheDocument();
    }
  );

  it('should tell the registration steps no product is selected when no identifier is given', () => {
    // Given / When
    testRender(
      <RegistrationContextProvider>
        <RegistrationStep />
      </RegistrationContextProvider>
    );

    // Then
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });
});
