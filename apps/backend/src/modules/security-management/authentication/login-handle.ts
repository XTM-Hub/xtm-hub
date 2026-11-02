import { ProviderUserInfo } from '../../../model/user';
import { AppLogsCategory, logApp } from '../../../utils/app-logger.util';
import { ErrorType } from '../../../utils/error/error.type';
import { loginFromProvider } from './auth-user';

export const providerLoginHandler = async (
  userInfo: ProviderUserInfo,
  done: (error: Error | null, user?: Express.User | false | null) => void
) => {
  await loginFromProvider(userInfo)
    .then((user) => {
      done(null, user as Express.User);
    })
    .catch((err) => {
      if (err.name === ErrorType.ForbiddenAccess) {
        done(null, null);
      }
      logApp.error(err, {}, AppLogsCategory.LOGIN_PROVIDER);
      done(err);
    });
};
