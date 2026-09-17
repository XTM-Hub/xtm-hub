import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { glob } from 'glob';
import fs from 'node:fs';
import competitorResolver from '../modules/deployment/competitor/competitor.resolver';
import deploymentResolver from '../modules/deployment/deployment.resolver';
import serviceGroupResolver from '../modules/deployment/group/service-group.resolver';
import vaultResolver from '../modules/document/document.resolver';
import facetResolver from '../modules/document/facet/facet.resolver';
import featureVotingResolver from '../modules/feature-voting/feature-voting.resolver';
import logResolver from '../modules/log/log.resolver';
import manageProductVersionResolver from '../modules/manage-product-version/manage-product-version.resolver';
import newsFeedResolver from '../modules/news-feed/news-feed.resolver';
import organizationResolver from '../modules/organization-management/organization/organization.resolver';
import userResolver from '../modules/organization-management/user/user.resolver';
import registrationResolver from '../modules/registration/registration.resolver';
import serviceCapabilityResolver from '../modules/security-management/service-capability/service-capability.resolver';
import subscriptionCapabilityResolver from '../modules/security-management/subscription-capability/subscription-capability.resolver';
import userServiceCapabilityResolver from '../modules/security-management/user-service-capability/user-service-capability.resolver';
import ServiceDefinitionResolver from '../modules/service/definition/service-definition.resolver';
import seoServiceInstanceResolver from '../modules/service/instance/seo-service-instance/seo-service-instance.resolver';
import ServiceInstanceResolver from '../modules/service/instance/service-instance.resolver';
import settingsResolver from '../modules/settings/settings.resolver';
import manifestFragmentResolver from '../modules/shareable-resource/manifest-fragment/manifest-fragment.resolver';
import manifestResolver from '../modules/shareable-resource/manifest/manifest.resolver';
import openAEVScenariosResolver from '../modules/shareable-resource/openaev/scenario/scenario.resolver';
import customDashboardsResolver from '../modules/shareable-resource/opencti/custom-dashboard/custom-dashboard.resolver';
import customViewsResolver from '../modules/shareable-resource/opencti/custom-view/custom-view.resolver';
import ingestManifestResolver from '../modules/shareable-resource/opencti/integration/ingest-manifest/ingest-manifest.resolver';
import integrationsResolver from '../modules/shareable-resource/opencti/integration/integration.resolver';
import openCTIPlaybooksResolver from '../modules/shareable-resource/opencti/playbook/playbook.resolver';
import solutionCategoryResolver from '../modules/solution-category/solution-category.resolver';
import subscriptionsResolver from '../modules/subscription/subscription.resolver';
import telemetryResolver from '../modules/telemetry/telemetry.resolver';
import useCaseResolver from '../modules/use-case/use-case.resolver';
import userServiceResolver from '../modules/user-service/user-service.resolver';
import xtmPlatformRoadmapResolver from '../modules/xtm-platform-roadmap/epic.resolver';
import nodesResolver from '../nodes/nodes.resolver';
import { authDirectiveTransformer } from '../security/directive-graphql/directive-auth';

const getGlobContent = async (pattern: string) => {
  const globFiles = await glob(pattern);
  return globFiles.sort().map((t) => fs.readFileSync(t, 'utf-8'));
};

const typeDefFiles = await getGlobContent('src/**/*.graphql');
const typeDefs = mergeTypeDefs(typeDefFiles);

const resolvers = mergeResolvers([
  seoServiceInstanceResolver,
  solutionCategoryResolver,
  nodesResolver,
  ServiceInstanceResolver,
  ServiceDefinitionResolver,
  organizationResolver,
  userResolver,
  settingsResolver,
  vaultResolver,
  subscriptionsResolver,
  subscriptionCapabilityResolver,
  userServiceCapabilityResolver,
  serviceCapabilityResolver,
  userServiceResolver,
  logResolver,
  useCaseResolver,
  customDashboardsResolver,
  facetResolver,
  customViewsResolver,
  openAEVScenariosResolver,
  openCTIPlaybooksResolver,
  registrationResolver,
  telemetryResolver,
  deploymentResolver,
  ingestManifestResolver,
  integrationsResolver,
  serviceGroupResolver,
  competitorResolver,
  xtmPlatformRoadmapResolver,
  newsFeedResolver,
  manifestResolver,
  manifestFragmentResolver,
  manageProductVersionResolver,
  featureVotingResolver,
]);

const createSchema = () => {
  const graphQLSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
    inheritResolversFromInterfaces: true,
  });
  return authDirectiveTransformer(graphQLSchema);
};

export default createSchema;
