import portalConfig from '../../config';

export const buildPrefixedName = (prefix: string, name: string): string =>
  prefix === '' ? name : `${prefix}_${name}`;

// Every name the hub creates in Elasticsearch (index, alias, template, pattern)
// goes through this, so instances sharing a cluster keep their data apart
export const withIndexPrefix = (name: string): string =>
  buildPrefixedName(portalConfig.elasticsearch.index_prefix, name);
