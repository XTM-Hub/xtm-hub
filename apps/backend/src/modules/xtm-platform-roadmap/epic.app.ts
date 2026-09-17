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
import User from '../../model/kanel/public/User';
import { assertUserHasCapaOnService } from '../../security/guard';
import { buildServiceLink, sendMail } from '../../server/mail-service';
import { MinIOClient } from '../../thirdparty/minio/client';
import { logApp } from '../../utils/app-logger.util';
import {
  NotFoundErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';
import { isRoadmapReminderDay } from '../../utils/roadmap-reminder.util';
import { applyUpdate, stripNulls } from '../../utils/typescript';
import {
  DocumentUploadsHelper,
  Upload,
} from '../document/document.uploads.helper';
import { DocumentDomain } from '../document/domain/document.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { EpicDomain } from './epic.domain';

const addImage = async (user: User, uploads: Upload[]) => {
  if (!uploads || uploads.length === 0) {
    return undefined;
  }
  const [serviceInstance] =
    await ServiceInstanceDomain.loadSubscribedServiceInstancesByIdentifier(
      user.id,
      ServiceDefinitionIdentifier.XtmPlatformRoadmap
    );
  if (serviceInstance) {
    const files = await DocumentUploadsHelper.processUploads(
      uploads,
      serviceInstance.service_instance_id
    );
    const imageFile = files[0];
    if (!imageFile) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    return DocumentDomain.createDocument(
      {
        service_instance_id: serviceInstance.service_instance_id,
        description: 'Epic illustration',
        file_name: imageFile.fileName,
        minio_name: imageFile.minioName,
        active: true,
        mime_type: imageFile.mimeType,
        type: 'image',
        source_type: 'internal',
      },
      []
    );
  }
  return undefined;
};

const PLATFORM_ROADMAP_SLUG = 'xtm-platform-roadmap';

const normalizeSlackLink = <T extends { slack_link?: string | null }>(
  input: T
): T => (input.slack_link === '' ? { ...input, slack_link: null } : input);

export const EpicApp = {
  loadEpics: async (opts: Partial<QueryEpicsArgs>): Promise<EpicConnection> => {
    return EpicDomain.loadEpics(opts);
  },
  countEpicsPerTimeline: async (): Promise<EpicCountPerTimeline[]> => {
    return EpicDomain.countEpicsPerTimeline();
  },
  createEpic: async (
    input: CreateEpicInput,
    uploads: Upload[]
  ): Promise<Epic> => {
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
    const createdDocument = await addImage(user, uploads);

    const epicData: Partial<Epic> = {
      ...stripNulls(normalizeSlackLink(restInput)),
      id: uuidv4() as EpicId,
      uploader_id: user.id,
      created_at: new Date(),
      epic_type: is_integration ? EpicType.Integration : EpicType.Other,
      document_id: createdDocument?.id,
    };
    return EpicDomain.createEpic(epicData);
  },
  updateEpic: async (id: EpicId, input: UpdateEpicInput, uploads: Upload[]) => {
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

    const createdDocument = await addImage(user, uploads);

    let oldEpic: Epic | undefined;
    if (createdDocument?.id) {
      const [loadedOldEpic] = await EpicDomain.loadEpicsBy({ id });
      oldEpic = loadedOldEpic;
    }
    const epicData: Partial<Epic> = {
      ...applyUpdate(normalizeSlackLink(restInput), ['slack_link']),
      updater_id: user.id,
      updated_at: new Date(),
      epic_type: is_integration ? EpicType.Integration : EpicType.Other,
      ...(createdDocument && { document_id: createdDocument.id }),
    };
    const updatedEpic = await EpicDomain.updateEpic(id, epicData);
    if (
      oldEpic &&
      oldEpic.document_id &&
      createdDocument?.id !== oldEpic.document_id
    ) {
      // Remove old document from MinIO and DB
      const document = await DocumentDomain.loadDocumentBy({
        id: oldEpic.document_id,
      });
      if (document && document.minio_name) {
        await MinIOClient.deleteFile(document.minio_name);
      }

      await DocumentDomain.deleteDocuments([oldEpic.document_id]);
    }
    return updatedEpic;
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
    if (epic && epic.document_id) {
      const document = await DocumentDomain.loadDocumentBy({
        id: epic.document_id,
      });
      if (document && document.minio_name) {
        await MinIOClient.deleteFile(document.minio_name);
      }
      await DocumentDomain.deleteDocuments([epic.document_id]);
    }
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
