import { AsyncLocalStorage } from 'async_hooks';
import { OrganizationCapability } from '../__generated__/resolvers-types';
import { OrganizationId } from '../model/kanel/public/Organization';
import { UserLoadUserBy } from '../model/user';
import { UnknownErrorCode } from '../utils/error/error.code';

// What a request authenticated by an API token may reach: its organization only, with the capabilities it narrowed
export interface ApiTokenReach {
  organizationId: OrganizationId;
  organizationCapabilities: readonly OrganizationCapability[];
}

export interface RequestContext {
  user?: UserLoadUserBy;
  correlationId?: string;
  userAgent?: string;
  ip?: string;
  referer?: string;
  organizationId?: OrganizationId;
  // Set for a request authenticated by an API token only
  apiToken?: ApiTokenReach;
}

// Create typed AsyncLocalStorage
const requestContextStorage = new AsyncLocalStorage<
  RequestContext | undefined
>();

export const requestContext = {
  // Get current context
  get(): RequestContext | undefined {
    return requestContextStorage.getStore();
  },

  // Get context or throw if missing
  require(): RequestContext {
    const context = requestContextStorage.getStore();
    if (!context) {
      throw UnknownErrorCode.NoAsyncContextAvailableError;
    }
    return context;
  },

  // Get authenticated user or throw if missing
  requireUser(): UserLoadUserBy {
    const context = requestContextStorage.getStore();
    if (!context?.user) {
      throw UnknownErrorCode.NoAsyncContextAvailableError;
    }
    return context.user;
  },

  // Update context
  update(updates: Partial<RequestContext>): void {
    const context = requestContextStorage.getStore();
    if (!context) {
      throw UnknownErrorCode.NoAsyncContextAvailableError;
    }
    Object.assign(context, updates);
  },

  set(context: RequestContext | undefined): void {
    requestContextStorage.enterWith(context);
  },

  // Run with context (for middleware). Returns the callback's result so
  // async callbacks can be awaited by the caller once the context is set.
  run<T>(context: RequestContext, callback: () => T): T {
    return requestContextStorage.run(context, callback);
  },
};
