import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { logApp } from '../../utils/app-logger.util';
import { ProductInformationHelper } from './product-information.helper';

describe('product information helper', () => {
  describe('fetchSaasPlatformData', () => {
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const platformId = uuidv4();
    const startDate = '2026-01-01T00:00:00.000Z';
    const endDate = '2027-01-01T00:00:00.000Z';
    const fullMetadata = {
      hostname: 'my-platform.example.com',
      plan: 'Enterprise',
      start_date: startDate,
      end_date: endDate,
      region: 'eu-west',
    };
    const emptyMetadata = {
      hostname: null,
      plan: null,
      start_date: null,
      end_date: null,
      region: null,
    };

    const mockSaasManagerResponse = (response: () => Promise<Response>) =>
      vi
        .spyOn(SaasManagerClient, 'callInstanceApi')
        .mockImplementation(response);

    const mockSaasManagerBody = (body: unknown) =>
      mockSaasManagerResponse(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => body,
          }) as Response
      );

    it('should ask the SaaS Manager for the given platform_id', async () => {
      // Given
      const callSpy = mockSaasManagerBody(fullMetadata);

      // When
      await ProductInformationHelper.fetchSaasPlatformData(
        serviceInstanceId,
        platformId
      );

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith({
        platform_id: platformId,
        include_metrics: 90,
      });
    });

    it('should return the metadata sent by the SaaS Manager without the unknown fields', async () => {
      // Given
      mockSaasManagerBody({
        ...fullMetadata,
        version: '6.7.17',
        unexpected: 'ignored',
      });

      // When
      const data = await ProductInformationHelper.fetchSaasPlatformData(
        serviceInstanceId,
        platformId
      );

      // Then
      expect(data).toEqual({ metadata: fullMetadata, metrics: null });
    });

    it.each([
      ['the body is null', null],
      ['the body is a string', 'my-platform.example.com'],
      ['the body is an array', [fullMetadata]],
      ['the body is empty', {}],
      ['the fields are explicitly null', emptyMetadata],
    ])('should return null fields when %s', async (_, body) => {
      // Given
      mockSaasManagerBody(body);

      // When
      const data = await ProductInformationHelper.fetchSaasPlatformData(
        serviceInstanceId,
        platformId
      );

      // Then
      expect(data).toEqual({ metadata: emptyMetadata, metrics: null });
    });

    it('should keep the fields sent when the SaaS Manager sends only some of them', async () => {
      // Given
      mockSaasManagerBody({ hostname: fullMetadata.hostname });

      // When
      const data = await ProductInformationHelper.fetchSaasPlatformData(
        serviceInstanceId,
        platformId
      );

      // Then
      expect(data).toEqual({
        metadata: { ...emptyMetadata, hostname: fullMetadata.hostname },
        metrics: null,
      });
    });

    it.each`
      case                     | fields
      ${'an unparseable date'} | ${{ start_date: 'not a date', end_date: '2027-13-45' }}
      ${'non-string values'}   | ${{ hostname: 42, plan: { name: 'Enterprise' }, start_date: 1767225600000, end_date: true, region: ['eu-west'] }}
      ${'empty strings'}       | ${{ hostname: '', plan: '', start_date: '', end_date: '', region: '' }}
    `(
      'should return null for the fields the SaaS Manager sends as $case',
      async ({ fields }) => {
        // Given
        mockSaasManagerBody({ ...fullMetadata, ...fields });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId
        );

        // Then
        expect(data).toEqual({
          metadata: {
            ...fullMetadata,
            ...Object.fromEntries(
              Object.keys(fields).map((key) => [key, null])
            ),
          },
          metrics: null,
        });
      }
    );

    it.each`
      case                         | sent                           | expected
      ${'an ISO date'}             | ${startDate}                   | ${startDate}
      ${'a date with an offset'}   | ${'2026-01-01T01:00:00+01:00'} | ${startDate}
      ${'a date without time'}     | ${'2026-01-01'}                | ${startDate}
      ${'a date with millisecond'} | ${'2026-01-01T00:00:00.5Z'}    | ${'2026-01-01T00:00:00.500Z'}
    `(
      'should return the date as an ISO string when the SaaS Manager sends $case',
      async ({ sent, expected }) => {
        // Given
        mockSaasManagerBody({ ...fullMetadata, start_date: sent });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId
        );

        // Then
        expect(data?.metadata.start_date).toBe(expected);
      }
    );

    it('should warn about the field when the SaaS Manager sends an unparseable date', async () => {
      // Given
      const warnSpy = vi.spyOn(logApp, 'warn');
      mockSaasManagerBody({ ...fullMetadata, end_date: 'not a date' });

      // When
      await ProductInformationHelper.fetchSaasPlatformData(
        serviceInstanceId,
        platformId
      );

      // Then
      expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
        'The SaaS Manager returned an unparseable platform date',
        { field: 'end_date' }
      );
    });

    describe('metrics', () => {
      const metrics = {
        instance: platformId,
        start: '2026-09-22T12:00:00+00:00',
        end: '2026-10-22T12:07:57.335611+00:00',
        resolution: 'hour',
        series: [
          {
            metric_type: 'sla_availability',
            points: [
              { t: '2026-09-22T09:00:00+00:00', v: 1 },
              { t: '2026-09-22T10:00:00+00:00', v: 0.5 },
            ],
          },
        ],
      };
      const parsedMetrics = {
        start: '2026-09-22T12:00:00.000Z',
        end: '2026-10-22T12:07:57.335Z',
        resolution: 'hour',
        series: [
          {
            metric_type: 'sla_availability',
            points: [
              { timestamp: '2026-09-22T09:00:00.000Z', value: 1 },
              { timestamp: '2026-09-22T10:00:00.000Z', value: 0.5 },
            ],
          },
        ],
      };

      it('should return the metrics sent by the SaaS Manager with ISO dates and without the unknown fields', async () => {
        // Given
        mockSaasManagerBody({ ...fullMetadata, metrics });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId
        );

        // Then
        expect(data).toEqual({
          metadata: fullMetadata,
          metrics: parsedMetrics,
        });
      });

      it.each([
        ['null', null],
        ['a string', 'metrics'],
        ['an array', [metrics]],
      ])('should return null metrics when they are %s', async (_, sent) => {
        // Given
        mockSaasManagerBody({ ...fullMetadata, metrics: sent });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId
        );

        // Then
        expect(data).toEqual({ metadata: fullMetadata, metrics: null });
      });

      it.each`
        case                         | fields
        ${'an unparseable start'}    | ${{ start: 'not a date' }}
        ${'a missing end'}           | ${{ end: undefined }}
        ${'an empty resolution'}     | ${{ resolution: '' }}
        ${'a non-string resolution'} | ${{ resolution: 3600 }}
        ${'an unknown resolution'}   | ${{ resolution: 'minute' }}
      `(
        'should return null metrics and warn when they have $case',
        async ({ fields }) => {
          // Given
          const warnSpy = vi.spyOn(logApp, 'warn');
          mockSaasManagerBody({
            ...fullMetadata,
            metrics: { ...metrics, ...fields },
          });

          // When
          const data = await ProductInformationHelper.fetchSaasPlatformData(
            serviceInstanceId,
            platformId
          );

          // Then
          expect(data?.metrics).toBeNull();
          expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
            'The SaaS Manager returned incomplete platform metrics'
          );
        }
      );

      it('should return no series when the series are not a list', async () => {
        // Given
        mockSaasManagerBody({
          ...fullMetadata,
          metrics: { ...metrics, series: 'sla_availability' },
        });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId
        );

        // Then
        expect(data?.metrics).toEqual({ ...parsedMetrics, series: [] });
      });

      it('should drop the series without a known metric type and keep a series without valid points empty', async () => {
        // Given
        mockSaasManagerBody({
          ...fullMetadata,
          metrics: {
            ...metrics,
            series: [
              { metric_type: '', points: metrics.series[0].points },
              { points: metrics.series[0].points },
              'sla_availability',
              { metric_type: 'cpu_usage', points: metrics.series[0].points },
              { metric_type: 's3_used_size', points: 'none' },
            ],
          },
        });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId
        );

        // Then
        expect(data?.metrics?.series).toEqual([
          { metric_type: 's3_used_size', points: [] },
        ]);
      });

      it('should drop the points without a valid time and return a null value when it is not a number', async () => {
        // Given
        mockSaasManagerBody({
          ...fullMetadata,
          metrics: {
            ...metrics,
            series: [
              {
                metric_type: 'sla_availability',
                points: [
                  { t: 'not a date', v: 1 },
                  { v: 1 },
                  null,
                  { t: '2026-09-22T09:00:00+00:00', v: null },
                  { t: '2026-09-22T10:00:00+00:00', v: '1' },
                  { t: '2026-09-22T11:00:00+00:00' },
                ],
              },
            ],
          },
        });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId
        );

        // Then
        expect(data?.metrics?.series).toEqual([
          {
            metric_type: 'sla_availability',
            points: [
              { timestamp: '2026-09-22T09:00:00.000Z', value: null },
              { timestamp: '2026-09-22T10:00:00.000Z', value: null },
              { timestamp: '2026-09-22T11:00:00.000Z', value: null },
            ],
          },
        ]);
      });
    });

    it.each`
      case                       | response
      ${'the call fails'}        | ${() => Promise.reject(new Error('fetch failed'))}
      ${'it returns 204'}        | ${async () => ({ ok: true, status: 204, json: async () => fullMetadata }) as Response}
      ${'it returns 401'}        | ${async () => ({ ok: false, status: 401, json: async () => fullMetadata }) as Response}
      ${'it returns 404'}        | ${async () => ({ ok: false, status: 404, json: async () => fullMetadata }) as Response}
      ${'it returns 500'}        | ${async () => ({ ok: false, status: 500, json: async () => fullMetadata }) as Response}
      ${'the body is malformed'} | ${async () => ({ ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('Unexpected token')) }) as Response}
    `('should return null when $case', async ({ response }) => {
      // Given
      mockSaasManagerResponse(response);

      // When
      const data = await ProductInformationHelper.fetchSaasPlatformData(
        serviceInstanceId,
        platformId
      );

      // Then
      expect(data).toBeNull();
    });
  });
});
