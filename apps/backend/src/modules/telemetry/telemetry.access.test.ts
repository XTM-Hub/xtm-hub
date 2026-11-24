import type { GraphQLType } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES } from '../../../tests/tests.const';
import {
  NewsFeedRedirectInput,
  NewsFeedUtmContent,
  OneClickDeployInput,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { DocumentId } from '../../model/kanel/public/Document';
import { UnauthenticatedErrorCode } from '../../utils/error/error.code';
import { TelemetryApp } from './telemetry.app';

const NAMESPACE_TYPE = 'SendTelemetryMutation';

// Not isObjectType() & co: the schema comes from another copy of graphql, which fails their instanceof check
const namedTypeName = (type: GraphQLType): string =>
  'ofType' in type ? namedTypeName(type.ofType) : type.name;

const LOGGED_IN = {
  anonymous: UnauthenticatedErrorCode.Unauthenticated,
  user: 'allowed',
  admin: 'allowed',
} as const;

const RESOURCE_ID = '3e7f1a9c-2b4d-4c8e-a6f1-7d9b2e5c1a08' as DocumentId;

const ONE_CLICK_DEPLOY_INPUT: OneClickDeployInput = {
  service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
  platform_service_instance_id: SERVICES.INSTANCES.EPIC.ID,
  resource_id: RESOURCE_ID,
  resource_title: 'My Resource',
  platform_identifier: PlatformIdentifier.Opencti,
};

const NEWS_FEED_REDIRECT_INPUT: NewsFeedRedirectInput = {
  service_identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
  resource_id: RESOURCE_ID,
  platform_identifier: PlatformIdentifier.Opencti,
  utm_content: NewsFeedUtmContent.CustomDashboard,
};

describe('reachability of the SendTelemetryMutation namespace', () => {
  it('should be reachable only through sendTelemetryEvent when scanning every field, union and interface', async () => {
    // Given the real schema
    const { default: createSchema } =
      await import('../../server/graphql-schema');
    const types = Object.values(createSchema().getTypeMap());

    // When
    const paths = types.flatMap((type) => {
      if ('getTypes' in type) {
        return type.getTypes().some(({ name }) => name === NAMESPACE_TYPE)
          ? [`union:${type.name}`]
          : [];
      }
      if (!('getFields' in type)) {
        return [];
      }
      const interfaces =
        type.name === NAMESPACE_TYPE && 'getInterfaces' in type
          ? type.getInterfaces().map(({ name }) => `implements:${name}`)
          : [];
      const fields = Object.values(type.getFields())
        .filter((field) => namedTypeName(field.type) === NAMESPACE_TYPE)
        .map((field) => `${type.name}.${field.name}`);
      return [...interfaces, ...fields];
    });

    // Then
    expect(paths).toEqual(['Mutation.sendTelemetryEvent']);
  });
});

describe('sendTelemetryEvent oneClickDeploy mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: OneClickDeployInput!) {
      sendTelemetryEvent { oneClickDeploy(input: $input) { result } }
    }`,
    // Mocked: it reads the user from the request context, not from the row
    guarded: () =>
      vi
        .spyOn(TelemetryApp, 'sendOneClickDeployEvent')
        .mockResolvedValue(undefined),
    expected: LOGGED_IN,
    prepare: () =>
      Promise.resolve({
        variables: { input: ONE_CLICK_DEPLOY_INPUT },
        expectedData: {
          sendTelemetryEvent: { oneClickDeploy: { result: true } },
        },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('sendTelemetryEvent newsFeedRedirect mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: NewsFeedRedirectInput!) {
      sendTelemetryEvent { newsFeedRedirect(input: $input) { result } }
    }`,
    // Mocked: it writes the event to Elasticsearch
    guarded: () =>
      vi
        .spyOn(TelemetryApp, 'sendResourceNewsFeedRedirectEvent')
        .mockResolvedValue(undefined),
    expected: LOGGED_IN,
    prepare: () =>
      Promise.resolve({
        variables: { input: NEWS_FEED_REDIRECT_INPUT },
        expectedData: {
          sendTelemetryEvent: { newsFeedRedirect: { result: true } },
        },
        cleanup: () => Promise.resolve(),
      }),
  });
});
