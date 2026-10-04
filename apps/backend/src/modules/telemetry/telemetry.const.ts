export enum TelemetrySource {
  XTMHUB = 'xtm-hub',
  DEMO_OPENCTI = 'demo-opencti',
  DEMO_OPENAEV = 'demo-openaev',
}

export enum TelemetryEventService {
  CUSTOM_DASHBOARDS_LIBRARY = 'custom-dashboards-library',
  OPENAEV_SCENARIOS_LIBRARY = 'openaev-scenarios-library',
  INTEGRATIONS_LIBRARY = 'integrations-library',
  OPENCTI_PLAYBOOKS_LIBRARY = 'opencti-playbooks-library',
  OPENCTI_CUSTOM_VIEWS_LIBRARY = 'opencti-custom-views-library',
  OPENCTI_HUNT_PACKS_LIBRARY = 'opencti-hunt-packs-library',
}

export enum TelemetryEventServiceType {
  CSV_FEEDS = 'csv-feeds',
  CONNECTORS = 'connectors',
  TAXII_FEEDS = 'taxii-feeds',
  RSS_FEEDS = 'rss-feeds',
  STREAMS = 'streams',
  THIRD_PARTY_INTEGRATIONS = 'third-party-integrations',
}

export enum TelemetryTargetProduct {
  OPEN_CTI = 'open-cti',
  OPEN_AEV = 'open-aev',
  XTM_ONE = 'xtmone',
}

export enum TelemetryOrganizationType {
  PERSONAL = 'Personal',
  PROFESSIONAL = 'Professional',
  PUBLIC = 'Public',
}
