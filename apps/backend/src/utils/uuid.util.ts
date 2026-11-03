import z from 'zod';

const UuidSchema = z.guid();

export const isUuid = (value: string): boolean =>
  UuidSchema.safeParse(value).success;
