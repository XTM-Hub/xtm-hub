import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  SERVICES,
} from '../../../tests/tests.const';
import {
  NewsFeedRedirectInput,
  NewsFeedUtmContent,
  OneClickDeployInput,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { DocumentId } from '../../model/kanel/public/Document';
import { UserId } from '../../model/kanel/public/User';
import { logApp } from '../../utils/app-logger.util';
import { TelemetryApp } from './telemetry.app';
import {
  TelemetryEventService,
  TelemetryTargetProduct,
} from './telemetry.const';
import telemetryResolver from './telemetry.resolver';
import { TelemetryEventType } from './telemetry.types';

const buildInput = (): OneClickDeployInput => ({
  service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
  platform_service_instance_id: SERVICES.INSTANCES.EPIC.ID,
  resource_id: 'resource-1',
  resource_title: 'My Resource',
  platform_identifier: PlatformIdentifier.Opencti,
});

describe('send telemetry event GraphQL mutation', () => {
  it('should return empty object as placeholder', () => {
    // Given / When
    const result = telemetryResolver.Mutation!.sendTelemetryEvent!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toMatchObject({});
  });
});

describe('one click deploy GraphQL mutation', () => {
  it('should call TelemetryApp.sendOneClickDeployEvent and return result true on success', async () => {
    // Given
    const input = buildInput();
    vi.spyOn(TelemetryApp, 'sendOneClickDeployEvent').mockResolvedValue(
      undefined
    );

    // When
    const result = await telemetryResolver.SendTelemetryMutation!
      .oneClickDeploy!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(TelemetryApp.sendOneClickDeployEvent).toHaveBeenCalledWith({
      userId: contextSimpleUserFiligran2.user.id as UserId,
      input,
    });
    expect(result).toMatchObject({ result: true });
  });

  it('should call logApp.error and return result false with message on error', async () => {
    // Given
    const errorMessage = 'Telemetry service unavailable';
    const input = buildInput();
    vi.spyOn(TelemetryApp, 'sendOneClickDeployEvent').mockRejectedValue(
      new Error(errorMessage)
    );
    vi.spyOn(logApp, 'error').mockImplementation(() => undefined);

    // When
    const result = await telemetryResolver.SendTelemetryMutation!
      .oneClickDeploy!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(logApp.error).toHaveBeenCalledWith(
      'Error in sendTelemetryEvent resolver',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(result).toMatchObject({ result: false, message: errorMessage });
  });

  it('should return default message when error has no message', async () => {
    // Given
    const input = buildInput();
    const errorWithNoMessage = new Error();
    errorWithNoMessage.message = '';
    vi.spyOn(TelemetryApp, 'sendOneClickDeployEvent').mockRejectedValue(
      errorWithNoMessage
    );
    vi.spyOn(logApp, 'error').mockImplementation(() => undefined);

    // When
    const result = await telemetryResolver.SendTelemetryMutation!
      .oneClickDeploy!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toMatchObject({
      result: false,
      message: 'An error occurred while processing sendTelemetryEvent',
    });
  });
});

describe('news feed redirect GraphQL mutation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const RESOURCE_ID = '3e7f1a9c-2b4d-4c8e-a6f1-7d9b2e5c1a08' as DocumentId;
  const PLATFORM_ID = '9b0c7a3e-1111-4a9e-8d6f-0d4f5a7c9e10';

  const buildNewsFeedRedirectInput = (): NewsFeedRedirectInput => ({
    service_identifier: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
    resource_id: RESOURCE_ID,
    platform_id: PLATFORM_ID,
    platform_identifier: PlatformIdentifier.Opencti,
    utm_content: NewsFeedUtmContent.CustomDashboard,
  });

  const callNewsFeedRedirect = (input: NewsFeedRedirectInput) =>
    telemetryResolver.SendTelemetryMutation!.newsFeedRedirect!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

  it('should send the news_feed_redirect event of the logged in user and return result true', async () => {
    // Given
    const sendTelemetryEvent = vi
      .spyOn(TelemetryApp, 'sendTelemetryEvent')
      .mockResolvedValue(undefined);

    // When
    const result = await callNewsFeedRedirect(buildNewsFeedRedirectInput());

    // Then
    expect(result).toMatchObject({ result: true });
    expect(sendTelemetryEvent).toHaveBeenCalledOnce();
    expect(sendTelemetryEvent.mock.calls[0]![0]).toMatchObject({
      event_type: TelemetryEventType.NEWS_FEED_REDIRECT,
      service: TelemetryEventService.CUSTOM_DASHBOARDS_LIBRARY,
      resource_id: RESOURCE_ID,
      platform_id: PLATFORM_ID,
      target_product: TelemetryTargetProduct.OPEN_CTI,
      utm_content: 'custom_dashboard',
      user_id: contextSimpleUserFiligran2.user.id,
      organization_id: contextSimpleUserFiligran2.user.selected_organization_id,
    });
  });

  it('should send no event, without logging an error, for a service without telemetry', async () => {
    // Given
    const sendTelemetryEvent = vi
      .spyOn(TelemetryApp, 'sendTelemetryEvent')
      .mockResolvedValue(undefined);
    const logError = vi.spyOn(logApp, 'error');

    // When
    const result = await callNewsFeedRedirect({
      ...buildNewsFeedRedirectInput(),
      service_identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
    });

    // Then
    expect(result).toMatchObject({ result: true });
    expect(sendTelemetryEvent).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });
});
