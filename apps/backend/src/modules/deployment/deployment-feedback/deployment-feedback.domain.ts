import { db } from '../../../../knexfile';
import { HasRepliedSatisfaction } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import User from '../../../model/kanel/public/User';

export const DeploymentFeedbackDomain = {
  giveDeploymentFeedback: async (answer: HasRepliedSatisfaction) => {
    const user = requestContext.requireUser();
    await db<User>('User')
      .where({ id: user.id })
      .update({ has_replied_satisfaction: answer });
  },
};
