import { fromGlobalId } from 'graphql-relay/node/node.js';
import { z } from 'zod';
import { DatabaseType } from '../../knexfile';
import { logApp } from './app-logger.util';
import { getErrorMessage } from './error/error-guard.util';
import { addPrefixToObject } from './typescript';

export const extractId = <T extends string>(id: string) => {
  const { id: databaseId } = fromGlobalId(id) as {
    type: DatabaseType;
    id: T;
  };
  return databaseId;
};
export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (
    typeof value === 'string' ||
    Array.isArray(value) ||
    value instanceof Uint8Array
  ) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
};
export const isNil = (value: unknown): boolean => {
  return value === null || value === undefined;
};
export const isNotEmptyField = (field: unknown): boolean => {
  return !isEmpty(field) && !isNil(field);
};
export const isEmptyField = (field: unknown): boolean => {
  return isEmpty(field) || isNil(field);
};

export const isValidUrl = (url: string): boolean => {
  const schema = z.string().url();
  const parseResult = schema.safeParse(url);
  return parseResult.success;
};

export const isImgUrl = async (url: string): Promise<boolean> => {
  const parseResult = isValidUrl(url);
  if (!parseResult) {
    return false;
  }

  const urlRegex = /\.(jpg|jpeg|png|webp|avif|gif)/;
  if (!urlRegex.test(url)) {
    return false;
  }

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    return (
      contentType !== null &&
      (contentType.startsWith('img') || contentType.startsWith('image'))
    );
  } catch (err) {
    logApp.debug(getErrorMessage(err));
    return false;
  }
};

export const now = () => new Date().getUTCDate();

export const getNestedPropertyValue = (
  obj: Record<string, unknown>,
  paths: string
) => {
  if (!paths || paths.length === 0) {
    return obj;
  }
  return (
    paths.split('.').reduce<unknown>((acc, path) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[path];
      }
      return undefined;
    }, obj) ?? []
  );
};

export const parseKeyValueArrayToObject = (array: string[]) =>
  Object.fromEntries(
    array.flatMap((item) => {
      const [key, value] = item.split(':');
      return key !== undefined ? [[key, value]] : [];
    })
  );

export const parseKeyValueArrayToObjectReverse = (array: string[]) =>
  Object.fromEntries(
    array.flatMap((item) => {
      const [key, value] = item.split(':');
      return value !== undefined ? [[value, key]] : [];
    })
  );

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`chunk size must be a positive integer, got ${size}`);
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const keysOf = <T>(): Array<keyof T> => [] as unknown as Array<keyof T>;

export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keysToOmit: K[]
): Omit<T, K> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysToOmit.includes(key as K))
  ) as Omit<T, K>;
};

/**
 * Returns a new object which is a subset of the input, including only the specified properties.
 * Can be called with a single argument (array of props to pick), in which case it returns a partially
 * applied pick function.
 */
export function pick<T extends string>(
  props: T[]
): <U>(input: U) => Pick<U, Extract<keyof U, T>>;
export function pick<U, T extends keyof U>(
  input: U,
  props: T[]
): { [K in T]: U[K] };
export function pick<U, T extends keyof U>(
  inputOrProps: U | T[],
  maybeProps?: T[]
): { [K in T]: U[K] } | ((input: U) => Pick<U, Extract<keyof U, T>>) {
  const _pick = <U, T extends keyof U>(
    input: U,
    props: T[]
  ): { [K in T]: U[K] } => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output: any = {};
    for (const prop of props) {
      output[prop] = input[prop];
    }
    return output;
  };
  if (Array.isArray(inputOrProps)) {
    return (input: U) => _pick(input, inputOrProps);
  } else {
    return _pick(inputOrProps, maybeProps || []);
  }
}

export const ucfirst = (str: string): string => {
  if (!str || str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const prefixObjectKeys = <T extends object, P extends string>(
  obj: T,
  prefix: P
): addPrefixToObject<T, P> => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [`${prefix}${key}`, value])
  ) as addPrefixToObject<T, P>;
};
