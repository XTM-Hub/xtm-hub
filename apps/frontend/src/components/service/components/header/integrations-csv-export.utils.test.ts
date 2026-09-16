import {
  buildIntegrationsCsvExportUrl,
  downloadIntegrationsCsv,
  extractFilenameFromContentDisposition,
  FALLBACK_CSV_EXPORT_FILENAME,
  INTEGRATION_CSV_EXPORT_COLUMNS,
  toIntegrationCsvColumnLabelKey,
} from '@/components/service/components/header/integrations-csv-export.utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('integrations-csv-export.utils', () => {
  describe('buildIntegrationsCsvExportUrl', () => {
    it('builds a bare path when no column is selected', () => {
      // When
      const url = buildIntegrationsCsvExportUrl('service-1', []);

      // Then
      expect(url).toBe('/document/csv-export/service-1');
    });

    it('appends the selected columns as a comma-separated query param', () => {
      // When
      const url = buildIntegrationsCsvExportUrl('service-1', [
        'integration_type',
        'use_case',
      ]);

      // Then
      expect(url).toBe(
        '/document/csv-export/service-1?columns=integration_type%2Cuse_case'
      );
    });

    it('appends each non-empty filter as its own comma-separated query param', () => {
      // When
      const url = buildIntegrationsCsvExportUrl('service-1', [], {
        integrationTypes: ['TAXII_FEED', 'RSS_FEED'],
        useCases: ['use-case-1'],
        licenseTypes: ['Free'],
        solutionCategories: ['cat-1'],
        verified: ['true'],
        deployable: ['false'],
      });

      // Then
      expect(url).toBe(
        '/document/csv-export/service-1?integration_type=TAXII_FEED%2CRSS_FEED&license_type=Free&manager_supported=false&solution_category=cat-1&verified=true&use_case=use-case-1'
      );
    });

    it('omits filters that are empty or not provided', () => {
      // When
      const url = buildIntegrationsCsvExportUrl('service-1', ['use_case'], {
        integrationTypes: [],
        verified: ['true'],
      });

      // Then
      expect(url).toBe(
        '/document/csv-export/service-1?columns=use_case&verified=true'
      );
    });
  });

  describe('extractFilenameFromContentDisposition', () => {
    it.each`
      header                                              | expected
      ${null}                                             | ${null}
      ${''}                                               | ${null}
      ${'attachment'}                                     | ${null}
      ${'attachment; filename="integrations-export.csv"'} | ${'integrations-export.csv'}
      ${'attachment; filename=integrations-export.csv'}   | ${'integrations-export.csv'}
    `('returns $expected for header "$header"', ({ header, expected }) => {
      expect(extractFilenameFromContentDisposition(header)).toBe(expected);
    });
  });

  describe('downloadIntegrationsCsv', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.unstubAllGlobals();
    });

    it('fetches with credentials, then triggers a download anchor click', async () => {
      // Given
      const blob = new Blob(['name,integration_type'], { type: 'text/csv' });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="my-export.csv"',
        }),
        blob: () => Promise.resolve(blob),
      });
      vi.stubGlobal('fetch', fetchMock);
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);

      // When
      await downloadIntegrationsCsv('service-1', ['integration_type']);

      // Then
      expect(fetchMock).toHaveBeenCalledWith(
        '/document/csv-export/service-1?columns=integration_type',
        { credentials: 'include' }
      );
      expect(clickSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      clickSpy.mockRestore();
    });

    it('forwards the filters as query params to the fetch call', async () => {
      // Given
      const blob = new Blob(['name'], { type: 'text/csv' });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        blob: () => Promise.resolve(blob),
      });
      vi.stubGlobal('fetch', fetchMock);
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);

      // When
      await downloadIntegrationsCsv('service-1', ['integration_type'], {
        verified: ['true'],
      });

      // Then
      expect(fetchMock).toHaveBeenCalledWith(
        '/document/csv-export/service-1?columns=integration_type&verified=true',
        { credentials: 'include' }
      );
      clickSpy.mockRestore();
    });

    it('falls back to a default filename when there is no Content-Disposition header', async () => {
      // Given
      const blob = new Blob(['name'], { type: 'text/csv' });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: new Headers(),
          blob: () => Promise.resolve(blob),
        })
      );
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          expect(this.download).toBe(FALLBACK_CSV_EXPORT_FILENAME);
        });

      // When
      await downloadIntegrationsCsv('service-1', []);

      // Then
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('throws when the response is not ok', async () => {
      // Given
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 401 })
      );

      // When / Then
      await expect(downloadIntegrationsCsv('service-1', [])).rejects.toThrow(
        'CSV export failed with status 401'
      );
    });
  });

  it('exposes exactly the columns supported by the backend export endpoint', () => {
    expect(INTEGRATION_CSV_EXPORT_COLUMNS.map((column) => column.key)).toEqual([
      'integration_type',
      'use_case',
      'deployment_type',
      'verification_status',
      'solution_category',
      'license_type',
      'short_description',
      'long_description',
      'feed_url',
      'opencti_documentation',
      'vendor_url',
      'demo_link',
    ]);
  });

  describe('toIntegrationCsvColumnLabelKey', () => {
    it.each`
      key                        | expected
      ${'integration_type'}      | ${'IntegrationType'}
      ${'use_case'}              | ${'UseCase'}
      ${'deployment_type'}       | ${'DeploymentType'}
      ${'verification_status'}   | ${'VerificationStatus'}
      ${'solution_category'}     | ${'SolutionCategory'}
      ${'license_type'}          | ${'LicenseType'}
      ${'short_description'}     | ${'ShortDescription'}
      ${'long_description'}      | ${'LongDescription'}
      ${'feed_url'}              | ${'FeedUrl'}
      ${'opencti_documentation'} | ${'OpenctiDocumentation'}
      ${'vendor_url'}            | ${'VendorUrl'}
      ${'demo_link'}             | ${'DemoLink'}
    `('converts "$key" to "$expected"', ({ key, expected }) => {
      expect(toIntegrationCsvColumnLabelKey(key)).toBe(expected);
    });
  });
});
