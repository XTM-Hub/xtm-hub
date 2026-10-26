import { describe, expect, it } from 'vitest';
import { applyUpdate, isRecord, mapWithConcurrency } from './typescript';

describe('isRecord', () => {
  it.each`
    case                 | input
    ${'an empty object'} | ${{}}
    ${'an object'}       | ${{ key: 'value' }}
  `('should return true for $case', ({ input }) => {
    expect(isRecord(input)).toBe(true);
  });

  it.each`
    case           | input
    ${'null'}      | ${null}
    ${'undefined'} | ${undefined}
    ${'an array'}  | ${[{ key: 'value' }]}
    ${'a string'}  | ${'value'}
    ${'a number'}  | ${1}
  `('should return false for $case', ({ input }) => {
    expect(isRecord(input)).toBe(false);
  });
});

describe('mapWithConcurrency', () => {
  it('returns an empty array when given an empty list', async () => {
    const result = await mapWithConcurrency<number, number>(
      [],
      5,
      async (item) => item * 2
    );
    expect(result).toEqual([]);
  });

  it('maps every item and preserves input order regardless of completion order', async () => {
    const items = [1, 2, 3, 4, 5];
    // Reverse-order resolution: earlier items resolve later than later ones.
    const delays = [40, 30, 20, 10, 0];

    const result = await mapWithConcurrency(items, 5, (item) => {
      const index = items.indexOf(item);
      return new Promise<number>((resolve) => {
        setTimeout(() => resolve(item * 10), delays[index]);
      });
    });

    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it('never runs more than `concurrency` mappers at the same time', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;

    await mapWithConcurrency(items, 3, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return item;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('treats a concurrency of 0 or a negative number as 1 (fully sequential)', async () => {
    const items = [1, 2, 3];
    const callOrder: number[] = [];

    const result = await mapWithConcurrency(items, 0, async (item) => {
      callOrder.push(item);
      return item;
    });

    expect(result).toEqual([1, 2, 3]);
    expect(callOrder).toEqual([1, 2, 3]);
  });

  it('rejects if any mapper call rejects, like Promise.all', async () => {
    const items = [1, 2, 3];

    await expect(
      mapWithConcurrency(items, 2, async (item) => {
        if (item === 2) {
          throw new Error('boom');
        }
        return item;
      })
    ).rejects.toThrow('boom');
  });
});

describe('applyUpdate', () => {
  it('should drop a null sent for a field that cannot be cleared', () => {
    const fields = applyUpdate({ name: null, description: 'kept' }, [
      'description',
    ]);

    expect(fields).toEqual({ description: 'kept' });
  });

  it('should keep a null sent for a clearable field', () => {
    const fields = applyUpdate({ description: null }, ['description']);

    expect(fields).toEqual({ description: null });
  });

  // Omitting a field and clearing it are two different intents.
  it('should leave an omitted clearable field untouched', () => {
    const fields = applyUpdate(
      { name: 'kept' } as {
        name: string;
        description?: string | null;
      },
      ['description']
    );

    expect('description' in fields).toBe(false);
  });

  it('should keep the falsy values that are not null', () => {
    const fields = applyUpdate({ position: 0, active: false, labels: [] }, []);

    expect(fields).toEqual({ position: 0, active: false, labels: [] });
  });
});
