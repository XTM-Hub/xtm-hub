import config from 'config';
import { EditMeUserInput } from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { UserTransferRequestId } from '../../../../model/kanel/public/UserTransferRequest';
import { UserLoadUserBy } from '../../../../model/user';
import { sendMail } from '../../../../server/mail-service';
import { auth0Client } from '../../../../thirdparty/auth0/client';
import { MinIOClient } from '../../../../thirdparty/minio/client';
import { logApp } from '../../../../utils/app-logger.util';
import { toError } from '../../../../utils/error/error-guard.util';
import {
  ErrorCode,
  UnknownErrorCode,
} from '../../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../../utils/error/error.mapping';
import { ForbiddenAccess } from '../../../../utils/error/error.util';
import { stripNulls } from '../../../../utils/typescript';
import { isValidEmail } from '../../../../utils/verify-email.util';
import { DocumentHelper } from '../../../document/document.helper';
import {
  DocumentUploadsHelper,
  Upload,
} from '../../../document/document.uploads.helper';
import { SubscriptionDomain } from '../../../subscription/subscription.domain';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserTransferRequestDomain } from '../user-transferRequest/user-transfer-request.domain';
import { UserHelper } from '../user.helper';

const deletePicture = async (pictureMinio: string) => {
  try {
    await MinIOClient.deleteFile(pictureMinio);
  } catch (err) {
    logApp.error('Error deleting previous picture from MinIO', { error: err });
  }
};

const uploadPictureToMinIO = async (userId: string, file: Upload['file']) => {
  const fileName = DocumentHelper.normalizeDocumentName(file.filename);
  const minioName = `picture/${DocumentHelper.getDocumentName(fileName)}`;

  await MinIOClient.uploadFile(file, minioName, userId, fileName);

  return minioName;
};

const buildPictureUrl = (userId: string) => {
  const baseUrlFront: string = config.get('base_url_front');
  return `${baseUrlFront}/user/picture/${userId}?t=${Date.now()}`;
};

export const userProfileApp = {
  editMeUser: async (meUser: UserLoadUserBy, input: EditMeUserInput) => {
    const { selected_language, ...rest } = input;
    const sanitized =
      selected_language != null ? { ...rest, selected_language } : rest;
    const updatedUser = await UserDomain.updateUser(meUser.id, sanitized);
    if (!updatedUser) {
      throw new Error(ErrorCode.UserNotFound);
    }

    try {
      await auth0Client.updateUser({
        ...stripNulls(input),
        email: updatedUser.email,
      });
    } catch (err) {
      logApp.error(toError(err));
    }

    return UserHelper.updateAndDispatchUser(meUser.id);
  },
  uploadUserPicture: async (meUser: UserLoadUserBy, document: Upload) => {
    await DocumentUploadsHelper.waitForUploads(document);

    if (meUser.picture_minio) {
      await deletePicture(meUser.picture_minio);
    }

    const minioName = await uploadPictureToMinIO(meUser.id, document.file);
    const pictureUrl = buildPictureUrl(meUser.id);

    await UserDomain.updateUser(meUser.id, {
      picture: pictureUrl,
      picture_minio: minioName,
    });

    return UserHelper.updateAndDispatchUser(meUser.id);
  },
  requestTransferPersonalSpace: async (
    user: UserLoadUserBy,
    newEmail: string
  ) => {
    if (!isValidEmail(newEmail)) {
      throw new Error(ErrorCode.InvalidEmail);
    }
    const existingPersonalSpace = await OrganizationDomain.loadOrganizationBy({
      name: newEmail,
      personal_space: true,
    });
    if (!existingPersonalSpace) {
      logApp.info(
        `The user ${user.id} has requested a transfer to a unknown user: ${newEmail}`
      );
      return; // Best way to hide from the vilain user that the account does not exist. The email will just never be sent.
    }

    const newUser = await OrganizationDomain.loadUserByOrganization(
      existingPersonalSpace.id
    );
    const targetUser = newUser[0];
    if (!targetUser) {
      throw new Error(ErrorCode.UserNotFound);
    }

    const userTransferRequest =
      await UserTransferRequestDomain.insertNewUserTransfer({
        from_user_id: user.id,
        to_user_id: targetUser.id,
      });
    const transferRequest = userTransferRequest[0];
    if (!transferRequest) {
      throw new Error(UnknownErrorCode.TransferMeError);
    }
    await sendMail({
      to: newEmail,
      template: 'request_transfer_personal_space',
      params: {
        recipientName: `${targetUser.first_name} ${targetUser.last_name}`,
        recipientId: targetUser.id,
        previousUserId: user.id,
        previousUserEmail: user.email,
        previousUserName: `${user.first_name} ${user.last_name}`,
        transferRequestId: `${transferRequest.id}`,
      },
    });
  },
  transferPersonalSpace: async (
    transferPersonalSpaceId: UserTransferRequestId
  ) => {
    try {
      const userTransferRequest =
        await UserTransferRequestDomain.loadUserTransfer({
          id: transferPersonalSpaceId,
        });
      if (!userTransferRequest) {
        throw new Error();
      }

      const user = requestContext.requireUser();
      if (userTransferRequest.to_user_id !== user.id) {
        throw ForbiddenAccess(ErrorCode.UserIsNotInOrganization);
      }

      const fromUser = await UserDomain.loadSimpleUserBy({
        id: userTransferRequest.from_user_id,
      });
      const toUser = await UserDomain.loadSimpleUserBy({
        id: userTransferRequest.to_user_id,
      });

      const personalSpaceToTransfer =
        await OrganizationDomain.loadOrganizationBy({
          name: fromUser.email,
          personal_space: true,
        });

      const currentToUserSpace = await OrganizationDomain.loadOrganizationBy({
        name: toUser.email,
        personal_space: true,
      });
      if (
        !fromUser ||
        !toUser ||
        !personalSpaceToTransfer ||
        !currentToUserSpace
      ) {
        throw new Error();
      }

      await SubscriptionDomain.updateSubscriptionBy(
        { organization_id: personalSpaceToTransfer.id },
        { organization_id: currentToUserSpace.id }
      );
    } catch (error) {
      throw mapToGraphQLError(error, UnknownErrorCode.TransferMeError);
    }
  },
};
