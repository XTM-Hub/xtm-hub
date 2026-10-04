import { describe, expect, it } from 'vitest';
import { huntImportErrors, sigmaRuleErrors } from './hunt-pack.validation';

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

  it('refuses a rule longer than OpenCTI accepts', () => {
    expect(sigmaRuleErrors(`title: ${'x'.repeat(65536)}`)).toEqual([
      'the Sigma rule exceeds 65536 characters',
    ]);
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
