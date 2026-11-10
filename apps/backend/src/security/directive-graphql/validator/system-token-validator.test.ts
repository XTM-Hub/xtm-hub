import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortalCapability } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import type { PortalContext } from '../../../model/portal-context';
import type { UserLoadUserBy } from '../../../model/user';
import { hashPassword } from '../../../utils/hash-password.util';
import {
  createSystemTokenResolver,
  isSystemTokenHashUsable,
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

  describe('isSystemTokenHashUsable', () => {
    const repositoryDefault = hashPassword('changeMe');
    const configured = hashPassword('a-configured-secret-token');

    it.each`
      environment      | description                 | configuration        | expected
      ${'production'}  | ${'the repository default'} | ${repositoryDefault} | ${false}
      ${'staging'}     | ${'the repository default'} | ${repositoryDefault} | ${false}
      ${'development'} | ${'the repository default'} | ${repositoryDefault} | ${true}
      ${'development'} | ${'a configured hash'}      | ${configured}        | ${true}
      ${'production'}  | ${'a configured hash'}      | ${configured}        | ${true}
      ${'staging'}     | ${'a configured hash'}      | ${configured}        | ${true}
    `(
      'should return $expected in $environment with $description',
      ({
        environment,
        configuration,
        expected,
      }: {
        environment: string;
        configuration: { hash: string; salt: string };
        expected: boolean;
      }) => {
        // When
        const result = isSystemTokenHashUsable({
          environment,
          hash: configuration.hash,
          salt: configuration.salt,
        });

        // Then
        expect(result).toBe(expected);
      }
    );
  });

  describe('outside development with the repository default hash', () => {
    const REPOSITORY_DEFAULT_SYSTEM_TOKEN = 'changeMe';

    // The usability of the hash is computed once, when the module loads:
    // load a fresh copy of the validator with a production configuration.
    const loadValidatorInProduction = async () => {
      vi.resetModules();
      vi.doMock('../../../config', async (importOriginal) => {
        const actual = await importOriginal<typeof import('../../../config')>();
        return {
          default: { ...actual.default, environment: 'production' },
        };
      });
      const { logApp } = await import('../../../utils/app-logger.util');
      const logErrorSpy = vi
        .spyOn(logApp, 'error')
        .mockImplementation(() => undefined);
      const validator = await import('./system-token.validator');
      return { validator, logErrorSpy };
    };

    afterEach(() => {
      vi.doUnmock('../../../config');
      vi.resetModules();
      vi.restoreAllMocks();
    });

    it('should refuse the repository default token', async () => {
      // Given
      const { validator } = await loadValidatorInProduction();

      // When
      const result = validator.isValidSystemToken(
        REPOSITORY_DEFAULT_SYSTEM_TOKEN
      );

      // Then
      expect(result).toBe(false);
    });

    it('should log an error at startup', async () => {
      // When
      const { logErrorSpy } = await loadValidatorInProduction();

      // Then
      expect(logErrorSpy).toHaveBeenCalledTimes(1);
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
