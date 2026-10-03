import { describe, expect, it } from 'vitest';
import { loggableVariables, REDACTED_VARIABLES } from './log';

const VARIABLES = { input: { day: '2026-10-03', hashes: ['00'.repeat(16)] } };

describe('loggableVariables', () => {
  it.each([
    {
      operation: 'pushPulse',
      query: 'mutation Push($input: PushPulseInput!) { pushPulse(input: $input) { accepted } }',
    },
    {
      operation: 'pulseLookup',
      query: 'query Lookup($input: PulseLookupInput!) { pulseLookup(input: $input) { hash } }',
    },
  ])(
    'should redact the variables of $operation requests',
    ({ query }) => {
      // When
      const variables = loggableVariables(query, VARIABLES);

      // Then
      expect(variables).toBe(REDACTED_VARIABLES);
    }
  );

  it.each([
    { operation: 'pulseStatus', query: 'query { pulseStatus { day } }' },
    { operation: 'no query', query: undefined },
  ])('should keep the variables of $operation', ({ query }) => {
    // When
    const variables = loggableVariables(query, VARIABLES);

    // Then
    expect(variables).toBe(VARIABLES);
  });
});
