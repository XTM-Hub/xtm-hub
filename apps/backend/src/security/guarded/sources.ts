import { CallerOf } from './guard.types';

// Where a guard reads the id it checks. An anonymous caller never reaches a source: the guard denies it first
export type Source<Args, Id> = (
  caller: CallerOf<'user'>,
  args: Args
) => Id | undefined;

export const fromArg =
  <Args, Key extends keyof Args>(key: Key): Source<Args, Args[Key]> =>
  (_caller, args) =>
    args[key];
