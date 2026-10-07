import { v4 as uuidv4 } from 'uuid';
import {
  CreateEpicInput,
  EpicConnection,
  EpicCountPerTimeline,
  EpicType,
  QueryEpicsArgs,
  ServiceDefinitionIdentifier,
  ServiceRestriction,
  UpdateEpicInput,
} from '../../__generated__/resolvers-types';
import portalConfig from '../../config';
import { requestContext } from '../../context/request.context';
import Epic, { EpicId } from '../../model/kanel/public/Epic';
import { isUserAdminPlatform } from '../../security/access';
import { assertUserHasCapaOnService } from '../../security/guard';
import { buildServiceLink, sendMail } from '../../server/mail-service';
import { logApp } from '../../utils/app-logger.util';
import { NotFoundErrorCode } from '../../utils/error/error.code';
import { isRoadmapReminderDay } from '../../utils/roadmap-reminder.util';
import { applyUpdate, stripNulls } from '../../utils/typescript';
import { UserServiceCapabilityHelper } from '../security-management/user-service-capability/user-service-capability.helper';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { EpicDomain } from './epic.domain';

const PLATFORM_ROADMAP_SLUG = 'xtm-platform-roadmap';

const normalizeSlackLink = <T extends { slack_link?: string | null }>(
  input: T
): T => (input.slack_link === '' ? { ...input, slack_link: null } : input);

// Draft epics are only visible to platform admins and to users who can edit the roadmap.
const canViewInactiveEpics = async (): Promise<boolean> => {
  const user = requestContext.get()?.user;
  if (!user) {
    return false;
  }
  if (isUserAdminPlatform(user)) {
    return true;
  }
  const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy({
    slug: PLATFORM_ROADMAP_SLUG,
  });
  if (!serviceInstance) {
    return false;
  }
  const capabilities = await UserServiceCapabilityHelper.loadCapabilities(
    serviceInstance.id,
    user.id,
    user.selected_organization_id
  );
  return capabilities?.includes(ServiceRestriction.Upsert) ?? false;
};

export const EpicApp = {
  loadEpics: async (opts: Partial<QueryEpicsArgs>): Promise<EpicConnection> => {
    return EpicDomain.loadEpics(opts, {
      includeInactive: await canViewInactiveEpics(),
    });
  },
  countEpicsPerTimeline: async (): Promise<EpicCountPerTimeline[]> => {
    return EpicDomain.countEpicsPerTimeline();
  },
  createEpic: async (input: CreateEpicInput): Promise<Epic> => {
    const user = requestContext.requireUser();

    const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy({
      slug: PLATFORM_ROADMAP_SLUG,
    });
    if (!serviceInstance) {
      throw new Error(NotFoundErrorCode.ServiceInstanceNotFound);
    }

    await assertUserHasCapaOnService(user, serviceInstance.id, [
      ServiceRestriction.Upsert,
    ]);

    const { is_integration, ...restInput } = input;
    const epicData: Partial<Epic> = {
      ...stripNulls(normalizeSlackLink(restInput)),
      id: uuidv4() as EpicId,
      uploader_id: user.id,
      created_at: new Date(),
      epic_type: is_integration ? EpicType.Integration : EpicType.Other,
    };
    return EpicDomain.createEpic(epicData);
  },
  updateEpic: async (id: EpicId, input: UpdateEpicInput) => {
    const user = requestContext.requireUser();

    const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy({
      slug: PLATFORM_ROADMAP_SLUG,
    });
    if (!serviceInstance) {
      throw new Error(NotFoundErrorCode.ServiceInstanceNotFound);
    }
    await assertUserHasCapaOnService(user, serviceInstance.id, [
      ServiceRestriction.Upsert,
    ]);

    const { is_integration, ...restInput } = input;

    const epicData: Partial<Epic> = {
      ...applyUpdate(normalizeSlackLink(restInput), ['slack_link']),
      updater_id: user.id,
      updated_at: new Date(),
      epic_type: is_integration ? EpicType.Integration : EpicType.Other,
    };
    return EpicDomain.updateEpic(id, epicData);
  },

  deleteEpic: async (id: EpicId) => {
    const user = requestContext.requireUser();

    const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy({
      slug: PLATFORM_ROADMAP_SLUG,
    });
    if (!serviceInstance) {
      throw new Error(NotFoundErrorCode.ServiceInstanceNotFound);
    }
    await assertUserHasCapaOnService(user, serviceInstance.id, [
      ServiceRestriction.Delete,
    ]);

    const [epic] = await EpicDomain.loadEpicsBy({ id: id });
    await EpicDomain.deleteEpicBy({ id });
    return epic;
  },

  sendPublicRoadmapMonthlyReminder: async (): Promise<void> => {
    if (!portalConfig.enabled_emails.public_roadmap_monthly_reminder) {
      logApp.info(
        'Public roadmap monthly reminder email is disabled, skipping'
      );
      return;
    }
    if (!isRoadmapReminderDay(new Date())) {
      return;
    }
    const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy({
      slug: PLATFORM_ROADMAP_SLUG,
    });
    if (!serviceInstance) {
      logApp.error(
        'Public roadmap service instance not found, skipping monthly reminder'
      );
      return;
    }
    const roadmapLink = buildServiceLink({
      serviceDefinitionIdentifier:
        ServiceDefinitionIdentifier.XtmPlatformRoadmap,
      serviceInstanceId: serviceInstance.id,
    });
    await sendMail({
      to: 'product-managers@filigran.io',
      template: 'public_roadmap_monthly_reminder',
      params: { roadmapLink },
    });
  },
};
