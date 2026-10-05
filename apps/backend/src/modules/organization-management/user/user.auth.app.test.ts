import config from 'config';
import express from 'express';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserLoadUserBy } from '../../../model/user';
import * as UserSecurity from '../../../security/util/user';
import { ServiceGroupApp } from '../../deployment/group/service-group.app';
import { UserDomain } from './user-domain/user.domain';
import { UserAuthApp } from './user.auth.app';

vi.mock('config', () => ({
  default: { get: vi.fn() },
}));

vi.mock('./user-domain/user.domain', () => ({
  UserDomain: {
    loadUserBy: vi.fn(),
    updateUserAtLogin: vi.fn(),
  },
}));

vi.mock('../../deployment/group/service-group.app', () => ({
  ServiceGroupApp: {
    grantAccessIfWaiting: vi.fn(),
  },
}));

vi.mock('../../../security/util/user', () => ({
  validatePassword: vi.fn(),
}));

const mockReq = { session: {} } as unknown as express.Request;
const mockRes = { cookie: vi.fn() } as unknown as express.Response;

const mockUser = {
  id: 'user-id',
  email: 'user@company.com',
  salt: 'somesalt',
  password: 'somehash',
  selected_language: 'en',
  status: null,
} as UserLoadUserBy;

const SSO_ONLY_SETTINGS = [{ provider: 'oidc' }];
const LOCAL_SETTINGS = [{ provider: 'local' }, { provider: 'oidc' }];

describe('usersAuthApp', () => {
  describe('login', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    describe('when local auth is not enabled (SSO-only config)', () => {
      it('should throw ForbiddenAccess regardless of credentials', async () => {
        (config.get as Mock).mockReturnValue(SSO_ONLY_SETTINGS);

        await expect(
          UserAuthApp.login(mockReq, mockRes, {
            email: 'user@company.com',
            password: '',
          })
        ).rejects.toThrow('Local authentication is not enabled');
      });

      it('should throw even if login_settings is empty', async () => {
        (config.get as Mock).mockReturnValue([]);

        await expect(
          UserAuthApp.login(mockReq, mockRes, {
            email: 'user@company.com',
            password: 'somepassword',
          })
        ).rejects.toThrow('Local authentication is not enabled');
      });
    });

    describe('when local auth is enabled', () => {
      beforeEach(() => {
        (config.get as Mock).mockReturnValue(LOCAL_SETTINGS);
      });

      it('should return the user when credentials are valid', async () => {
        vi.mocked(UserDomain.loadUserBy).mockResolvedValue(mockUser);
        vi.mocked(UserDomain.updateUserAtLogin).mockResolvedValue(mockUser);
        vi.mocked(UserSecurity.validatePassword).mockReturnValue(true);

        const result = await UserAuthApp.login(mockReq, mockRes, {
          email: 'user@company.com',
          password: 'correctpassword',
        });

        expect(result).toBe(mockUser);
        expect(mockReq.session).toMatchObject({ user: mockUser });
        expect(
          ServiceGroupApp.grantAccessIfWaiting
        ).toHaveBeenCalledExactlyOnceWith(mockUser);
      });

      it.each`
        reason              | user        | passwordValid
        ${'user not found'} | ${null}     | ${false}
        ${'wrong password'} | ${mockUser} | ${false}
      `(
        'should return undefined when $reason',
        async ({ user, passwordValid }) => {
          vi.mocked(UserDomain.loadUserBy).mockResolvedValue(user);
          vi.mocked(UserSecurity.validatePassword).mockReturnValue(
            passwordValid
          );

          const result = await UserAuthApp.login(mockReq, mockRes, {
            email: 'user@company.com',
            password: 'wrongpassword',
          });

          expect(result).toBeUndefined();
          expect(UserDomain.updateUserAtLogin).not.toHaveBeenCalled();
          expect(ServiceGroupApp.grantAccessIfWaiting).not.toHaveBeenCalled();
        }
      );
    });
  });
});
