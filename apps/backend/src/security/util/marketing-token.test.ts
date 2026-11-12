import { describe, expect, it } from 'vitest';
import { hashPassword } from '../../utils/hash-password.util';
import { isValidMarketingToken } from './marketing-token';

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
