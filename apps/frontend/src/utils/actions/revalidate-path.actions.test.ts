import { revalidatePath } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';
import revalidatePathActions from './revalidate-path.actions';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const SERVICE_PATH = '/app/service/opencti_integrations/instance-id';
const PUBLIC_PATH = '/cybersecurity-solutions/opencti-integrations';

describe('revalidatePathActions', () => {
  it.each([
    ['several paths are given', [SERVICE_PATH, PUBLIC_PATH]],
    ['a single path is given', [SERVICE_PATH]],
    ['no path is given', []],
  ])('should revalidate every given path when %s', async (_context, paths) => {
    // Given / When
    await revalidatePathActions(paths);

    // Then
    expect(vi.mocked(revalidatePath).mock.calls).toEqual(
      paths.map((path) => [path])
    );
  });
});
