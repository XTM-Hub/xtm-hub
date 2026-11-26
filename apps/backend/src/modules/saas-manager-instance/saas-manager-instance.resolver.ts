import {
  MutationResolvers,
  PortalCapability,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { Guarded } from '../../security/guarded/guarded.decorator';
import { systemCallerGuard } from '../../security/guarded/guards/caller.guard';
import { SaasManagerInstanceApp } from './saas-manager-instance.app';

// SaaS Manager pushes its instances with the system token. A capability of their own, not MANAGE_DEPLOYMENT: once the
// system tokens are scoped, only the token of SaaS Manager may overwrite or purge them.
class SaasManagerInstanceMutations {
  @Guarded(systemCallerGuard([PortalCapability.ManageSaasManagerInstances]))
  static readonly upsertSaasManagerInstances: NonNullable<
    MutationResolvers['upsertSaasManagerInstances']
  > = (_, { generatedAt, instances }) =>
    SaasManagerInstanceApp.upsertInstances({ generatedAt, instances });

  @Guarded(systemCallerGuard([PortalCapability.ManageSaasManagerInstances]))
  static readonly purgeSaasManagerInstances: NonNullable<
    MutationResolvers['purgeSaasManagerInstances']
  > = (_, { before }) => SaasManagerInstanceApp.purgeInstances({ before });
}

const resolvers: Resolvers = {
  Mutation: { ...SaasManagerInstanceMutations },
};

export default resolvers;
