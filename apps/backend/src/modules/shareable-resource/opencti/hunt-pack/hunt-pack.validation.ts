import { parseAllDocuments } from 'yaml';
import { huntScheduleError } from './hunt-pack.schedule';

// Mirrors the checks the OpenCTI hunt import runs before creating a hunt, so
// a published pack is never refused by OpenCTI. Limits are the OpenCTI
// defaults: a platform may lower them, and its import then reports it.
const SIGMA_RULE_MAX_LENGTH = 65536;
const SIGMA_STATUSES = [
  'stable',
  'test',
  'experimental',
  'deprecated',
  'unsupported',
];
const SIGMA_LEVELS = ['informational', 'low', 'medium', 'high', 'critical'];
const CONDITION_KEYWORDS = new Set([
  'and',
  'or',
  'not',
  'of',
  'them',
  'all',
  'any',
]);
const HUNT_TYPES = ['telemetry', 'infrastructure'];
const HUNT_PLATFORMS = [
  'splunk',
  'microsoft-sentinel',
  'elastic-security',
  'crowdstrike-logscale',
  'google-secops',
  'opensearch',
  'clickhouse',
  's3-ocsf',
  'internet',
];
const NATIVE_QUERY_MAX_LENGTH = 65536;
const NATIVE_QUERY_LANGUAGE_MAX_LENGTH = 64;
const NATIVE_QUERY_PIPELINE_MAX_LENGTH = 256;
const HUNT_INTEGER_LIMITS: Record<string, number> = {
  time_window_hours: 720,
  escalation_threshold: 1000000,
  hunt_max_results: 10000,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPresent = (value: unknown) => value !== undefined && value !== null;

const asOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const conditionIdentifiers = (condition: string): string[] => {
  // Aggregation expressions (deprecated) follow a pipe and hold no identifier
  const [expression = ''] = condition.split('|');
  const tokens = expression
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
  const isQuantifier = (token: string, index: number) =>
    /^\d+$/.test(token) && tokens[index + 1]?.toLowerCase() === 'of';
  return tokens.filter(
    (token, index) =>
      !CONDITION_KEYWORDS.has(token.toLowerCase()) &&
      !isQuantifier(token, index)
  );
};

/**
 * Whether `value` matches `pattern`, where `*` stands for any run of characters.
 * Both come from the uploaded rule: the literal segments are searched once each,
 * left to right, so the work stays linear in their lengths whatever the input.
 */
export const wildcardMatches = (pattern: string, value: string): boolean => {
  const segments = pattern.split('*');
  const first = segments[0] ?? '';
  const last = segments[segments.length - 1] ?? '';
  if (segments.length === 1) {
    return pattern === value;
  }
  if (
    value.length < first.length + last.length ||
    !value.startsWith(first) ||
    !value.endsWith(last)
  ) {
    return false;
  }
  const end = value.length - last.length;
  let position = first.length;
  for (const segment of segments.slice(1, -1)) {
    const index = value.indexOf(segment, position);
    if (index === -1 || index + segment.length > end) {
      return false;
    }
    position = index + segment.length;
  }
  return true;
};

const identifierMatches = (identifier: string, searchIdentifiers: string[]) =>
  searchIdentifiers.some((search) => wildcardMatches(identifier, search));

const parseSigmaRule = (sigmaRule: string): unknown => {
  const documents = parseAllDocuments(sigmaRule, { uniqueKeys: true });
  const parsed = Array.isArray(documents) ? documents : [];
  const [document] = parsed;
  if (parsed.length !== 1 || !document) {
    throw new Error('it must hold exactly one YAML document');
  }
  const [firstError] = document.errors;
  if (firstError) {
    throw new Error(firstError.message);
  }
  // A Sigma rule never needs aliases, and they enable entity expansion attacks
  return document.toJS({ maxAliasCount: 0 });
};

const detectionErrors = (detection: unknown): string[] => {
  if (!isRecord(detection)) {
    return ['the Sigma rule must have a detection section'];
  }
  const { condition, ...searches } = detection;
  const searchIdentifiers = Object.keys(searches);
  const errors: string[] = [];
  if (searchIdentifiers.length === 0) {
    errors.push('the Sigma rule detection must define a search identifier');
  }
  searchIdentifiers.forEach((identifier) => {
    const search = searches[identifier];
    if (!isRecord(search) && !Array.isArray(search)) {
      errors.push(`the Sigma search ${identifier} must be a map or a list`);
    }
  });
  const conditions = Array.isArray(condition) ? condition : [condition];
  if (
    conditions.length === 0 ||
    conditions.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    errors.push('the Sigma rule detection must have a condition');
    return errors;
  }
  (conditions as string[]).forEach((item) => {
    conditionIdentifiers(item)
      .filter((identifier) => !identifierMatches(identifier, searchIdentifiers))
      .forEach((identifier) =>
        errors.push(
          `the Sigma condition references an unknown search: ${identifier}`
        )
      );
  });
  return errors;
};

export const sigmaRuleErrors = (sigmaRule: string): string[] => {
  if (sigmaRule.length > SIGMA_RULE_MAX_LENGTH) {
    return [`the Sigma rule exceeds ${SIGMA_RULE_MAX_LENGTH} characters`];
  }
  let rule: unknown;
  try {
    rule = parseSigmaRule(sigmaRule);
  } catch (error) {
    return [`the Sigma rule is not valid YAML: ${(error as Error).message}`];
  }
  if (!isRecord(rule)) {
    return ['the Sigma rule must be a YAML mapping'];
  }
  const errors: string[] = [];
  if (!asOptionalString(rule.title)) {
    errors.push('the Sigma rule must have a title');
  }
  if (
    rule.status !== undefined &&
    !SIGMA_STATUSES.includes(String(rule.status))
  ) {
    errors.push('the Sigma rule status is not a Sigma status');
  }
  const level = asOptionalString(rule.level);
  if (level && !SIGMA_LEVELS.includes(level)) {
    errors.push('the Sigma rule level is not a Sigma level');
  }
  if (!isRecord(rule.logsource)) {
    errors.push('the Sigma rule must have a logsource');
  } else if (
    !asOptionalString(rule.logsource.product) &&
    !asOptionalString(rule.logsource.category) &&
    !asOptionalString(rule.logsource.service)
  ) {
    errors.push(
      'the Sigma logsource must define a product, category or service'
    );
  }
  return [...errors, ...detectionErrors(rule.detection)];
};

const trimmedText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const parseNativeQuery = (item: unknown): unknown => {
  if (typeof item !== 'string') return item;
  try {
    return JSON.parse(item) as unknown;
  } catch {
    return undefined;
  }
};

const nativeQueryItems = (nativeQueries: unknown): unknown[] => {
  if (!isPresent(nativeQueries) || nativeQueries === '') {
    return [];
  }
  return Array.isArray(nativeQueries) ? nativeQueries : [nativeQueries];
};

/** The native queries of a hunt as OpenCTI reads them: one or many, objects or JSON text. */
export const parseNativeQueries = (nativeQueries: unknown): unknown[] =>
  nativeQueryItems(nativeQueries).map(parseNativeQuery);

const nativeQueryErrors = (nativeQueries: unknown): string[] => {
  const items = nativeQueryItems(nativeQueries);
  // One query per platform: a longer list is refused before any entry is parsed
  if (items.length > HUNT_PLATFORMS.length) {
    return [`a hunt has at most ${HUNT_PLATFORMS.length} native queries`];
  }
  const platforms = new Set<string>();
  const errors: string[] = [];
  items.map(parseNativeQuery).forEach((item, index) => {
    const label = `native query ${index + 1}`;
    if (!isRecord(item)) {
      errors.push(`${label} is not an object`);
      return;
    }
    const platform = trimmedText(item.platform);
    if (!HUNT_PLATFORMS.includes(platform)) {
      errors.push(`${label}: the platform is not a hunted platform of OpenCTI`);
      return;
    }
    if (platforms.has(platform)) {
      errors.push(`${label}: ${platform} already has a native query`);
    }
    platforms.add(platform);
    const language = trimmedText(item.language);
    if (!language || language.length > NATIVE_QUERY_LANGUAGE_MAX_LENGTH) {
      errors.push(`${label}: a language of at most 64 characters is required`);
    }
    const query = trimmedText(item.query);
    if (!query || query.length > NATIVE_QUERY_MAX_LENGTH) {
      errors.push(`${label}: a query of at most 65536 characters is required`);
    }
    if (trimmedText(item.pipeline).length > NATIVE_QUERY_PIPELINE_MAX_LENGTH) {
      errors.push(`${label}: the pipeline name exceeds 256 characters`);
    }
  });
  return errors;
};

/** Reasons the OpenCTI hunt import would refuse this hunt of a pack. */
export const huntImportErrors = (hunt: Record<string, unknown>): string[] => {
  const errors: string[] = [];
  if (!asOptionalString(hunt.name)) {
    errors.push('the hunt has no name');
  }
  if (
    isPresent(hunt.hunt_type) &&
    !HUNT_TYPES.includes(String(hunt.hunt_type))
  ) {
    errors.push('the hunt type is neither telemetry nor infrastructure');
  }
  if (isPresent(hunt.sigma_rule)) {
    if (typeof hunt.sigma_rule !== 'string') {
      errors.push('the Sigma rule is not a text');
    } else if (hunt.sigma_rule.trim().length > 0) {
      errors.push(...sigmaRuleErrors(hunt.sigma_rule));
    }
  }
  errors.push(...nativeQueryErrors(hunt.native_queries));
  if (isPresent(hunt.hunt_schedule)) {
    const scheduleError =
      typeof hunt.hunt_schedule === 'string'
        ? huntScheduleError(hunt.hunt_schedule)
        : 'the schedule is not a text';
    if (scheduleError) errors.push(scheduleError);
  }
  Object.entries(HUNT_INTEGER_LIMITS).forEach(([field, max]) => {
    const value = hunt[field];
    if (!isPresent(value)) return;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > max) {
      errors.push(`${field} must be an integer between 1 and ${max}`);
    }
  });
  return errors;
};
