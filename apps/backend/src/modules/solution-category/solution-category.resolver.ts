import {
  MutationResolvers,
  PortalCapability,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import {
  SolutionCategoryId,
  SolutionCategoryMutator,
} from '../../model/kanel/public/SolutionCategory';
import { Guarded, Public } from '../../security/guarded/guarded.decorator';
import { portalCapabilityGuard } from '../../security/guarded/guards/portal.guard';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { solutionCategoryApp } from './solution-category.app';
import { solutionCategoryDomain } from './solution-category.domain';

class SolutionCategoryQueries {
  @Public()
  static readonly solutionCategories: NonNullable<
    QueryResolvers['solutionCategories']
  > = (_, opts) => solutionCategoryDomain.loadSolutionCategories(opts);
}

class SolutionCategoryMutations {
  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
  static readonly addSolutionCategory: NonNullable<
    MutationResolvers['addSolutionCategory']
  > = (_, { input }) =>
    solutionCategoryDomain.insertSolutionCategory({
      ...input,
      product: input.product ?? [],
    });

  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
  static readonly editSolutionCategory: NonNullable<
    MutationResolvers['editSolutionCategory']
  > = (_, { id, input }) =>
    solutionCategoryApp.editSolutionCategoryById(
      id as SolutionCategoryId,
      input
    );

  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
  static readonly deleteSolutionCategory: NonNullable<
    MutationResolvers['deleteSolutionCategory']
  > = (_, { id }) =>
    solutionCategoryApp.deleteSolutionCategoryBy({
      id,
    } as SolutionCategoryMutator);
}

const resolvers: Resolvers = {
  SolutionCategoryId:
    createRelayIdScalar<SolutionCategoryId>('SolutionCategory'),

  Query: { ...SolutionCategoryQueries },
  Mutation: { ...SolutionCategoryMutations },
};

export default resolvers;
