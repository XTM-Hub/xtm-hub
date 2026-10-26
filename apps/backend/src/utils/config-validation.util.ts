import { z } from 'zod';
import { logApp } from './app-logger.util';

// Zod schema for DevUser organization
const DevUserOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  domains: z.array(z.string()).optional(),
});

// Zod schema for DevUser
const DevUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  roles: z.array(z.string()).optional(),
  organization: DevUserOrganizationSchema.optional(),
});

// Zod schema for array of DevUsers
const DevUsersArraySchema = z.array(DevUserSchema);

// TypeScript types inferred from Zod schemas
export type DevUser = z.infer<typeof DevUserSchema>;
export type DevUserOrganization = z.infer<typeof DevUserOrganizationSchema>;

export interface DevUserValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a single dev user configuration using Zod
 */
export const validateDevUser = (user: unknown): DevUserValidationResult => {
  try {
    DevUserSchema.parse(user);
    return {
      isValid: true,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      });
      return {
        isValid: false,
        errors,
      };
    }
    return {
      isValid: false,
      errors: ['Unknown validation error'],
    };
  }
};

/**
 * Validates an array of dev users using Zod
 */
export const validateDevUsers = (users: unknown[]): DevUser[] => {
  const validUsers: DevUser[] = [];

  users.forEach((user, index) => {
    const validation = validateDevUser(user);

    if (validation.isValid) {
      // We know it's valid because Zod parsed it successfully
      validUsers.push(user as DevUser);
    } else {
      logApp.warn(
        `Invalid dev user at index ${index}: ${validation.errors.join(', ')}`
      );
    }
  });

  return validUsers;
};

/**
 * Parses and validates DEV_USERS environment variable using Zod
 */
export const parseAndValidateDevUsers = (): DevUser[] | undefined => {
  const devUsersEnv = process.env.DEV_USERS;
  if (!devUsersEnv || devUsersEnv.trim() === '') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(devUsersEnv);

    // First check if it's an array
    if (!Array.isArray(parsed)) {
      logApp.warn('DEV_USERS should be an array, ignoring');
      return undefined;
    }

    if (parsed.length === 0) {
      return [];
    }

    // Validate the entire array with Zod
    try {
      const validUsers = DevUsersArraySchema.parse(parsed);
      logApp.info(`Loaded ${validUsers.length} dev users from configuration`);
      return validUsers;
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        // Some users might be invalid, so let's validate them individually
        const validUsers = validateDevUsers(parsed);

        if (validUsers.length === 0) {
          logApp.warn('No valid dev users found in DEV_USERS configuration');
          return undefined;
        }

        if (validUsers.length < parsed.length) {
          const invalidCount = parsed.length - validUsers.length;
          logApp.warn(`${invalidCount} invalid dev users were filtered out`);
        }

        logApp.info(`Loaded ${validUsers.length} dev users from configuration`);
        return validUsers;
      }

      logApp.warn('Failed to validate DEV_USERS structure');
      return undefined;
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logApp.warn(`Failed to parse DEV_USERS JSON: ${errorMessage}`);
    return undefined;
  }
};

/**
 * Type guard to check if a value is a valid DevUser
 */
export const isValidDevUser = (value: unknown): value is DevUser => {
  const { success } = DevUserSchema.safeParse(value);
  return success;
};

/**
 * Type guard to check if a value is a valid DevUserOrganization
 */
export const isValidDevUserOrganization = (
  value: unknown
): value is DevUserOrganization => {
  try {
    DevUserOrganizationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Partial validation - useful for form validation or progressive validation
 */
export const validateDevUserPartial = (
  user: unknown
): DevUserValidationResult => {
  try {
    DevUserSchema.partial().parse(user);
    return {
      isValid: true,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      });
      return {
        isValid: false,
        errors,
      };
    }
    return {
      isValid: false,
      errors: ['Unknown validation error'],
    };
  }
};

/**
 * Parses the Express `trust proxy` hop count. Only a non-negative integer is
 * accepted: Express reads `true` as "trust everything" and a raw string such
 * as "1" (node-config returns env vars as strings) as a list of trusted
 * addresses. 0 becomes `false` so express-rate-limit still flags an
 * unexpected X-Forwarded-For header.
 *
 * An invalid value logs an error and falls back to `false` (trust no proxy)
 * instead of failing the boot. Behind the ingress, `false` makes `req.ip` the
 * front pod IP, so every user then shares one rate-limit key: the error log is
 * the signal to fix TRUST_PROXY.
 */
export const parseTrustProxy = (value: unknown): number | false => {
  const hops =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof hops !== 'number' || !Number.isSafeInteger(hops) || hops < 0) {
    logApp.error(
      `[TRUST-PROXY] Invalid trust_proxy configuration (TRUST_PROXY): expected a non-negative integer hop count, got ${JSON.stringify(value)}, falling back to false`
    );
    return false;
  }
  return hops === 0 ? false : hops;
};

/**
 * Resolves the Express `trust proxy` setting. In local dev (LOCAL_DEV=true) there is no
 * ingress in front of the API, so no hop is trusted and `req.ip` stays the socket peer,
 * whatever trust_proxy holds.
 */
export const resolveTrustProxy = (
  configured: unknown,
  localDev: boolean
): number | false => (localDev ? false : parseTrustProxy(configured));

// Export schemas for potential reuse
export { DevUserOrganizationSchema, DevUsersArraySchema, DevUserSchema };
