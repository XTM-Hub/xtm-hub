import { db } from '../../../../knexfile';
import { HasRepliedSatisfaction } from '../../../__generated__/resolvers-types';
import User, { UserId } from '../../../model/kanel/public/User';

export const DeploymentFeedbackDomain = {
  /**
   * Stores the answer only if the user has not replied yet. The check and the
   * write happen in one statement so concurrent submissions cannot both win.
   * @returns false when the user had already replied, so nothing was stored.
   */
  giveDeploymentFeedback: async (
    userId: UserId,
    answer: HasRepliedSatisfaction
  ): Promise<boolean> => {
    const updatedUsers = await db<User>('User')
      .where({ id: userId })
      .whereNull('has_replied_satisfaction')
      .update({ has_replied_satisfaction: answer })
      .returning('id');
    return updatedUsers.length > 0;
  },
};
