import { describe, expect, it } from 'vitest';
import {
  FilterKey,
  LogicalOperator,
} from '../../../../__generated__/resolvers-types';
import {
  buildIntegrationsCsv,
  buildIntegrationsExportFilename,
  DEFAULT_INTEGRATION_CSV_COLUMNS,
  escapeCsvCell,
  IntegrationCsvColumnKey,
  IntegrationCsvExportRow,
  parseRequestedColumns,
  parseRequestedFilters,
} from './integration-csv-export.util';

const baseRow: IntegrationCsvExportRow = {
  id: 'doc-1',
  name: 'Sentinel Connector',
  integration_type: 'connector',
  manager_supported: true,
  verified: true,
  license_type: 'Open Source',
  use_cases: [{ name: 'Threat Detection' }, { name: 'Incident Response' }],
  solution_categories: [{ name: 'Detection' }],
};

describe('escapeCsvCell', () => {
  it.each`
    value               | expected              | description
    ${'simple'}         | ${'simple'}           | ${'plain value unchanged'}
    ${'a,b'}            | ${'"a,b"'}            | ${'comma wrapped in quotes'}
    ${'a"b'}            | ${'"a""b"'}           | ${'internal quote doubled and wrapped'}
    ${'line1\nline2'}   | ${'"line1\nline2"'}   | ${'line break wrapped in quotes'}
    ${'line1\r\nline2'} | ${'"line1\r\nline2"'} | ${'CRLF wrapped in quotes'}
    ${''}               | ${''}                 | ${'empty string stays empty'}
  `('escapes "$value" as $expected ($description)', ({ value, expected }) => {
    expect(escapeCsvCell(value)).toBe(expected);
  });
});

describe('parseRequestedColumns', () => {
  it('returns all default columns when no columns param is given', () => {
    expect(parseRequestedColumns(undefined)).toEqual(
      DEFAULT_INTEGRATION_CSV_COLUMNS
    );
  });

  it('returns all default columns for an empty string', () => {
    expect(parseRequestedColumns('')).toEqual(DEFAULT_INTEGRATION_CSV_COLUMNS);
  });

  it('parses a comma-separated string of valid keys', () => {
    expect(parseRequestedColumns('integration_type,license_type')).toEqual([
      IntegrationCsvColumnKey.IntegrationType,
      IntegrationCsvColumnKey.LicenseType,
    ]);
  });

  it('parses an array of valid keys', () => {
    expect(parseRequestedColumns(['use_case', 'verification_status'])).toEqual([
      IntegrationCsvColumnKey.UseCase,
      IntegrationCsvColumnKey.VerificationStatus,
    ]);
  });

  it('ignores unknown keys but keeps valid ones', () => {
    expect(parseRequestedColumns('integration_type,not_a_real_column')).toEqual(
      [IntegrationCsvColumnKey.IntegrationType]
    );
  });

  it('de-duplicates repeated keys', () => {
    expect(
      parseRequestedColumns('license_type,license_type,license_type')
    ).toEqual([IntegrationCsvColumnKey.LicenseType]);
  });

  it('falls back to all default columns when every key is unknown', () => {
    expect(parseRequestedColumns('foo,bar')).toEqual(
      DEFAULT_INTEGRATION_CSV_COLUMNS
    );
  });

  it('trims whitespace around keys', () => {
    expect(parseRequestedColumns(' integration_type , license_type ')).toEqual([
      IntegrationCsvColumnKey.IntegrationType,
      IntegrationCsvColumnKey.LicenseType,
    ]);
  });
});

describe('parseRequestedFilters', () => {
  it('returns undefined when no recognized filter query param is given', () => {
    expect(parseRequestedFilters({})).toBeUndefined();
  });

  it('ignores unrelated query params', () => {
    expect(
      parseRequestedFilters({ columns: 'integration_type', foo: 'bar' })
    ).toBeUndefined();
  });

  it('builds a single AND leaf for one filter param with a comma-separated value', () => {
    expect(
      parseRequestedFilters({ integration_type: 'connector,csv_feed' })
    ).toEqual({
      operator: LogicalOperator.And,
      children: [
        {
          leaf: {
            key: FilterKey.IntegrationType,
            value: ['connector', 'csv_feed'],
          },
        },
      ],
    });
  });

  it('builds one AND leaf per recognized filter param, in EXPORT_FILTER_PARAMS order', () => {
    expect(
      parseRequestedFilters({
        verified: 'true',
        integration_type: 'connector',
        solution_category: 'U29sdXRpb25DYXRlZ29yeToxMjM=',
        use_case: 'VXNlQ2FzZTo0NTY=',
      })
    ).toEqual({
      operator: LogicalOperator.And,
      children: [
        { leaf: { key: FilterKey.IntegrationType, value: ['connector'] } },
        {
          leaf: {
            key: FilterKey.SolutionCategory,
            value: ['U29sdXRpb25DYXRlZ29yeToxMjM='],
          },
        },
        { leaf: { key: FilterKey.Verified, value: ['true'] } },
        { leaf: { key: FilterKey.Label, value: ['VXNlQ2FzZTo0NTY='] } },
      ],
    });
  });

  it('maps the use_case query param to the Label FilterKey', () => {
    expect(
      parseRequestedFilters({ use_case: 'VXNlQ2FzZTo0NTY=,VXNlQ2FzZTo3ODk=' })
    ).toEqual({
      operator: LogicalOperator.And,
      children: [
        {
          leaf: {
            key: FilterKey.Label,
            value: ['VXNlQ2FzZTo0NTY=', 'VXNlQ2FzZTo3ODk='],
          },
        },
      ],
    });
  });

  it('accepts an array value for a filter param', () => {
    expect(
      parseRequestedFilters({ license_type: ['Free', 'Commercial'] })
    ).toEqual({
      operator: LogicalOperator.And,
      children: [
        {
          leaf: { key: FilterKey.LicenseType, value: ['Free', 'Commercial'] },
        },
      ],
    });
  });

  it('trims whitespace and drops empty values', () => {
    expect(
      parseRequestedFilters({ integration_type: ' connector , , csv_feed ' })
    ).toEqual({
      operator: LogicalOperator.And,
      children: [
        {
          leaf: {
            key: FilterKey.IntegrationType,
            value: ['connector', 'csv_feed'],
          },
        },
      ],
    });
  });

  it('ignores a filter param with an empty string value', () => {
    expect(parseRequestedFilters({ integration_type: '' })).toBeUndefined();
  });
});

describe('buildIntegrationsCsv', () => {
  it('starts with a UTF-8 BOM for spreadsheet compatibility', () => {
    const csv = buildIntegrationsCsv([baseRow]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('returns a header-only CSV when there are no rows', () => {
    const csv = buildIntegrationsCsv([]);
    expect(csv).toBe(
      '\uFEFFName,Integration type,Use case,Deployment type,Verification status,Solution category,License type\r\n'
    );
  });

  it('includes one data row per integration with all default columns', () => {
    const csv = buildIntegrationsCsv([baseRow]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[0]).toBe(
      'Name,Integration type,Use case,Deployment type,Verification status,Solution category,License type'
    );
    expect(lines[1]).toBe(
      'Sentinel Connector,connector,Threat Detection;Incident Response,Automatic deploy,Verified,Detection,Open Source'
    );
  });

  it('only includes the requested columns, always keeping Name first', () => {
    const csv = buildIntegrationsCsv(
      [baseRow],
      [IntegrationCsvColumnKey.LicenseType]
    );
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[0]).toBe('Name,License type');
    expect(lines[1]).toBe('Sentinel Connector,Open Source');
  });

  it.each`
    field                  | expected           | description
    ${'manager_supported'} | ${'Manual deploy'} | ${'deployment type reflects false flag'}
    ${'verified'}          | ${'Unverified'}    | ${'verification status reflects false flag'}
  `(
    'renders $field as $expected when the underlying flag is false',
    ({ field, expected }) => {
      const row = { ...baseRow, [field]: false };
      const column =
        field === 'manager_supported'
          ? IntegrationCsvColumnKey.DeploymentType
          : IntegrationCsvColumnKey.VerificationStatus;
      const csv = buildIntegrationsCsv([row], [column]);
      const [, dataLine] = csv.replace('\uFEFF', '').split('\r\n');
      expect(dataLine).toBe(`Sentinel Connector,${expected}`);
    }
  );

  it('exports empty cells for missing/undefined optional fields', () => {
    const emptyRow: IntegrationCsvExportRow = {
      id: 'doc-2',
      name: 'Bare Feed',
    };
    const csv = buildIntegrationsCsv([emptyRow]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe('Bare Feed,,,,,,');
  });

  it('escapes special characters (commas, quotes, line breaks) in cell values', () => {
    const row: IntegrationCsvExportRow = {
      id: 'doc-3',
      name: 'Weird, "Name"\nwith break',
      license_type: 'A, B',
    };
    const csv = buildIntegrationsCsv(
      [row],
      [IntegrationCsvColumnKey.LicenseType]
    );
    const [, dataLine] = csv.replace('\uFEFF', '').split('\r\n');
    expect(dataLine).toBe('"Weird, ""Name""\nwith break","A, B"');
  });

  it('joins multiple use cases / solution categories with a semicolon', () => {
    const csv = buildIntegrationsCsv(
      [baseRow],
      [
        IntegrationCsvColumnKey.UseCase,
        IntegrationCsvColumnKey.SolutionCategory,
      ]
    );
    const [, dataLine] = csv.replace('\uFEFF', '').split('\r\n');
    expect(dataLine).toBe(
      'Sentinel Connector,Threat Detection;Incident Response,Detection'
    );
  });

  it('exports an empty string when a row has no name', () => {
    const row: IntegrationCsvExportRow = { id: 'doc-4', name: null };
    const csv = buildIntegrationsCsv([row], []);
    const [, dataLine] = csv.replace('\uFEFF', '').split('\r\n');
    expect(dataLine).toBe('');
  });
});

describe('buildIntegrationsExportFilename', () => {
  it('formats the filename with a YYYY-MM-DD date stamp', () => {
    expect(
      buildIntegrationsExportFilename(new Date('2026-09-10T18:00:00Z'))
    ).toBe('integrations-library-export-2026-09-10.csv');
  });

  it('defaults to the current date when none is provided', () => {
    const filename = buildIntegrationsExportFilename();
    expect(filename).toMatch(
      /^integrations-library-export-\d{4}-\d{2}-\d{2}\.csv$/
    );
  });
});
