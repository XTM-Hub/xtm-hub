import { db } from '../../../../../knexfile';
import { UserId } from '../../../../model/kanel/public/User';
import UserTransferRequest, {
  UserTransferRequestInitializer,
  UserTransferRequestMutator,
} from '../../../../model/kanel/public/UserTransferRequest';
import { addPrefixToObject } from '../../../../utils/typescript';

export const UserTransferRequestDomain = {
  insertNewUserTransfer: (
    data: UserTransferRequestInitializer
  ): Promise<UserTransferRequest[]> => {
    return db<UserTransferRequest>('User_TransferRequest')
      .insert(data)
      .returning('*');
  },

  loadUserTransfer: (
    field:
      | addPrefixToObject<UserTransferRequestMutator, 'User_TransferRequest.'>
      | UserTransferRequestMutator
  ) => {
    return db<UserTransferRequest>('User_TransferRequest').where(field).first();
  },

  deleteUserTransferRequest: async (field: UserTransferRequestMutator) => {
    return db<UserTransferRequest>('User_TransferRequest')
      .where(field)
      .delete('*')
      .returning('*');
  },

  countTransferRequestsForUser: async (userId: UserId): Promise<number> => {
    const result = await db<UserTransferRequest>('User_TransferRequest')
      .where({ from_user_id: userId })
      .orWhere({ to_user_id: userId })
      .count<[{ count: string }]>('id as count')
      .first();
    return Number(result?.count ?? 0);
  },
};
