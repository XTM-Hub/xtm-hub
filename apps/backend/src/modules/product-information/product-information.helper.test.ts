import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OrderingMode,
  SaasPlatformContractStatus,
  SaasPlatformHealthIssue,
  SaasPlatformMetricsPeriod,
  SaasPlatformOrdering,
  SaasProduct,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { logApp } from '../../utils/app-logger.util';
import { SaasManagerInstanceDomain } from '../saas-manager-instance/saas-manager-instance.domain';
import { ProductInformationHelper } from './product-information.helper';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The SLA grid and the metrics window read depend on the current date.
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
  describe('loadSaasPlatformData', () => {
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

    // The platform as the SaaS Manager pushed it, its metrics in every window
    const mockSaasManagerBody = (
      body: Record<string, unknown> | null,
      generatedAt = new Date()
    ) =>
      vi.spyOn(SaasManagerInstanceDomain, 'loadInstance').mockResolvedValue(
        body === null
          ? undefined
          : {
              data: body,
              metrics:
                body.metrics === undefined
                  ? null
                  : { 32: body.metrics, 95: body.metrics, 187: body.metrics },
              generated_at: generatedAt,
            }
      );

    const metricsWindow = {
      start: NOW,
      end: NOW,
      resolution: 'day',
      series: [],
    };

    it('should read the platform pushed with the given platform_id', async () => {
      // Given
      const callSpy = mockSaasManagerBody(fullMetadata);

      // When
      await ProductInformationHelper.loadSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(platformId);
    });

    it.each`
      period                                    | days
      ${SaasPlatformMetricsPeriod.Last_30Days}  | ${32}
      ${SaasPlatformMetricsPeriod.Last_90Days}  | ${95}
      ${SaasPlatformMetricsPeriod.Last_180Days} | ${187}
    `(
      'should return the metrics of $days days when the period is $period',
      async ({ period, days }) => {
        // Given
        vi.spyOn(SaasManagerInstanceDomain, 'loadInstance').mockResolvedValue({
          data: fullMetadata,
          metrics: { [days]: metricsWindow },
          generated_at: new Date(),
        });

        // When
        const data = await ProductInformationHelper.loadSaasPlatformData(
          serviceInstanceId,
          platformId,
          period
        );

        // Then
        expect(data?.metrics).toEqual(metricsWindow);
      }
    );

    it('should return no metrics when the window of the period is not stored', async () => {
      // Given
      vi.spyOn(SaasManagerInstanceDomain, 'loadInstance').mockResolvedValue({
        data: fullMetadata,
        metrics: { 32: metricsWindow },
        generated_at: new Date(),
      });

      // When
      const data = await ProductInformationHelper.loadSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      expect(data?.metrics).toBeNull();
    });

    it('should return the metadata sent by the SaaS Manager without the unknown fields', async () => {
      // Given
      mockSaasManagerBody({
        ...fullMetadata,
        version: '6.7.17',
        unexpected: 'ignored',
      });

      // When
      const data = await ProductInformationHelper.loadSaasPlatformData(
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
      ['the body is empty', {}],
      ['the fields are explicitly null', emptyMetadata],
    ])('should return null fields when %s', async (_, body) => {
      // Given
      mockSaasManagerBody(body);

      // When
      const data = await ProductInformationHelper.loadSaasPlatformData(
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
      const data = await ProductInformationHelper.loadSaasPlatformData(
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
      await ProductInformationHelper.loadSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
        'The SaaS Manager pushed an unparseable platform date',
        { field: 'end_date' }
      );
    });

    it('should log an error when the SaaS Manager pushed the platform more than 12 hours ago', async () => {
      // Given
      const errorSpy = vi.spyOn(logApp, 'error');
      mockSaasManagerBody(fullMetadata, new Date('2026-10-26T20:59:59.999Z'));

      // When
      await ProductInformationHelper.loadSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
        'The SaaS Manager has stopped pushing the platform',
        {
          serviceInstanceId,
          platformId,
          generatedAt: '2026-10-26T20:59:59.999Z',
        }
      );
    });

    it('should not log an error when the SaaS Manager pushed the platform 12 hours ago', async () => {
      // Given
      const errorSpy = vi.spyOn(logApp, 'error');
      mockSaasManagerBody(fullMetadata, new Date('2026-10-26T21:00:00.000Z'));

      // When
      await ProductInformationHelper.loadSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      expect(errorSpy).not.toHaveBeenCalled();
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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

      it('should return only the metrics of the period while its SLA keeps the days before it', async () => {
        // Given
        vi.setSystemTime('2026-10-31T12:00:00.000Z');
        mockSaasManagerBody({
          ...fullMetadata,
          metrics: {
            start: '2026-07-25T12:00:00+00:00',
            end: '2026-10-31T12:00:00+00:00',
            resolution: 'day',
            series: [
              {
                metric_type: 'sla_availability',
                points: [
                  { t: '2026-08-01T00:00:00+00:00', v: 0.5 },
                  { t: '2026-09-01T00:00:00+00:00', v: 1 },
                ],
              },
              {
                metric_type: 'es_used_size',
                points: [
                  { t: '2026-08-02T11:59:59+00:00', v: 1 },
                  { t: '2026-08-02T12:00:00+00:00', v: 2 },
                ],
              },
            ],
          },
        });

        // When
        const data = await ProductInformationHelper.loadSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
        );

        // Then
        expect(data?.metrics).toEqual({
          start: '2026-08-02T12:00:00.000Z',
          end: '2026-10-31T12:00:00.000Z',
          resolution: 'day',
          series: [
            {
              metric_type: 'sla_availability',
              points: [{ timestamp: '2026-09-01T00:00:00.000Z', value: 1 }],
            },
            {
              metric_type: 'es_used_size',
              points: [{ timestamp: '2026-08-02T12:00:00.000Z', value: 2 }],
            },
          ],
        });
        expect(data?.sla?.months[0]).toEqual(
          slaMonth('2026-08-01T00:00:00.000Z', 0.5, { 1: 0.5 })
        );
      });

      it.each([
        ['null', null],
        ['a string', 'metrics'],
        ['an array', [metrics]],
      ])('should return null metrics when they are %s', async (_, sent) => {
        // Given
        mockSaasManagerBody({ ...fullMetadata, metrics: sent });

        // When
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
          const data = await ProductInformationHelper.loadSaasPlatformData(
            serviceInstanceId,
            platformId,
            metricsPeriod
          );

          // Then
          expect(data?.metrics).toBeNull();
          expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
            'The SaaS Manager pushed incomplete platform metrics'
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
        );

        // Then
        expect(data?.metrics?.series).toEqual([
          { metric_type: 's3_used_size', points: [] },
        ]);
      });

      it('should keep the PostgreSQL usage series of a platform without Elasticsearch', async () => {
        // Given
        mockSaasManagerBody({
          ...fullMetadata,
          metrics: {
            ...metrics,
            series: [
              {
                metric_type: 'postgres_used_size',
                points: metrics.series[0].points,
              },
            ],
          },
        });

        // When
        const data = await ProductInformationHelper.loadSaasPlatformData(
          serviceInstanceId,
          platformId,
          metricsPeriod
        );

        // Then
        expect(data?.metrics?.series).toEqual([
          {
            metric_type: 'postgres_used_size',
            points: parsedMetrics.series[0].points,
          },
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
          serviceInstanceId,
          platformId,
          period
        );
        return data?.sla;
      };

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
        postgres_used_size: {
          percent: 1,
          used: 1,
          limit: 100,
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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
        const data = await ProductInformationHelper.loadSaasPlatformData(
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

    it('should let a failed read through', async () => {
      // Given
      vi.spyOn(SaasManagerInstanceDomain, 'loadInstance').mockRejectedValue(
        new Error('connection refused')
      );

      // When
      const data = ProductInformationHelper.loadSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      await expect(data).rejects.toThrow('connection refused');
    });

    it('should warn and return null when the SaaS Manager has not pushed the platform', async () => {
      // Given
      mockSaasManagerBody(null);
      const warnSpy = vi.spyOn(logApp, 'warn');

      // When
      const data = await ProductInformationHelper.loadSaasPlatformData(
        serviceInstanceId,
        platformId,
        metricsPeriod
      );

      // Then
      expect({ data, warnings: warnSpy.mock.calls }).toEqual({
        data: null,
        warnings: [
          [
            'The SaaS Manager has not pushed the platform',
            { serviceInstanceId, platformId },
          ],
        ],
      });
    });
  });

  describe('loadSaasPlatforms', () => {
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
      // The techname of the customer: the platform shows its name.
      customer: 'cust-filigran',
      region: 'eu-west',
      product: 'OCTI',
    };
    const customerName = 'Filigran';
    const parsedPlatform = {
      id: platform.id,
      status: 'active',
      product: 'OCTI',
      customer: customerName,
      commercial_model: 'INTERNAL',
      sla_cmtd: 0.999,
      metadata: {
        hostname: 'my-platform.example.com',
        plan: 'Enterprise',
        start_date: '2026-01-01T00:00:00.000Z',
        end_date: '2027-01-01T00:00:00.000Z',
        region: 'eu-west',
      },
      storage: {
        es_used_size: { percent: 12.5, used: 1073741824, limit: 8589934592 },
        s3_used_size: { percent: null, used: 0, limit: 0 },
        postgres_used_size: { percent: 1, used: 1, limit: 100 },
      },
      health_issues: [SaasPlatformHealthIssue.Availability],
      contract_status: SaasPlatformContractStatus.EndingSoon,
    };

    beforeEach(() => {
      vi.useFakeTimers({
        toFake: ['Date'],
        now: new Date('2026-10-28T12:00:00.000Z'),
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const pagination = {
      first: 25,
      after: btoa('25'),
      orderBy: SaasPlatformOrdering.CustomerName,
      orderMode: OrderingMode.Desc,
      searchTerm: 'filigran',
    };

    const pageInfo = {
      startCursor: 'cursor-0',
      endCursor: 'cursor-0',
      hasNextPage: false,
      hasPreviousPage: false,
    };

    // The page of the stored rows, the data of each as the SaaS Manager pushed it
    const page = (
      rows: unknown[],
      totalCount = 26,
      generatedAts: Date[] = []
    ) => ({
      totalCount,
      pageInfo,
      edges: rows.map((data, index) => ({
        cursor: `cursor-${index}`,
        node: {
          id: platform.id,
          data,
          customer_name: customerName,
          generated_at: generatedAts[index] ?? new Date(),
        },
      })),
    });

    const mockSaasManagerBody = (connection: ReturnType<typeof page>) =>
      vi
        .spyOn(SaasManagerInstanceDomain, 'loadInServiceInstances')
        .mockResolvedValue(
          connection as Awaited<
            ReturnType<typeof SaasManagerInstanceDomain.loadInServiceInstances>
          >
        );

    const platformsOf = <T>(result: { edges: { node: T }[] }) =>
      result.edges.map(({ node }) => node);

    it('should read the page asked for', async () => {
      // Given
      const callSpy = mockSaasManagerBody(page([platform]));

      // When
      await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(callSpy).toHaveBeenCalledExactlyOnceWith(pagination);
    });

    it('should return the platforms sent by the SaaS Manager without the unknown fields, with the total count', async () => {
      // Given
      mockSaasManagerBody(page([platform]));

      // When
      const result =
        await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(result).toEqual({
        totalCount: 26,
        pageInfo,
        edges: [{ cursor: 'cursor-0', node: parsedPlatform }],
      });
    });

    it('should return no platform for an empty page', async () => {
      // Given
      mockSaasManagerBody(page([], 0));

      // When
      const result =
        await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(result).toEqual({ totalCount: 0, pageInfo, edges: [] });
    });

    it.each`
      case                   | sent
      ${'not an object'}     | ${'platform'}
      ${'without an id'}     | ${{ ...platform, id: undefined }}
      ${'with an empty id'}  | ${{ ...platform, id: '' }}
      ${'with a numeric id'} | ${{ ...platform, id: 42 }}
    `('should leave out a platform $case', async ({ sent }) => {
      // Given
      mockSaasManagerBody(page([sent, platform]));

      // When
      const result =
        await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(platformsOf(result)).toEqual([parsedPlatform]);
    });

    it('should return null fields but the customer when the SaaS Manager sends only the id of a platform', async () => {
      // Given
      mockSaasManagerBody(page([{ id: platform.id }]));

      // When
      const result =
        await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(platformsOf(result)).toEqual([
        {
          id: platform.id,
          status: null,
          product: null,
          customer: customerName,
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
          health_issues: null,
          contract_status: null,
        },
      ]);
    });

    it.each`
      case                      | product   | expected
      ${'a product code as is'} | ${'OCTI'} | ${SaasProduct.Octi}
      ${'a lower-case product'} | ${'oaev'} | ${SaasProduct.Oaev}
      ${'a mixed-case product'} | ${'One'}  | ${SaasProduct.One}
    `(
      'should return $case as a product of the Hub',
      async ({ product, expected }) => {
        // Given
        mockSaasManagerBody(page([{ id: platform.id, product }]));

        // When
        const result =
          await ProductInformationHelper.loadSaasPlatforms(pagination);

        // Then
        expect(platformsOf(result)[0]?.product).toBe(expected);
      }
    );

    it('should log a warning and return no product for a product the Hub does not know', async () => {
      // Given
      mockSaasManagerBody(page([{ id: platform.id, product: 'OTHER' }]));
      const warnSpy = vi.spyOn(logApp, 'warn');

      // When
      const result =
        await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(platformsOf(result)[0]?.product).toBeNull();
      expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
        'The SaaS Manager pushed an unknown product',
        { product: 'OTHER' }
      );
    });

    it.each`
      case                                     | end_date                      | contract_status
      ${'active with 90 days left'}            | ${'2027-01-26T12:00:00.000Z'} | ${SaasPlatformContractStatus.Active}
      ${'ending soon with 89 days left'}       | ${'2027-01-25T12:00:00.000Z'} | ${SaasPlatformContractStatus.EndingSoon}
      ${'ending soon on its last started day'} | ${'2026-10-28T13:00:00.000Z'} | ${SaasPlatformContractStatus.EndingSoon}
      ${'ended at its end date'}               | ${'2026-10-28T12:00:00.000Z'} | ${SaasPlatformContractStatus.Ended}
      ${'ended 40 days ago'}                   | ${'2026-09-18T12:00:00.000Z'} | ${SaasPlatformContractStatus.Ended}
    `(
      'should tell the contract of a platform $case',
      async ({ end_date, contract_status }) => {
        // Given
        mockSaasManagerBody(page([{ id: platform.id, end_date }]));

        // When
        const result =
          await ProductInformationHelper.loadSaasPlatforms(pagination);

        // Then
        expect(platformsOf(result)[0]?.contract_status).toBe(contract_status);
      }
    );

    const storageUsage = (percent: number) => ({
      percent,
      used: percent,
      limit: 100,
    });

    it.each`
      case                                                  | sla_cmtd  | esPercent | s3Percent | health_issues
      ${'no issue when every measure is within its limit'}  | ${99.99}  | ${80}     | ${12}     | ${[]}
      ${'no issue for an availability shown at the target'} | ${99.975} | ${10}     | ${10}     | ${[]}
      ${'the availability under the SLA target'}            | ${99.97}  | ${10}     | ${10}     | ${[SaasPlatformHealthIssue.Availability]}
      ${'the database above 80 % of its capacity'}          | ${99.99}  | ${80.5}   | ${10}     | ${[SaasPlatformHealthIssue.Database]}
      ${'the file storage above 80 % of its capacity'}      | ${99.99}  | ${10}     | ${93}     | ${[SaasPlatformHealthIssue.FileStorage]}
      ${'every issue, the missed SLA first'}                | ${95}     | ${90}     | ${93}     | ${[SaasPlatformHealthIssue.Availability, SaasPlatformHealthIssue.Database, SaasPlatformHealthIssue.FileStorage]}
    `(
      'should return $case',
      async ({ sla_cmtd, esPercent, s3Percent, health_issues }) => {
        // Given
        mockSaasManagerBody(
          page([
            {
              id: platform.id,
              sla_cmtd,
              storage: {
                es_used_size: storageUsage(esPercent),
                s3_used_size: storageUsage(s3Percent),
              },
            },
          ])
        );

        // When
        const result =
          await ProductInformationHelper.loadSaasPlatforms(pagination);

        // Then
        expect(platformsOf(result)[0]?.health_issues).toEqual(health_issues);
      }
    );

    it.each`
      case                                                     | storage                                                                     | health_issues
      ${'the PostgreSQL usage when Elasticsearch is not sent'} | ${{ postgres_used_size: storageUsage(95) }}                                 | ${[SaasPlatformHealthIssue.Database]}
      ${'the Elasticsearch usage when PostgreSQL is not sent'} | ${{ es_used_size: storageUsage(95) }}                                       | ${[SaasPlatformHealthIssue.Database]}
      ${'the PostgreSQL usage over the Elasticsearch one'}     | ${{ es_used_size: storageUsage(95), postgres_used_size: storageUsage(10) }} | ${[]}
    `(
      'should rate the database with $case',
      async ({ storage, health_issues }) => {
        // Given
        mockSaasManagerBody(
          page([{ id: platform.id, sla_cmtd: 99.99, storage }])
        );

        // When
        const result =
          await ProductInformationHelper.loadSaasPlatforms(pagination);

        // Then
        expect(platformsOf(result)[0]?.health_issues).toEqual(health_issues);
      }
    );

    it('should rate the storage of a platform without availability', async () => {
      // Given
      mockSaasManagerBody(
        page([
          {
            id: platform.id,
            storage: { es_used_size: storageUsage(95) },
          },
        ])
      );

      // When
      const result =
        await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(platformsOf(result)[0]).toMatchObject({
        sla_cmtd: null,
        health_issues: [SaasPlatformHealthIssue.Database],
      });
    });

    it('should return the availability as a ratio', async () => {
      // Given
      mockSaasManagerBody(page([{ id: platform.id, sla_cmtd: 99.95 }]));

      // When
      const result =
        await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(platformsOf(result)[0]?.sla_cmtd).toBe(0.9995);
    });

    it('should log one error with the oldest date when the SaaS Manager pushed listed platforms more than 12 hours ago', async () => {
      // Given
      mockSaasManagerBody(
        page([platform, platform, platform], 26, [
          new Date('2026-10-28T00:00:00.000Z'),
          new Date('2026-10-27T23:59:59.999Z'),
          new Date('2026-10-20T12:00:00.000Z'),
        ])
      );
      const errorSpy = vi.spyOn(logApp, 'error');

      // When
      await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
        'The SaaS Manager has stopped pushing listed platforms',
        { stale: 2, oldestGeneratedAt: '2026-10-20T12:00:00.000Z' }
      );
    });

    it('should not log an error when the SaaS Manager pushed every listed platform within 12 hours', async () => {
      // Given
      mockSaasManagerBody(
        page([platform, platform], 26, [
          new Date('2026-10-28T00:00:00.000Z'),
          new Date('2026-10-28T12:00:00.000Z'),
        ])
      );
      const errorSpy = vi.spyOn(logApp, 'error');

      // When
      await ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should let a failed read through', async () => {
      // Given
      vi.spyOn(
        SaasManagerInstanceDomain,
        'loadInServiceInstances'
      ).mockRejectedValue(new Error('connection refused'));

      // When
      const result = ProductInformationHelper.loadSaasPlatforms(pagination);

      // Then
      await expect(result).rejects.toThrow('connection refused');
    });
  });
});
