import { describe, expect, it } from 'vitest';
import { hashPassword } from '../../utils/hash-password.util';
import { isValidMarketingToken, isValidSystemToken } from './hashed-token';

const MARKETING_TOKEN = 'a-marketing-token';
const CONFIGURED = hashPassword(MARKETING_TOKEN);
const NOT_CONFIGURED = { hash: '', salt: '' };

describe('isValidMarketingToken', () => {
  it.each`
    description                                 | token              | configuration     | expected
    ${'the configured token'}                   | ${MARKETING_TOKEN} | ${CONFIGURED}     | ${true}
    ${'another token'}                          | ${'another-token'} | ${CONFIGURED}     | ${false}
    ${'no token'}                               | ${undefined}       | ${CONFIGURED}     | ${false}
    ${'an empty token'}                         | ${''}              | ${CONFIGURED}     | ${false}
    ${'an empty token when none is configured'} | ${''}              | ${NOT_CONFIGURED} | ${false}
    ${'any token when none is configured'}      | ${MARKETING_TOKEN} | ${NOT_CONFIGURED} | ${false}
    ${'the repository system token'}            | ${'changeMe'}      | ${NOT_CONFIGURED} | ${false}
  `(
    'should return $expected for $description',
    ({
      token,
      configuration,
      expected,
    }: {
      token: string | undefined;
      configuration: { hash: string; salt: string };
      expected: boolean;
    }) => {
      // When
      const result = isValidMarketingToken(token, configuration);

      // Then
      expect(result).toBe(expected);
    }
  );

  it('should accept the system token with the default configuration', () => {
    // When — config/default.json gives the marketing token the system token hash and salt
    const result = isValidMarketingToken('changeMe');

    // Then
    expect(result).toBe(true);
  });
});

describe('isValidSystemToken', () => {
  it.each`
    description                            | token        | configuration   | expected
    ${'the configured token'}              | ${'a-token'} | ${'configured'} | ${true}
    ${'another token'}                     | ${'another'} | ${'configured'} | ${false}
    ${'no token'}                          | ${undefined} | ${'configured'} | ${false}
    ${'any token when none is configured'} | ${'a-token'} | ${'empty'}      | ${false}
  `(
    'should return $expected for $description',
    ({
      token,
      configuration,
      expected,
    }: {
      token: string | undefined;
      configuration: 'configured' | 'empty';
      expected: boolean;
    }) => {
      // Given
      const tokenConfig =
        configuration === 'configured'
          ? hashPassword('a-token')
          : NOT_CONFIGURED;

      // When
      const result = isValidSystemToken(token, tokenConfig);

      // Then
      expect(result).toBe(expected);
    }
  );

  it('should accept the repository system token with the default configuration', () => {
    // When — config/default.json holds the hash and salt of the dev value
    const result = isValidSystemToken('changeMe');

    // Then
    expect(result).toBe(true);
  });
});
