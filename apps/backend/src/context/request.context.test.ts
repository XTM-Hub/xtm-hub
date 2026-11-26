// lib/Context.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { OrganizationId } from '../model/kanel/public/Organization';
import { UserLoadUserBy } from '../model/user';
import { UnknownErrorCode } from '../utils/error/error.code';
import { requestContext, RequestContext } from './request.context';

describe('requestContext', () => {
  const mockUser = {
    id: 1,
    last_name: 'Test User',
  } as unknown as UserLoadUserBy;
  const mockCorrelationId = 'test-correlation-id';

  beforeEach(() => {
    // Restore original implementations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originals = (globalThis as any).__originalRequestContext;
    if (originals) {
      Object.assign(requestContext, originals);
    }
    requestContext.set(undefined);
  });

  describe('get()', () => {
    it('should return undefined when no context is set', async () => {
      const context = requestContext.get();
      expect(context).toBeUndefined();
    });

    it('should return the current context when set', () => {
      const testContext: RequestContext = {
        user: mockUser,
        correlationId: mockCorrelationId,
      };

      requestContext.set(testContext);
      const retrievedContext = requestContext.get();

      expect(retrievedContext).toBe(testContext);
    });

    it('should return the current context with request metadata when set', () => {
      const testContext: RequestContext = {
        user: mockUser,
        correlationId: mockCorrelationId,
        userAgent: 'Mozilla/5.0 (test)',
        ip: '203.0.113.10',
        referer: 'https://example.com/page',
        organizationId: 'org-1' as OrganizationId,
      };

      requestContext.set(testContext);
      const retrievedContext = requestContext.get();

      expect(retrievedContext).toBe(testContext);
      expect(retrievedContext?.userAgent).toBe('Mozilla/5.0 (test)');
      expect(retrievedContext?.ip).toBe('203.0.113.10');
      expect(retrievedContext?.referer).toBe('https://example.com/page');
      expect(retrievedContext?.organizationId).toBe('org-1');
    });
  });

  describe('require()', () => {
    it('should throw error when no context is available', () => {
      expect(() => requestContext.require()).toThrow(
        UnknownErrorCode.NoAsyncContextAvailableError
      );
    });

    it('should return context when available', () => {
      const testContext: RequestContext = {
        user: mockUser,
      };

      requestContext.set(testContext);
      const retrievedContext = requestContext.require();

      expect(retrievedContext).toEqual(testContext);
    });
  });

  describe('requireUser()', () => {
    it.each([
      { description: 'no context at all', context: undefined },
      {
        description: 'context exists but user is absent',
        context: { correlationId: 'abc' },
      },
    ])(
      'should throw when $description',
      ({ context }: { context: RequestContext | undefined }) => {
        requestContext.set(context);
        expect(() => requestContext.requireUser()).toThrow(
          UnknownErrorCode.NoAsyncContextAvailableError
        );
      }
    );

    it('should return the user when context and user are both present', () => {
      const testContext: RequestContext = {
        user: mockUser,
        correlationId: mockCorrelationId,
      };

      requestContext.set(testContext);
      const retrievedUser = requestContext.requireUser();

      expect(retrievedUser).toBe(mockUser);
    });
  });

  describe('set()', () => {
    it('should set a new context', () => {
      const testContext: RequestContext = {
        user: mockUser,
        correlationId: mockCorrelationId,
      };

      requestContext.set(testContext);
      const retrievedContext = requestContext.get();

      expect(retrievedContext).toEqual(testContext);
    });

    it('should replace existing context', () => {
      const firstContext: RequestContext = {
        user: mockUser,
        correlationId: mockCorrelationId,
      };

      const secondContext: RequestContext = {
        user: { id: 2, last_name: 'Second User' } as unknown as UserLoadUserBy,
      };

      requestContext.set(firstContext);
      expect(requestContext.get()).toEqual(firstContext);

      requestContext.set(secondContext);
      expect(requestContext.get()).toEqual(secondContext);
    });
  });

  describe('update()', () => {
    it('should update existing context with partial data', () => {
      const initialContext: RequestContext = {
        user: mockUser,
      };

      requestContext.set(initialContext);

      const updates = {
        correlationId: mockCorrelationId,
      };

      requestContext.update(updates);
      const updatedContext = requestContext.get();
      expect(updatedContext).toBe(initialContext);
      expect(updatedContext).toStrictEqual({ ...initialContext, ...updates });
    });

    it('should update existing context with request metadata', () => {
      const initialContext: RequestContext = {
        user: mockUser,
      };

      requestContext.set(initialContext);

      requestContext.update({
        userAgent: 'Mozilla/5.0 (test)',
        ip: '203.0.113.10',
        referer: 'https://example.com/page',
        organizationId: 'org-1' as OrganizationId,
      });

      const updatedContext = requestContext.get();
      expect(updatedContext?.userAgent).toBe('Mozilla/5.0 (test)');
      expect(updatedContext?.ip).toBe('203.0.113.10');
      expect(updatedContext?.referer).toBe('https://example.com/page');
      expect(updatedContext?.organizationId).toBe('org-1');
    });

    it('should overwrite existing fields when updating', () => {
      const initialContext: RequestContext = {
        user: mockUser,
        correlationId: mockCorrelationId,
      };

      requestContext.set(initialContext);

      const newCorrelationId = 'new-correlation-id';
      requestContext.update({ correlationId: newCorrelationId });

      const updatedContext = requestContext.get();
      expect(updatedContext?.user).toBe(mockUser);
      expect(updatedContext?.correlationId).toBe(newCorrelationId);
    });

    it('should handle empty updates gracefully', () => {
      const initialContext: RequestContext = {
        user: mockUser,
        correlationId: mockCorrelationId,
      };

      requestContext.set(initialContext);
      requestContext.update({});

      const updatedContext = requestContext.get();
      expect(updatedContext).toStrictEqual(initialContext);
    });

    it('should throw without initial context', () => {
      expect(() =>
        requestContext.update({ correlationId: mockCorrelationId })
      ).toThrow(UnknownErrorCode.NoAsyncContextAvailableError);
    });
  });

  describe('run()', () => {
    it('should execute callback with provided context', () => {
      const testContext: RequestContext = {
        user: mockUser,
      };

      let contextInsideCallback: RequestContext | undefined;
      const callback = () => {
        contextInsideCallback = requestContext.get();
      };

      requestContext.run(testContext, callback);

      expect(contextInsideCallback).toEqual(testContext);
    });

    it('should isolate context within the callback', async () => {
      const context1: RequestContext = {
        user: { id: 1, name: 'User 1' } as unknown as UserLoadUserBy,
      };

      const context2: RequestContext = {
        user: { id: 2, name: 'User 2' } as unknown as UserLoadUserBy,
      };

      // Set initial context
      requestContext.set(context1);
      expect(requestContext.get()?.user?.id).toBe(1);

      // Run with different context
      await new Promise<void>((resolve) => {
        requestContext.run(context2, () => {
          expect(requestContext.get()?.user?.id).toBe(2);
          resolve();
        });
      });

      // Original context should still be available outside
      expect(requestContext.get()?.user?.id).toBe(1);
    });

    it('should allow nested context runs', () => {
      const outerContext: RequestContext = {
        user: { id: 1, name: 'Outer User' } as unknown as UserLoadUserBy,
      };

      const innerContext: RequestContext = {
        user: { id: 2, name: 'Inner User' } as unknown as UserLoadUserBy,
      };

      let outerResult: RequestContext | undefined;
      let innerResult: RequestContext | undefined;

      requestContext.run(outerContext, () => {
        outerResult = requestContext.get();

        requestContext.run(innerContext, () => {
          innerResult = requestContext.get();
        });

        // Should be back to outer context
        expect(requestContext.get()).toBe(outerContext);
      });

      expect(outerResult).toBe(outerContext);
      expect(innerResult).toBe(innerContext);
    });
  });

  describe('async behavior', () => {
    it('should maintain context across async operations when using run()', async () => {
      const testContext: RequestContext = {
        user: mockUser,
      };

      await new Promise<void>((resolve) => {
        requestContext.run(testContext, async () => {
          expect(requestContext.get()).toBe(testContext);

          await new Promise((resolve) => setTimeout(resolve, 10));

          expect(requestContext.get()).toBe(testContext);

          resolve();
        });
      });
    });

    it('should maintain context across Promise chains when using run()', async () => {
      const testContext: RequestContext = {
        user: mockUser,
      };

      await new Promise<void>((resolve) => {
        requestContext.run(testContext, () => {
          Promise.resolve()
            .then(() => {
              expect(requestContext.get()).toBe(testContext);
              return Promise.resolve('test');
            })
            .then(() => {
              expect(requestContext.get()).toBe(testContext);
              resolve();
            });
        });
      });
    });
  });
});
