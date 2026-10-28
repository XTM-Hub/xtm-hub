import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaasPlatformMetricsPeriod } from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SaasManagerClient } from '../../thirdparty/saasmanager/client';
import { logApp } from '../../utils/app-logger.util';
import { ProductInformationHelper } from './product-information.helper';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The SLA grid and the days asked to the SaaS Manager depend on the current date.
const NOW = '2026-10-27T09:00:00.000Z';

/** The expected SLA of a month: every day of it, null unless given an availability by day of the month. */
const slaMonth = (
  month: string,
  availability: number | null,
  dayAvailabilities: Record<number, number> = {}
) => {
  const start = new Date(month);
  const dayCount = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return {
    month,
    availability,
    days: Array.from({ length: dayCount }, (_, index) => ({
      day: new Date(start.getTime() + index * MS_PER_DAY).toISOString(),
      availability: dayAvailabilities[index + 1] ?? null,
    })),
  };
};

describe('product information helper', () => {
  describe('fetchSaasPlatformData', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const platformId = uuidv4();
    const metricsPeriod = SaasPlatformMetricsPeriod.Last_90Days;
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
        platformId,
        metricsPeriod
      );

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith({
        platform_id: platformId,
        include_metrics: 90,
      });
    });

    it.each`
      period                                    | days
      ${SaasPlatformMetricsPeriod.Last_30Days}  | ${30}
      ${SaasPlatformMetricsPeriod.Last_90Days}  | ${90}
      ${SaasPlatformMetricsPeriod.Last_180Days} | ${180}
    `(
      'should ask the SaaS Manager for $days days of metrics when the period is $period and covers its first SLA month',
      async ({ period, days }) => {
        // Given
        const callSpy = mockSaasManagerBody(fullMetadata);

        // When
        await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId,
          period
        );

        // Then
        expect(callSpy).toHaveBeenCalledExactlyOnceWith({
          platform_id: platformId,
          include_metrics: days,
        });
      }
    );

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
        platformId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: fullMetadata,
        metrics: null,
        storage: null,
        sla: null,
      });
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
        platformId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: emptyMetadata,
        metrics: null,
        storage: null,
        sla: null,
      });
    });

    it('should keep the fields sent when the SaaS Manager sends only some of them', async () => {
      // Given
      mockSaasManagerBody({ hostname: fullMetadata.hostname });

      // When
      const data = await ProductInformationHelper.fetchSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      expect(data).toEqual({
        metadata: { ...emptyMetadata, hostname: fullMetadata.hostname },
        metrics: null,
        storage: null,
        sla: null,
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
          platformId,
          metricsPeriod
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
          storage: null,
          sla: null,
        });
      }
    );

    it.each`
      case                         | sent                           | expected
      ${'an ISO date'}             | ${startDate}                   | ${startDate}
      ${'a date with an offset'}   | ${'2026-01-01T01:00:00+01:00'} | ${startDate}
      ${'a date with millisecond'} | ${'2026-01-01T00:00:00.5Z'}    | ${'2026-01-01T00:00:00.500Z'}
    `(
      'should return the date as an ISO string when the SaaS Manager sends $case',
      async ({ sent, expected }) => {
        // Given
        mockSaasManagerBody({ ...fullMetadata, start_date: sent });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
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
        platformId,
        metricsPeriod
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
          platformId,
          metricsPeriod
        );

        // Then
        expect(data).toEqual({
          metadata: fullMetadata,
          metrics: parsedMetrics,
          storage: null,
          sla: {
            target: 0.9998,
            months: [
              slaMonth('2026-08-01T00:00:00.000Z', null),
              slaMonth('2026-09-01T00:00:00.000Z', 0.75, { 22: 0.75 }),
              slaMonth('2026-10-01T00:00:00.000Z', null),
            ],
          },
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
          platformId,
          metricsPeriod
        );

        // Then
        expect(data).toEqual({
          metadata: fullMetadata,
          metrics: null,
          storage: null,
          sla: null,
        });
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
            platformId,
            metricsPeriod
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
          platformId,
          metricsPeriod
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
          platformId,
          metricsPeriod
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
          platformId,
          metricsPeriod
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

    describe('sla', () => {
      const slaMetrics = (
        start: string,
        points: { t: string; v: unknown }[]
      ) => ({
        start,
        end: NOW,
        resolution: 'hour',
        series: [
          { metric_type: 'sla_availability', points },
          {
            metric_type: 'es_used_size',
            points: [{ t: start, v: 1073741824 }],
          },
        ],
      });

      const fetchSla = async (
        metrics: unknown,
        period: SaasPlatformMetricsPeriod = metricsPeriod
      ) => {
        mockSaasManagerBody({ ...fullMetadata, metrics });
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId,
          period
        );
        return data?.sla;
      };

      it.each`
        period                                    | days
        ${SaasPlatformMetricsPeriod.Last_30Days}  | ${31}
        ${SaasPlatformMetricsPeriod.Last_90Days}  | ${92}
        ${SaasPlatformMetricsPeriod.Last_180Days} | ${184}
      `(
        'should ask the SaaS Manager for $days days of metrics when the period $period starts after the midnight of its first SLA month',
        async ({ period, days }) => {
          // Given
          vi.setSystemTime('2026-10-31T12:00:00.000Z');
          const callSpy = mockSaasManagerBody(fullMetadata);

          // When
          await ProductInformationHelper.fetchSaasPlatformData(
            serviceInstanceId,
            platformId,
            period
          );

          // Then
          expect(callSpy).toHaveBeenCalledExactlyOnceWith({
            platform_id: platformId,
            include_metrics: days,
          });
        }
      );

      it('should average all the sla_availability points of each month and of each day, the current month to date', async () => {
        // Given
        const metrics = slaMetrics('2026-07-29T09:00:00+00:00', [
          { t: '2026-08-01T00:00:00+00:00', v: 1 },
          { t: '2026-08-31T21:00:00+00:00', v: 0.5 },
          { t: '2026-08-31T22:00:00+00:00', v: 0.75 },
          { t: '2026-08-31T23:00:00+00:00', v: 0.25 },
          { t: '2026-09-15T12:00:00+00:00', v: null },
          { t: '2026-10-03T12:00:00+00:00', v: 0.9999 },
        ]);

        // When
        const sla = await fetchSla(metrics);

        // Then
        expect(sla).toEqual({
          target: 0.9998,
          months: [
            slaMonth('2026-08-01T00:00:00.000Z', 0.625, { 1: 1, 31: 0.5 }),
            slaMonth('2026-09-01T00:00:00.000Z', null),
            slaMonth('2026-10-01T00:00:00.000Z', 0.9999, { 3: 0.9999 }),
          ],
        });
      });

      it('should list every day of the current month, the days to come without availability', async () => {
        // Given
        const metrics = slaMetrics('2026-09-27T09:00:00+00:00', [
          { t: '2026-10-03T12:00:00+00:00', v: 1 },
          { t: '2026-10-27T08:00:00+00:00', v: 0.5 },
        ]);

        // When
        const sla = await fetchSla(
          metrics,
          SaasPlatformMetricsPeriod.Last_30Days
        );

        // Then
        const days = sla?.months[0].days;
        expect(days).toHaveLength(31);
        expect(days?.[0]).toEqual({
          day: '2026-10-01T00:00:00.000Z',
          availability: null,
        });
        expect(days?.[2]).toEqual({
          day: '2026-10-03T00:00:00.000Z',
          availability: 1,
        });
        expect(days?.[26]).toEqual({
          day: '2026-10-27T00:00:00.000Z',
          availability: 0.5,
        });
        expect(days?.slice(27)).toEqual([
          { day: '2026-10-28T00:00:00.000Z', availability: null },
          { day: '2026-10-29T00:00:00.000Z', availability: null },
          { day: '2026-10-30T00:00:00.000Z', availability: null },
          { day: '2026-10-31T00:00:00.000Z', availability: null },
        ]);
      });

      it('should return every month of the period when the metrics start after its first month', async () => {
        // Given
        const metrics = slaMetrics('2026-09-15T00:00:00+00:00', [
          { t: '2026-09-15T00:00:00+00:00', v: 1 },
        ]);

        // When
        const sla = await fetchSla(
          metrics,
          SaasPlatformMetricsPeriod.Last_180Days
        );

        // Then
        expect(sla).toEqual({
          target: 0.9998,
          months: [
            slaMonth('2026-05-01T00:00:00.000Z', null),
            slaMonth('2026-06-01T00:00:00.000Z', null),
            slaMonth('2026-07-01T00:00:00.000Z', null),
            slaMonth('2026-08-01T00:00:00.000Z', null),
            slaMonth('2026-09-01T00:00:00.000Z', 1, { 15: 1 }),
            slaMonth('2026-10-01T00:00:00.000Z', null),
          ],
        });
      });

      it('should ignore the points outside the months of the period', async () => {
        // Given
        const metrics = slaMetrics('2026-09-27T09:00:00+00:00', [
          { t: '2026-09-30T23:59:59+00:00', v: 0 },
          { t: '2026-10-02T12:00:00+00:00', v: 1 },
          { t: '2026-11-01T00:00:00+00:00', v: 0 },
        ]);

        // When
        const sla = await fetchSla(
          metrics,
          SaasPlatformMetricsPeriod.Last_30Days
        );

        // Then
        expect(sla).toEqual({
          target: 0.9998,
          months: [slaMonth('2026-10-01T00:00:00.000Z', 1, { 2: 1 })],
        });
      });

      it('should carry the months over to the next year', async () => {
        // Given
        vi.setSystemTime('2027-01-15T12:00:00.000Z');
        const metrics = slaMetrics('2026-10-17T12:00:00+00:00', [
          { t: '2026-12-31T23:00:00+00:00', v: 0.5 },
          { t: '2027-01-01T00:00:00+00:00', v: 1 },
        ]);

        // When
        const sla = await fetchSla(metrics);

        // Then
        expect(sla).toEqual({
          target: 0.9998,
          months: [
            slaMonth('2026-11-01T00:00:00.000Z', null),
            slaMonth('2026-12-01T00:00:00.000Z', 0.5, { 31: 0.5 }),
            slaMonth('2027-01-01T00:00:00.000Z', 1, { 1: 1 }),
          ],
        });
      });

      it.each`
        case                                     | metrics
        ${'the metrics are null'}                | ${null}
        ${'there is no sla_availability series'} | ${{ start: '2026-07-29T09:00:00+00:00', end: NOW, resolution: 'hour', series: [] }}
      `('should return a null sla when $case', async ({ metrics }) => {
        // Given / When
        const sla = await fetchSla(metrics);

        // Then
        expect(sla).toBeNull();
      });
    });

    describe('storage', () => {
      const storage = {
        es_used_size: {
          percent: 12.5,
          used: 1073741824,
          limit: 8589934592,
        },
        s3_used_size: {
          percent: 0,
          used: 0,
          limit: 0,
        },
      };
      const parsedStorage = {
        ...storage,
        s3_used_size: {
          ...storage.s3_used_size,
        },
      };

      it('should return the storage sent by the SaaS Manager with ISO dates and without the unknown fields', async () => {
        // Given
        mockSaasManagerBody({
          ...fullMetadata,
          storage: {
            ...storage,
            redis_used_size: storage.es_used_size,
            es_used_size: { ...storage.es_used_size, unexpected: 'ignored' },
          },
        });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
        );

        // Then
        expect(data).toEqual({
          metadata: fullMetadata,
          metrics: null,
          storage: parsedStorage,
          sla: null,
        });
      });

      it.each([
        ['null', null],
        ['a string', 'storage'],
        ['an array', [storage]],
      ])('should return a null storage when it is %s', async (_, sent) => {
        // Given
        mockSaasManagerBody({ ...fullMetadata, storage: sent });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
        );

        // Then
        expect(data?.storage).toBeNull();
      });

      it.each`
        case          | usage
        ${'missing'}  | ${undefined}
        ${'null'}     | ${null}
        ${'an array'} | ${[storage.es_used_size]}
      `('should return a null usage when it is $case', async ({ usage }) => {
        // Given
        mockSaasManagerBody({
          ...fullMetadata,
          storage: { ...storage, es_used_size: usage },
        });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
        );

        // Then
        expect(data?.storage).toEqual({ ...parsedStorage, es_used_size: null });
      });

      it('should return a null value for the sizes that are not finite numbers', async () => {
        // Given
        mockSaasManagerBody({
          ...fullMetadata,
          storage: {
            ...storage,
            es_used_size: {
              percent: '12.5',
              used: null,
              limit: Infinity,
            },
          },
        });

        // When
        const data = await ProductInformationHelper.fetchSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
        );

        // Then
        expect(data?.storage?.es_used_size).toEqual({
          percent: null,
          used: null,
          limit: null,
        });
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
        platformId,
        metricsPeriod
      );

      // Then
      expect(data).toBeNull();
    });
  });

  describe('fetchSaasPlatforms', () => {
    const platform = {
      id: uuidv4(),
      status: 'active',
      plan: 'Enterprise',
      storage: {
        es_used_size: {
          percent: 12.5,
          used: 1073741824,
          limit: 8589934592,
          time: '2026-10-28T08:30:00.587Z',
        },
        s3_used_size: {
          percent: 0,
          used: 0,
          limit: 0,
          time: '2026-10-28T08:30:00.587Z',
        },
        postgres_used_size: {
          percent: 1,
          used: 1,
          limit: 100,
          time: '2026-10-28T08:30:00.587Z',
        },
      },
      sla_cmtd: 99.9,
      start_date: '2026-01-01',
      end_date: '2027-01-01',
      hostname: 'my-platform.example.com',
      commercial_model: 'INTERNAL',
      customer: 'Filigran',
      region: 'eu-west',
      product: 'OCTI',
    };
    const parsedPlatform = {
      id: platform.id,
      status: 'active',
      product: 'OCTI',
      customer: 'Filigran',
      commercial_model: 'INTERNAL',
      sla_cmtd: 99.9,
      metadata: {
        hostname: 'my-platform.example.com',
        plan: 'Enterprise',
        start_date: '2026-01-01T00:00:00.000Z',
        end_date: '2027-01-01T00:00:00.000Z',
        region: 'eu-west',
      },
      storage: {
        es_used_size: { percent: 12.5, used: 1073741824, limit: 8589934592 },
        s3_used_size: { percent: 0, used: 0, limit: 0 },
      },
    };

    const request = {
      page: 2,
      page_size: 25,
      search: 'filigran',
      ordering: '-customer',
    };

    const page = (results: unknown[], count = 26) => ({
      count,
      next: null,
      previous: 'https://saasmanager.test/api/hub/instance/?page=1',
      results,
    });

    const mockSaasManagerBody = (body: unknown) =>
      vi.spyOn(SaasManagerClient, 'callInstanceListApi').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => body,
      } as Response);

    it('should ask the SaaS Manager for the given page, search and ordering', async () => {
      // Given
      const callSpy = mockSaasManagerBody(page([platform]));

      // When
      await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(request);
    });

    it('should return the platforms sent by the SaaS Manager without the unknown fields, with the total count', async () => {
      // Given
      mockSaasManagerBody(page([platform]));

      // When
      const result = await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(result).toEqual({ totalCount: 26, platforms: [parsedPlatform] });
    });

    it('should count the platforms of the page when the SaaS Manager sends no count', async () => {
      // Given
      mockSaasManagerBody({ results: [platform] });

      // When
      const result = await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(result).toEqual({ totalCount: 1, platforms: [parsedPlatform] });
    });

    it('should return no platform when the SaaS Manager sends an empty page', async () => {
      // Given
      mockSaasManagerBody(page([], 0));

      // When
      const result = await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(result).toEqual({ totalCount: 0, platforms: [] });
    });

    it.each`
      case                          | body
      ${'the body is null'}         | ${null}
      ${'the body is an array'}     | ${[platform]}
      ${'the results are missing'}  | ${{ count: 0, next: null }}
      ${'the results are a string'} | ${{ count: 0, next: null, results: 'platforms' }}
    `('should log an error and return null when $case', async ({ body }) => {
      // Given
      mockSaasManagerBody(body);
      const errorSpy = vi.spyOn(logApp, 'error');

      // When
      const result = await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
        'The SaaS Manager returned an unreadable page of platforms',
        { page: request.page }
      );
    });

    it.each`
      case                   | sent
      ${'not an object'}     | ${'platform'}
      ${'without an id'}     | ${{ ...platform, id: undefined }}
      ${'with an empty id'}  | ${{ ...platform, id: '' }}
      ${'with a numeric id'} | ${{ ...platform, id: 42 }}
    `('should drop a platform $case', async ({ sent }) => {
      // Given
      mockSaasManagerBody(page([sent, platform]));

      // When
      const result = await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(result?.platforms).toEqual([parsedPlatform]);
    });

    it('should return null fields when the SaaS Manager sends only the id of a platform', async () => {
      // Given
      mockSaasManagerBody(page([{ id: platform.id }]));

      // When
      const result = await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(result?.platforms).toEqual([
        {
          id: platform.id,
          status: null,
          product: null,
          customer: null,
          commercial_model: null,
          sla_cmtd: null,
          metadata: {
            hostname: null,
            plan: null,
            start_date: null,
            end_date: null,
            region: null,
          },
          storage: null,
        },
      ]);
    });

    it.each`
      case                       | response
      ${'the call fails'}        | ${() => Promise.reject(new Error('fetch failed'))}
      ${'it returns 401'}        | ${async () => ({ ok: false, status: 401, json: async () => page([platform]) }) as Response}
      ${'it returns 404'}        | ${async () => ({ ok: false, status: 404, json: async () => ({ detail: 'Invalid page.' }) }) as Response}
      ${'it returns 500'}        | ${async () => ({ ok: false, status: 500, json: async () => page([platform]) }) as Response}
      ${'the body is malformed'} | ${async () => ({ ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('Unexpected token')) }) as Response}
    `('should return null when $case', async ({ response }) => {
      // Given
      vi.spyOn(SaasManagerClient, 'callInstanceListApi').mockImplementation(
        response
      );

      // When
      const result = await ProductInformationHelper.fetchSaasPlatforms(request);

      // Then
      expect(result).toBeNull();
    });
  });
});
