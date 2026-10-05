import { describe, expect, it } from 'vitest';
import {
  huntImportErrors,
  sigmaRuleErrors,
  wildcardMatches,
} from './hunt-pack.validation';

const VALID_SIGMA_RULE = [
  'title: Encoded PowerShell',
  'status: test',
  'level: high',
  'logsource:',
  '  product: windows',
  '  category: process_creation',
  'detection:',
  '  selection_image:',
  '    Image|endswith: \\powershell.exe',
  '  selection_flag:',
  '    CommandLine|contains: " -enc "',
  '  filter:',
  '    User: SYSTEM',
  '  condition: all of selection_* and not filter',
].join('\n');

describe('sigmaRuleErrors', () => {
  it('accepts a complete Sigma rule', () => {
    expect(sigmaRuleErrors(VALID_SIGMA_RULE)).toEqual([]);
  });

  it.each`
    case                                 | rule                                                                                       | error
    ${'two YAML documents'}              | ${`${VALID_SIGMA_RULE}\n---\ntitle: Second`}                                               | ${'exactly one YAML document'}
    ${'invalid YAML'}                    | ${'title: [unclosed'}                                                                      | ${'not valid YAML'}
    ${'an alias'}                        | ${'title: &t Alias\nlogsource: {product: windows}\ndetection: {s: {a: *t}, condition: s}'} | ${'not valid YAML'}
    ${'a list'}                          | ${'- title: List'}                                                                         | ${'YAML mapping'}
    ${'no title'}                        | ${'logsource: {product: windows}\ndetection: {s: {a: b}, condition: s}'}                   | ${'must have a title'}
    ${'a duplicated key'}                | ${`${VALID_SIGMA_RULE}\nstatus: stable`}                                                   | ${'not valid YAML'}
    ${'an unknown status'}               | ${VALID_SIGMA_RULE.replace('status: test', 'status: final')}                               | ${'not a Sigma status'}
    ${'a null status'}                   | ${VALID_SIGMA_RULE.replace('status: test', 'status: null')}                                | ${'not a Sigma status'}
    ${'an unknown level'}                | ${VALID_SIGMA_RULE.replace('level: high', 'level: severe')}                                | ${'not a Sigma level'}
    ${'no logsource'}                    | ${'title: T\ndetection: {s: {a: b}, condition: s}'}                                        | ${'must have a logsource'}
    ${'an empty logsource'}              | ${'title: T\nlogsource: {definition: x}\ndetection: {s: {a: b}, condition: s}'}            | ${'product, category or service'}
    ${'no detection'}                    | ${'title: T\nlogsource: {product: windows}'}                                               | ${'detection section'}
    ${'no search identifier'}            | ${'title: T\nlogsource: {product: windows}\ndetection: {condition: s}'}                    | ${'search identifier'}
    ${'no condition'}                    | ${'title: T\nlogsource: {product: windows}\ndetection: {s: {a: b}}'}                       | ${'must have a condition'}
    ${'an unknown condition identifier'} | ${'title: T\nlogsource: {product: windows}\ndetection: {s: {a: b}, condition: s and t}'}   | ${'unknown search: t'}
  `('refuses a rule with $case', ({ rule, error }) => {
    expect(sigmaRuleErrors(rule).join('; ')).toContain(error);
  });

  const ruleWithCondition = (condition: string) =>
    [
      'title: Condition',
      'logsource: {product: windows}',
      'detection:',
      '  selection_image: {Image: x}',
      '  selection_flag: {CommandLine: y}',
      '  filter: {User: SYSTEM}',
      `  condition: '${condition}'`,
    ].join('\n');

  it.each`
    condition
    ${'selection_image'}
    ${'selection_image and not filter'}
    ${'(selection_image or selection_flag) and not filter'}
    ${'1 of selection_* and not filter'}
    ${'any of selection_*'}
    ${'ALL OF them'}
    ${'not (selection_image and (selection_flag or filter))'}
    ${'selection_image | count() > 5'}
  `('accepts the condition $condition', ({ condition }) => {
    expect(sigmaRuleErrors(ruleWithCondition(condition))).toEqual([]);
  });

  it.each`
    condition                         | error
    ${'all of'}                       | ${'"all of" must be followed by a search identifier pattern or "them"'}
    ${'1 of and filter'}              | ${'"1 of" must be followed'}
    ${'selection_image and'}          | ${'it ends where a search identifier is expected'}
    ${'and selection_image'}          | ${'"and" is where a search identifier is expected'}
    ${'selection_image filter'}       | ${'"filter" must follow "and" or "or"'}
    ${'not'}                          | ${'it ends where a search identifier is expected'}
    ${'(selection_image or filter'}   | ${'a parenthesis is not closed'}
    ${'selection_image)'}             | ${'a closing parenthesis has no opening one'}
    ${'selection_image ()'}           | ${'"(" must follow "and" or "or"'}
    ${'them'}                         | ${'"them" is where a search identifier is expected'}
    ${'selection_image or or filter'} | ${'"or" is where a search identifier is expected'}
  `(
    'refuses the condition $condition, which no hunt connector translates',
    ({ condition, error }) => {
      const errors = sigmaRuleErrors(ruleWithCondition(condition)).join('; ');
      expect(errors).toContain('the Sigma condition is not a valid expression');
      expect(errors).toContain(error);
    }
  );

  it('checks a deeply nested condition without recursion', () => {
    const depth = 20000;
    const condition = `${'('.repeat(depth)}selection_image${')'.repeat(depth)}`;

    expect(sigmaRuleErrors(ruleWithCondition(condition))).toEqual([]);
    expect(
      sigmaRuleErrors(ruleWithCondition(`${condition})`)).join('; ')
    ).toContain('a closing parenthesis has no opening one');
  });

  it('refuses a rule longer than OpenCTI accepts', () => {
    expect(sigmaRuleErrors(`title: ${'x'.repeat(65536)}`)).toEqual([
      'the Sigma rule exceeds 65536 characters',
    ]);
  });

  it('checks a condition crafted to backtrack in linear time', () => {
    // A wildcard identifier of 20000 `a*` segments against a search identifier of
    // 1000 `a` and a `b`, within the length OpenCTI accepts
    const rule = [
      'title: Backtracking',
      'logsource: {product: windows}',
      'detection:',
      `  ${'a'.repeat(1000)}b: {Image: x}`,
      `  condition: ${'a*'.repeat(20000)}b`,
    ].join('\n');
    const start = performance.now();

    const errors = sigmaRuleErrors(rule);

    expect(performance.now() - start).toBeLessThan(2000);
    expect(errors.join('; ')).toContain('unknown search');
  });
});

describe('wildcardMatches', () => {
  it.each`
    pattern          | value                | expected
    ${'selection_*'} | ${'selection_image'} | ${true}
    ${'selection_*'} | ${'filter'}          | ${false}
    ${'*_image'}     | ${'selection_image'} | ${true}
    ${'sel*ion'}     | ${'selection'}       | ${true}
    ${'a*b*c'}       | ${'abc'}             | ${true}
    ${'a*b*c'}       | ${'acb'}             | ${false}
    ${'a**b'}        | ${'ab'}              | ${true}
    ${'ab*ba'}       | ${'aba'}             | ${false}
    ${'*'}           | ${''}                | ${true}
    ${'a.c'}         | ${'abc'}             | ${false}
    ${'.*'}          | ${'ab'}              | ${false}
    ${'filter'}      | ${'filter'}          | ${true}
    ${'filter'}      | ${'filter_2'}        | ${false}
  `(
    'reads $pattern against $value as $expected',
    ({
      pattern,
      value,
      expected,
    }: {
      pattern: string;
      value: string;
      expected: boolean;
    }) => {
      expect(wildcardMatches(pattern, value)).toBe(expected);
    }
  );

  it('refuses a worst-case non-matching value in linear time', () => {
    const start = performance.now();

    const matches = wildcardMatches(
      `${'a*'.repeat(10000)}b`,
      `${'a'.repeat(5000)}b`
    );

    expect(matches).toBe(false);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

describe('huntImportErrors', () => {
  const validHunt = {
    type: 'hunt',
    id: 'hunt--1',
    name: 'Encoded PowerShell',
    hunt_type: 'telemetry',
    sigma_rule: VALID_SIGMA_RULE,
    hunt_schedule: '*/30 * * * MON-FRI',
    time_window_hours: 24,
    escalation_threshold: 10,
    hunt_max_results: 500,
  };

  it('accepts a hunt the OpenCTI import accepts', () => {
    expect(huntImportErrors(validHunt)).toEqual([]);
  });

  it.each`
    schedule
    ${'manual'}
    ${'standing'}
    ${'@daily'}
    ${'0 6 1-15 JAN,JUL *'}
    ${'0 0 ? * MON'}
  `('accepts the schedule $schedule', ({ schedule }) => {
    expect(huntImportErrors({ ...validHunt, hunt_schedule: schedule })).toEqual(
      []
    );
  });

  it('accepts a hunt without Sigma rule nor optional field', () => {
    expect(huntImportErrors({ name: 'Native query only' })).toEqual([]);
  });

  it('accepts native queries in the shape OpenCTI imports', () => {
    expect(
      huntImportErrors({
        ...validHunt,
        native_queries: [
          { platform: 'splunk', language: 'spl', query: 'index=main' },
          JSON.stringify({
            platform: 'microsoft-sentinel',
            language: 'kql',
            query: 'SecurityEvent',
            pipeline: 'windows',
          }),
        ],
      })
    ).toEqual([]);
  });

  it.each`
    case                             | nativeQueries                                                                                                 | error
    ${'a missing language'}          | ${[{ platform: 'splunk', query: 'index=main' }]}                                                              | ${'a language'}
    ${'a missing query'}             | ${[{ platform: 'splunk', language: 'spl' }]}                                                                  | ${'a query'}
    ${'an oversized query'}          | ${[{ platform: 'splunk', language: 'spl', query: 'x'.repeat(65537) }]}                                        | ${'a query'}
    ${'an oversized language'}       | ${[{ platform: 'splunk', language: 'x'.repeat(65), query: 'index=main' }]}                                    | ${'a language'}
    ${'an oversized pipeline'}       | ${[{ platform: 'splunk', language: 'spl', query: 'index=main', pipeline: 'x'.repeat(257) }]}                  | ${'pipeline'}
    ${'an unsupported platform'}     | ${[{ platform: 'Splunk', language: 'spl', query: 'index=main' }]}                                             | ${'not a hunted platform'}
    ${'a duplicated platform'}       | ${[{ platform: 'splunk', language: 'spl', query: 'a' }, { platform: 'splunk', language: 'spl', query: 'b' }]} | ${'already has a native query'}
    ${'an item that is no query'}    | ${['not json']}                                                                                               | ${'not an object'}
    ${'more queries than platforms'} | ${Array.from({ length: 10 }, () => 'not parsed')}                                                             | ${'at most 9 native queries'}
  `('refuses native queries with $case', ({ nativeQueries, error }) => {
    expect(
      huntImportErrors({ ...validHunt, native_queries: nativeQueries }).join(
        '; '
      )
    ).toContain(error);
  });

  it.each`
    case                         | change                                 | error
    ${'no name'}                 | ${{ name: '  ' }}                      | ${'no name'}
    ${'an unknown hunt type'}    | ${{ hunt_type: 'endpoint' }}           | ${'neither telemetry nor infrastructure'}
    ${'a Sigma rule not a text'} | ${{ sigma_rule: { title: 'T' } }}      | ${'not a text'}
    ${'an invalid Sigma rule'}   | ${{ sigma_rule: 'title: T' }}          | ${'must have a logsource'}
    ${'an invalid schedule'}     | ${{ hunt_schedule: '99 99 99 99 99' }} | ${'out of range'}
    ${'a zero time window'}      | ${{ time_window_hours: 0 }}            | ${'time_window_hours'}
    ${'a decimal threshold'}     | ${{ escalation_threshold: 1.5 }}       | ${'escalation_threshold'}
    ${'too many results'}        | ${{ hunt_max_results: 10001 }}         | ${'hunt_max_results'}
  `('refuses a hunt with $case', ({ change, error }) => {
    expect(huntImportErrors({ ...validHunt, ...change }).join('; ')).toContain(
      error
    );
  });
});
