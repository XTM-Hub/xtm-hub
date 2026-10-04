import { parseAllDocuments } from 'yaml';

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
const HUNT_SCHEDULE_KEYWORDS = ['manual', 'standing'];
const CRON_MACROS = [
  '@yearly',
  '@annually',
  '@monthly',
  '@weekly',
  '@daily',
  '@midnight',
  '@hourly',
];
const CRON_FIELD =
  /^(?:\*|[0-9a-z]+(?:-[0-9a-z]+)?)(?:\/\d+)?(?:,(?:\*|[0-9a-z]+(?:-[0-9a-z]+)?)(?:\/\d+)?)*$/i;
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

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const identifierMatches = (identifier: string, searchIdentifiers: string[]) => {
  if (!identifier.includes('*')) {
    return searchIdentifiers.includes(identifier);
  }
  const pattern = new RegExp(
    `^${identifier.split('*').map(escapeRegExp).join('.*')}$`
  );
  return searchIdentifiers.some((search) => pattern.test(search));
};

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
  if (isPresent(rule.status) && !SIGMA_STATUSES.includes(String(rule.status))) {
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

const isValidSchedule = (schedule: string) => {
  const value = schedule.trim().toLowerCase();
  if (HUNT_SCHEDULE_KEYWORDS.includes(value) || CRON_MACROS.includes(value)) {
    return true;
  }
  const fields = value.split(/\s+/);
  return fields.length === 5 && fields.every((field) => CRON_FIELD.test(field));
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
  if (
    isPresent(hunt.hunt_schedule) &&
    (typeof hunt.hunt_schedule !== 'string' ||
      !isValidSchedule(hunt.hunt_schedule))
  ) {
    errors.push('the schedule is not manual, standing or a cron expression');
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
