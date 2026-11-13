// Compile-time checks, only run by `yarn check-ts` (tests are excluded from tsc).
// Each @ts-expect-error fails tsc if the line below it stops being an error.
import {
  MutationResolvers,
  PortalCapability,
  QueryResolvers,
} from '../../__generated__/resolvers-types';
import { Guarded, Public } from './guarded.decorator';
import { portalCapabilityGuard } from './guards/portal.guard';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GuardedTypeChecks {
  @Public()
  static readonly query: NonNullable<QueryResolvers['solutionCategories']> = (
    _parent,
    args
  ) => {
    // @ts-expect-error the generated args type is kept: first is a number
    const first: string = args.first;
    return first ? null : null;
  };

  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
  static readonly mutation: NonNullable<
    MutationResolvers['deleteSolutionCategory']
  > = (_parent, { id }) => {
    // @ts-expect-error the generated args type is kept: id is a string
    const wrong: number = id;
    return wrong as never;
  };

  // @ts-expect-error a guard needs at least one capability
  @Guarded(portalCapabilityGuard([]))
  static readonly emptyCapabilities: NonNullable<
    MutationResolvers['deleteSolutionCategory']
  > = () => {
    throw new Error('never called');
  };

  // @ts-expect-error only a resolver function can be decorated
  @Public()
  static readonly notAResolver = 42;
}
