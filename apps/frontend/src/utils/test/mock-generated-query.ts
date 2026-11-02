import type * as Generated from '@graphql/generated';

type GeneratedModule = typeof Generated;

type GeneratedQueryHookName = {
  [Name in keyof GeneratedModule]: GeneratedModule[Name] extends {
    getKey: unknown;
    getRootKey: unknown;
  }
    ? Name
    : never;
}[keyof GeneratedModule];

type QueryHookMock = (...args: never[]) => unknown;

/**
 * Builds the `@graphql/generated` module of a `vi.mock` factory with the given
 * query hooks replaced by mocks. Each mock keeps the real `getKey` and
 * `getRootKey`, which the keys files and the invalidations read.
 *
 *   vi.mock('@graphql/generated', async (importOriginal) => {
 *     const { mockGeneratedQueryHooks } = await import('@/utils/test/mock-generated-query');
 *     return mockGeneratedQueryHooks(importOriginal, {
 *       useOrganizationsListQuery: mocks.useOrganizationsListQuery,
 *     });
 *   });
 *
 * The helper is imported inside the factory because `vi.mock` is hoisted above
 * the file imports.
 */
export const mockGeneratedQueryHooks = async (
  importOriginal: <T>() => Promise<T>,
  hooks: Partial<Record<GeneratedQueryHookName, QueryHookMock>>
): Promise<GeneratedModule> => {
  const actual = await importOriginal<GeneratedModule>();
  const mockedHooks = Object.fromEntries(
    Object.entries(hooks).map(([name, hookMock]) => {
      const { getKey, getRootKey } = actual[name as GeneratedQueryHookName];
      return [name, Object.assign(hookMock, { getKey, getRootKey })];
    })
  );
  return { ...actual, ...mockedHooks };
};
