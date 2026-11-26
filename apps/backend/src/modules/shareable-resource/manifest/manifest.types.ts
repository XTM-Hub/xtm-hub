import { LicenseType } from '../../../__generated__/resolvers-types';

export interface ManifestContract {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  logo: string | null;
  use_cases: string[];
  verified: boolean;
  last_verified_date: string | null;
  subscription_link: string | null;
  source_code: string | null;
  manager_supported: boolean;
  min_version: string | null;
  license_type: LicenseType | null;
  contact: string | null;
  solution_categories: string[];
  version: string;
  image_name: string;
  image_type: string;
  additional_properties: Record<string, unknown>;
  config_schema: Record<string, unknown>;
}

export interface ManifestOutput {
  id: string;
  name: string;
  description: string;
  manifest_schema_version: string;
  manifest_version: string;
  product_version: string;
  contracts: ManifestContract[];
}
