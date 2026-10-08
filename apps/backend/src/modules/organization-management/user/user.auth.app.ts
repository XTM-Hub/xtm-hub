import config from 'config';
import express from 'express';
import { MutationLoginArgs } from '../../../__generated__/resolvers-types';
import portalConfig from '../../../config';
import { UserLoadUserBy } from '../../../model/user';
import { validatePassword } from '../../../security/util/user';
import { ForbiddenAccess } from '../../../utils/error/error.util';
import { ServiceGroupApp } from '../../deployment/group/service-group.app';
import { UserDomain } from './user-domain/user.domain';

const validPassword = (user: UserLoadUserBy, password: string): boolean => {
  return validatePassword(user.salt, password, user.password);
};

const isLocalAuthEnabled = (): boolean => {
  const loginSettings =
    config.get<{ provider: string }[]>('login_settings') ?? [];
  return loginSettings.some((entry) => entry.provider === 'local');
};

export const UserAuthApp = {
  login: async (
    req: express.Request,
    res: express.Response,
    { email, password }: MutationLoginArgs
  ) => {
    if (!isLocalAuthEnabled()) {
      throw ForbiddenAccess('Local authentication is not enabled');
    }

    const loggedUser = await UserDomain.loadUserBy({ email });
    if (loggedUser && password && validPassword(loggedUser, password)) {
      const user = await UserDomain.updateUserAtLogin(loggedUser);
      req.session.user = user;

      await ServiceGroupApp.grantAccessAtLogin(user);

      res.cookie('NEXT_LOCALE', loggedUser.selected_language);

      return loggedUser;
    }

    return undefined;
  },

  logout: async (
    user: UserLoadUserBy,
    req: express.Request,
    res: express.Response
  ): Promise<string> => {
    return new Promise((resolve) => {
      res.clearCookie(portalConfig.session.name);
      req.session.destroy(() => {
        resolve(user ? user.id : 'anonymous');
      });
    });
  },
};
