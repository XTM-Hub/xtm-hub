'use strict';

import { esDbClient } from '../thirdparty/elasticsearch/client.js';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix.js';
import { logApp } from '../utils/app-logger.util';

const useCaseMapping: Record<string, string> = {
  'Threat Profiling (CTI)': 'threat_profiling_cti',
  'Threat Profiling (FIMI)': 'threat_profiling_fimi',
  'Threat Profiling (Law enforcement)': 'threat_profiling_leo',
  'Threat Profiling (Fraud & AML)': 'threat_profiling_faml',
  'Threat Hunting': 'threat_hunting',
  'Strategic Reporting (For Executives)': 'strategic_reporting',
  'Strategic Reporting (for Analysts)': 'technical_reporting',
  'Coordinating Incident Response': 'incident_response',
  'Integrating Security Stack': 'security_stack',
  'Detection Engineering': 'detection_engineering',
  'Simulating Cyber Attacks': 'attack_simulation',
  'Simulating Crisis (Tabletop Exercises)': 'crisis_simulation',
  'Vulnerability Management': 'vulnerability_management',
  'Centralizing Knowledge': 'centralizing_knowledge',
  'Sharing knowledge': 'sharing_knowledge',
  'Hosting Threat Sharing Community': 'hosting_threat_community',
};

const activitySectorMapping: Record<string, string> = {
  'Computer & Network Security': 'computer_network_security',
  'Computer Games': 'computer_games',
  'Computer Software': 'computer_software',
  'Defense & Space': 'defense_space',
  Entertainment: 'entertainment',
  'Financial Services': 'financial_services',
  'Government Administration': 'government_administration',
  'Government Relations': 'government_relations',
  'Higher Education': 'higher_education',
  'Hospital & Health Care': 'hospital_health_care',
  Hospitality: 'hospitality',
  'Information Technology and Services': 'information_technology',
  Insurance: 'insurance',
  'Legal Services': 'legal_services',
  'Luxury Goods & Jewelry': 'luxury_goods_jewelry',
  'Management Consulting': 'management_consulting',
  'Marketing and Advertising': 'marketing_advertising',
  Military: 'military',
  'Non-Profit Organization Management': 'non_profit',
  'Oil & Energy': 'oil_energy',
  Pharmaceuticals: 'pharmaceuticals',
  Photography: 'photography',
  Retail: 'retail',
  'Security and Investigations': 'security_investigations',
  Semiconductors: 'semiconductors',
  Telecommunications: 'telecommunications',
  'Transportation/Trucking/Railroad': 'transportation',
  Utilities: 'utilities',
  Wireless: 'wireless',
};

const jobTitleMapping: Record<string, string> = {
  CEO: 'ceo',
  'CISO/CSO/CIO': 'ciso_cso_cio',
  'C-level': 'c_level',
  'General Manager/Vice President': 'general_manager_vp',
  'Director/Head of Cybersecurity': 'director_head_cybersecurity',
  'Cybersecurity Team Lead': 'cybersecurity_team_lead',
  'Application Security Specialist': 'application_security_specialist',
  'Cloud Security Specialit': 'cloud_security_specialist',
  'Cybersecurity Architect': 'cybersecurity_architect',
  'Cybersecurity Engineer': 'cybersecurity_engineer',
  'Digital Forensics and Incident Response Specialist': 'dfir_specialist',
  'Governance, Risk, and Compliance Specialist': 'grc_specialist',
  'Identity and Access Management Specialist': 'iam_specialist',
  'Penetration Tester': 'penetration_tester',
  'Security Operations Center (SOC) Analyst': 'soc_analyst',
  'Threat Intelligence Analyst': 'threat_intelligence_analyst',
  'Vulnerability Analyst': 'vulnerability_analyst',
  Consultant: 'consultant',
  Other: 'other',
};

const invertMapping = (
  mapping: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(Object.entries(mapping).map(([from, to]) => [to, from]));

async function applyMapping(
  field: string,
  mapping: Record<string, string>,
  fieldType: 'keyword' | 'text' = 'keyword'
): Promise<void> {
  for (const [from, to] of Object.entries(mapping)) {
    try {
      await esDbClient.updateByQuery({
        index: withIndexPrefix('telemetry_v1'),
        refresh: true,
        conflicts: 'proceed',
        script: {
          source: `ctx._source.${field} = params.to`,
          params: { to },
        },
        query:
          fieldType === 'text'
            ? { match_phrase: { [field]: from } }
            : { term: { [field]: from } },
      });
    } catch (error) {
      logApp.error(`Error updating ${field} from '${from}' to '${to}'`, {
        error,
      });
    }
  }
}

export const up = async function (next: () => void) {
  await applyMapping('use_case', useCaseMapping);
  await applyMapping('activity_sector', activitySectorMapping);
  await applyMapping('job_title', jobTitleMapping, 'text');
  next();
};

export const down = async function (next: () => void) {
  await applyMapping('use_case', invertMapping(useCaseMapping));
  await applyMapping('activity_sector', invertMapping(activitySectorMapping));
  await applyMapping('job_title', invertMapping(jobTitleMapping), 'text');
  next();
};
