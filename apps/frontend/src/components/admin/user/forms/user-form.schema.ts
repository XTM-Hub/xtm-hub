import { z } from 'zod';

export const userFormSchema = z.object({
  email: z.email('This is not a valid email.').min(2, {
    error: 'Email must be at least 2 characters.',
  }),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  password: z.string().optional(),
  capabilities: z.array(z.string()),
});

export const userEditFormSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  capabilities: z.array(z.string()),
});

export const userAdminFormSchema = z.object({
  email: z.email('This is not a valid email.').min(2, {
    error: 'Email must be at least 2 characters.',
  }),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  password: z.string().optional(),
  organization_capabilities: z.array(
    z.object({
      organization_id: z.string(),
      capabilities: z.array(z.string()),
    })
  ),
});
export const userEditAdminFormSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  password: z.string().optional(),
  organization_capabilities: z.array(
    z.object({
      organization_id: z.string(),
      capabilities: z.array(z.string()),
    })
  ),
});
