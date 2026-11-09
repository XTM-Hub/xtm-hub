import z from 'zod';

const UuidSchema = z.uuid();

export const isUuid = (value: string): boolean =>
  UuidSchema.safeParse(value).success;
