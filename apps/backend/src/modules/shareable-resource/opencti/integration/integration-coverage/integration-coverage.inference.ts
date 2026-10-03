import {
  CoverageFamily,
  CoverageInferenceSource,
  IntegrationCoverage,
} from './integration-coverage.model';

export type CoverageKeywordRule = {
  pattern: RegExp;
  values: readonly string[];
};

/** OpenCTI entity types, in their canonical OpenCTI spelling. */
export const KNOWN_OBJECT_TYPES: readonly string[] = [
  'Administrative-Area',
  'Artifact',
  'Attack-Pattern',
  'Autonomous-System',
  'Bank-Account',
  'Campaign',
  'Case-Incident',
  'Case-Rfi',
  'Case-Rft',
  'Channel',
  'City',
  'Country',
  'Course-Of-Action',
  'Credential',
  'Cryptocurrency-Wallet',
  'Cryptographic-Key',
  'Data-Component',
  'Data-Source',
  'Directory',
  'Domain-Name',
  'Email-Addr',
  'Email-Message',
  'Event',
  'Grouping',
  'Hostname',
  'Incident',
  'Indicator',
  'Individual',
  'Infrastructure',
  'Intrusion-Set',
  'IPv4-Addr',
  'IPv6-Addr',
  'Mac-Addr',
  'Malware',
  'Malware-Analysis',
  'Mutex',
  'Narrative',
  'Network-Traffic',
  'Note',
  'Observed-Data',
  'Opinion',
  'Organization',
  'Payment-Card',
  'Phone-Number',
  'Position',
  'Process',
  'Region',
  'Report',
  'Sector',
  'Software',
  'StixFile',
  'System',
  'Text',
  'Threat-Actor',
  'Threat-Actor-Group',
  'Threat-Actor-Individual',
  'Tool',
  'Url',
  'User-Account',
  'User-Agent',
  'Vulnerability',
  'Windows-Registry-Key',
  'X509-Certificate',
];

/** Common spellings that differ from the OpenCTI entity type beyond case and separators. */
export const OBJECT_TYPE_ALIASES: Readonly<Record<string, string>> = {
  file: 'StixFile',
  'stix-file': 'StixFile',
};

// Patterns never carry the `g` flag: RegExp#test would then keep state between calls.
export const OBJECT_TYPE_KEYWORD_RULES: readonly CoverageKeywordRule[] = [
  { pattern: /vulnerabilit/i, values: ['Vulnerability'] },
  { pattern: /\b(CVEs?|CVSS|KEV)\b/i, values: ['Vulnerability'] },
  { pattern: /\bIOCs?\b/i, values: ['Indicator'] },
  { pattern: /\bindicators?\b/i, values: ['Indicator'] },
  { pattern: /\b(YARA|Snort|Suricata)\b/i, values: ['Indicator'] },
  { pattern: /\bSigma\b/, values: ['Indicator'] },
  { pattern: /\b(block|deny|black) ?lists?\b/i, values: ['Indicator'] },
  { pattern: /malware/i, values: ['Malware'] },
  {
    pattern: /\b(trojans?|botnets?|(info)?stealers?|backdoors?)\b/i,
    values: ['Malware'],
  },
  { pattern: /\bRATs?\b/, values: ['Malware'] },
  { pattern: /ransomware/i, values: ['Malware', 'Intrusion-Set'] },
  {
    pattern: /\b(sandbox(es|ing)?|malware analysis|detonation)\b/i,
    values: ['Malware-Analysis'],
  },
  { pattern: /\bphish/i, values: ['Url', 'Domain-Name', 'Email-Addr'] },
  { pattern: /ATT&CK/i, values: ['Attack-Pattern'] },
  { pattern: /\b(TTPs?|CAPEC)\b/i, values: ['Attack-Pattern'] },
  { pattern: /\battack patterns?\b/i, values: ['Attack-Pattern'] },
  { pattern: /\breports?\b/i, values: ['Report'] },
  {
    pattern:
      /\b(advisor(y|ies)|bulletins?|whitepapers?|blogs?|articles?|RSS)\b/i,
    values: ['Report'],
  },
  { pattern: /\bIPs?\b/, values: ['IPv4-Addr'] },
  { pattern: /\b(ip address(es)?|IPv4|CIDRs?)\b/i, values: ['IPv4-Addr'] },
  { pattern: /\bIPv6\b/i, values: ['IPv6-Addr'] },
  {
    pattern: /\b(domains?|domain names?|DNS|FQDNs?)\b/i,
    values: ['Domain-Name'],
  },
  { pattern: /\bhostnames?\b/i, values: ['Hostname'] },
  { pattern: /\bURLs?\b/i, values: ['Url'] },
  {
    pattern: /\b(hash(es)?|MD5|SHA-?(1|256|512)|ssdeep|imphash)\b/i,
    values: ['StixFile'],
  },
  { pattern: /\be-?mail addresses?\b/i, values: ['Email-Addr'] },
  { pattern: /\b(e-?mail messages?|spam)\b/i, values: ['Email-Message'] },
  {
    pattern: /\b(threat actors?|threat groups?)\b/i,
    values: ['Threat-Actor-Group', 'Intrusion-Set'],
  },
  {
    pattern: /\b(intrusion sets?|adversar(y|ies))\b/i,
    values: ['Intrusion-Set'],
  },
  { pattern: /\bAPTs?\b/, values: ['Intrusion-Set'] },
  { pattern: /\bcampaigns?\b/i, values: ['Campaign'] },
  { pattern: /\bincidents?\b/i, values: ['Incident'] },
  {
    pattern: /\b(courses? of action|mitigations?)\b/i,
    values: ['Course-Of-Action'],
  },
  { pattern: /\bASNs?\b/, values: ['Autonomous-System'] },
  { pattern: /\bautonomous systems?\b/i, values: ['Autonomous-System'] },
  {
    pattern: /\b(X\.?509|(SSL|TLS) certificates?)\b/i,
    values: ['X509-Certificate'],
  },
  {
    pattern: /\b(crypto ?currenc(y|ies)|bitcoin|wallets?)\b/i,
    values: ['Cryptocurrency-Wallet'],
  },
  { pattern: /\bcredentials?\b/i, values: ['Credential', 'User-Account'] },
  { pattern: /\buser accounts?\b/i, values: ['User-Account'] },
  {
    pattern: /\b(C2|C&C|command and control)\b/i,
    values: ['Infrastructure'],
  },
  { pattern: /\bCPEs?\b/, values: ['Software'] },
  {
    pattern: /\b(disinformation|misinformation|narratives?)\b/i,
    values: ['Narrative'],
  },
  {
    pattern: /\b(telegram|social media) channels?\b/i,
    values: ['Channel'],
  },
];

export const SECTOR_KEYWORD_RULES: readonly CoverageKeywordRule[] = [
  {
    pattern: /\b(financ(e|ial)|banks?|banking|fintech|insurance)\b/i,
    values: ['Finance'],
  },
  {
    pattern: /\b(energy|oil (and|&) gas|power grids?|nuclear)\b/i,
    values: ['Energy'],
  },
  {
    pattern: /\b(health ?care|hospitals?|medical|pharma(ceutical)?s?)\b/i,
    values: ['Healthcare'],
  },
  {
    pattern:
      /\b(governments?|governmental|public sector|public administrations?)\b/i,
    values: ['Government'],
  },
  {
    pattern:
      /\b(military|defen[cs]e (sector|industry|industrial base|contractors?))\b/i,
    values: ['Defense'],
  },
  {
    pattern: /\b(telecom(munication)?s?|telcos?)\b/i,
    values: ['Telecommunications'],
  },
  {
    pattern: /\b(education(al)?|universit(y|ies)|academi(a|c))\b/i,
    values: ['Education'],
  },
  { pattern: /\b(retail|e-?commerce)\b/i, values: ['Retail'] },
  { pattern: /\bmanufactur(ing|ers?)\b/i, values: ['Manufacturing'] },
  {
    pattern: /\b(SCADA|industrial control|operational technology)\b/i,
    values: ['Industrial'],
  },
  { pattern: /\bICS\b/, values: ['Industrial'] },
  {
    pattern: /\b(transport(ation)?|logistics|aviation|maritime)\b/i,
    values: ['Transportation'],
  },
];

export const REGION_KEYWORD_RULES: readonly CoverageKeywordRule[] = [
  { pattern: /\bworld ?wide\b/i, values: ['Global'] },
  {
    pattern:
      /\bglobal (coverage|visibility|telemetry|sensors?|sensor network)\b/i,
    values: ['Global'],
  },
  { pattern: /\b(Europe|European|ENISA)\b/i, values: ['Europe'] },
  { pattern: /\bEU\b/, values: ['Europe'] },
  { pattern: /\bNorth America(n)?\b/i, values: ['North America'] },
  {
    pattern: /\b(Latin America(n)?|South America(n)?)\b/i,
    values: ['Latin America'],
  },
  { pattern: /\bLATAM\b/, values: ['Latin America'] },
  { pattern: /\b(Asia(n)?|Asia[- ]Pacific)\b/i, values: ['Asia'] },
  { pattern: /\bAPAC\b/, values: ['Asia'] },
  { pattern: /\bMiddle East(ern)?\b/i, values: ['Middle East'] },
  { pattern: /\bMENA\b/, values: ['Middle East'] },
  { pattern: /\bAfrica(n)?\b/i, values: ['Africa'] },
  { pattern: /\bOceania\b/i, values: ['Oceania'] },
  { pattern: /\b(France|CERT-FR|ANSSI)\b/i, values: ['France'] },
  { pattern: /\b(Germany|CERT-Bund)\b/i, values: ['Germany'] },
  { pattern: /\b(United States|US-CERT|CISA)\b/i, values: ['United States'] },
  { pattern: /\bUSA\b/, values: ['United States'] },
  { pattern: /\bUnited Kingdom\b/i, values: ['United Kingdom'] },
  { pattern: /\bUK\b/, values: ['United Kingdom'] },
  { pattern: /\b(Japan|JPCERT)\b/i, values: ['Japan'] },
  { pattern: /\b(Canada|Canadian)\b/i, values: ['Canada'] },
  { pattern: /\b(Australia(n)?|ACSC)\b/i, values: ['Australia'] },
  { pattern: /\b(Spain|INCIBE|CCN-CERT)\b/i, values: ['Spain'] },
  { pattern: /\b(Italy|CERT-AGID)\b/i, values: ['Italy'] },
  { pattern: /\b(Netherlands|Dutch)\b/i, values: ['Netherlands'] },
  { pattern: /\bBelgium\b/i, values: ['Belgium'] },
  { pattern: /\b(Switzerland|Swiss)\b/i, values: ['Switzerland'] },
  { pattern: /\bLuxembourg\b/i, values: ['Luxembourg'] },
  { pattern: /\b(India|CERT-In)\b/i, values: ['India'] },
  { pattern: /\bSingapore\b/i, values: ['Singapore'] },
  { pattern: /\bBrazil(ian)?\b/i, values: ['Brazil'] },
];

export const COVERAGE_KEYWORD_RULES: Readonly<
  Record<CoverageFamily, readonly CoverageKeywordRule[]>
> = {
  object_types: OBJECT_TYPE_KEYWORD_RULES,
  sectors: SECTOR_KEYWORD_RULES,
  regions: REGION_KEYWORD_RULES,
};

// URLs often embed words such as "report" or "blog" that say nothing about the coverage.
const URL_PATTERN = /\bhttps?:\/\/\S+/gi;

export const buildCoverageInferenceText = (
  source: CoverageInferenceSource
): string =>
  [
    source.name,
    source.short_description,
    source.description,
    ...(source.use_cases ?? []),
    ...(source.solution_categories ?? []),
  ]
    .filter((part): part is string => typeof part === 'string' && part !== '')
    .join('\n')
    .replace(URL_PATTERN, ' ');

const applyKeywordRules = (
  text: string,
  rules: readonly CoverageKeywordRule[]
): string[] => {
  const values = new Set<string>();
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      rule.values.forEach((value) => values.add(value));
    }
  }
  return [...values];
};

/**
 * Deterministic keyword-based coverage inference. Values come out in rule
 * order, deduplicated, already in their canonical spelling.
 */
export const inferIntegrationCoverage = (
  source: CoverageInferenceSource
): IntegrationCoverage => {
  const text = buildCoverageInferenceText(source);
  return {
    object_types: applyKeywordRules(text, OBJECT_TYPE_KEYWORD_RULES),
    sectors: applyKeywordRules(text, SECTOR_KEYWORD_RULES),
    regions: applyKeywordRules(text, REGION_KEYWORD_RULES),
  };
};
