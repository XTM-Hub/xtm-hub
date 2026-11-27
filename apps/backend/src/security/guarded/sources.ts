import { CallerOf } from './guard.types';

// Where a guard reads the id it checks. By default an anonymous caller never reaches a source: the guard denies it first
export type Source<Args, Id, Caller = CallerOf<'user'>> = (
  caller: Caller,
  args: Args
) => Id | undefined;

// A source that reads a record: the guard awaits it
export type AsyncSource<Args, Id> = (
  caller: CallerOf<'user'>,
  args: Args
) => Promise<Id | undefined>;

// Reads no caller, so it fits a Source whatever its caller
export const fromArg =
  <Args, Key extends keyof Args>(key: Key): Source<Args, Args[Key], unknown> =>
  (_caller, args) =>
    args[key];

// Memoised per arguments object, so the guards of one call share one load
export const fromRecord = <Args extends object, Loaded>(
  load: (args: Args) => Promise<Loaded | undefined>
) => {
  const byArgs = new WeakMap<Args, Promise<Loaded | undefined>>();
  const loadOnce = (args: Args): Promise<Loaded | undefined> => {
    const known = byArgs.get(args);
    if (known) {
      return known;
    }
    const pending = load(args);
    byArgs.set(args, pending);
    return pending;
  };
  return {
    pick:
      <Id>(select: (loaded: Loaded) => Id): AsyncSource<Args, Id> =>
      async (_caller, args) => {
        const loaded = await loadOnce(args);
        return loaded ? select(loaded) : undefined;
      },
  };
};
