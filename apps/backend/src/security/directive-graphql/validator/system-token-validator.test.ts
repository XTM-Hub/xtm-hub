import { describe, expect, it, vi } from 'vitest';
import { PortalCapability } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import type { PortalContext } from '../../../model/portal-context';
import type { UserLoadUserBy } from '../../../model/user';
import {
  createSystemTokenResolver,
  SYSTEM_TOKEN_HEADER,
  validateSystemToken,
} from './system-token.validator';

// Import after mocking

describe('system Token Validation', () => {
  describe('validateSystemToken', () => {
    it('should return true when token is valid', () => {
      const context: PortalContext = {
        req: {
          headers: {
            [SYSTEM_TOKEN_HEADER]: 'changeMe',
          },
        },
      } as unknown as PortalContext;

      const result = validateSystemToken(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenAccess when token is invalid', () => {
      const context: PortalContext = {
        req: {
          headers: {
            [SYSTEM_TOKEN_HEADER]: 'invalid-token',
          },
        },
      } as unknown as PortalContext;

      expect(() => validateSystemToken(context)).toThrowError(
        'Invalid system token attempt'
      );
    });

    it('should throw ForbiddenAccess when token is missing', () => {
      const context: PortalContext = {
        req: {
          headers: {},
        },
      } as unknown as PortalContext;

      expect(() => validateSystemToken(context)).toThrowError(
        'Invalid system token attempt'
      );
    });

    it('should throw ForbiddenAccess when token is empty string', () => {
      const context: PortalContext = {
        req: {
          headers: {
            [SYSTEM_TOKEN_HEADER]: '',
          },
        },
      } as unknown as PortalContext;

      expect(() => validateSystemToken(context)).toThrowError(
        'Invalid system token attempt'
      );
    });
  });

  describe('createSystemTokenResolver', () => {
    it('should inject only required portal capabilities without BYPASS', async () => {
      const resolverSpy = vi.fn(
        async (_source, _args, context: PortalContext) => context.user
      );

      const wrappedResolver = createSystemTokenResolver(resolverSpy, {
        portalCapa: [
          PortalCapability.ModifyTrials,
          PortalCapability.ReadTrials,
        ],
      });

      const context = {
        req: {
          headers: {
            [SYSTEM_TOKEN_HEADER]: 'changeMe',
          },
        },
      } as PortalContext;

      const result = await new Promise<UserLoadUserBy>((resolve, reject) => {
        requestContext.run({ user: {} as UserLoadUserBy }, async () => {
          try {
            const resolved = await wrappedResolver({}, {}, context, {});
            resolve(resolved);
          } catch (error) {
            reject(error);
          }
        });
      });

      expect(resolverSpy).toHaveBeenCalledTimes(1);
      expect(result.capabilities.map(({ name }) => name)).toEqual([
        PortalCapability.ModifyTrials,
        PortalCapability.ReadTrials,
      ]);
      expect(result.selected_org_capabilities).toEqual([]);
      expect(
        result.capabilities.some(
          (capability: { name: PortalCapability }) =>
            capability.name === PortalCapability.Bypass
        )
      ).toBe(false);
    });
  });
});
