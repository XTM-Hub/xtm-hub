import {
  PlatformIdentifier,
  ServiceGroupName,
  UserAccountStatus,
} from '@graphql/generated';
import { z } from 'zod';

export interface RolePanelConfig {
  platform: PlatformIdentifier;
  roles: ServiceGroupName[];
  defaultRole?: ServiceGroupName;
}

export const ROLE_PANELS: RolePanelConfig[] = [
  {
    platform: PlatformIdentifier.Opencti,
    roles: [
      ServiceGroupName.Admin,
      ServiceGroupName.Analyst,
      ServiceGroupName.Reader,
    ],
  },
  {
    platform: PlatformIdentifier.Openaev,
    roles: [
      ServiceGroupName.Admin,
      ServiceGroupName.Manager,
      ServiceGroupName.Observer,
    ],
  },
  {
    platform: PlatformIdentifier.Xtmone,
    roles: [ServiceGroupName.Admin, ServiceGroupName.User],
    defaultRole: ServiceGroupName.User,
  },
];

export const getBundleRolePanels = (
  products: PlatformIdentifier[]
): RolePanelConfig[] =>
  ROLE_PANELS.filter(({ platform }) => products.includes(platform));

export const NO_ROLE_VALUE = 'none';

export type RoleFormField = `${PlatformIdentifier}Role`;

export interface TrialUserOption {
  label: string;
  value: string;
  status?: UserAccountStatus | null;
}

export const NEW_EMAIL_PREFIX = 'email:';

export const isNewEmailEntry = (value: string) =>
  value.startsWith(NEW_EMAIL_PREFIX);

export const toNewEmailEntry = (email: string) => `${NEW_EMAIL_PREFIX}${email}`;

const fromNewEmailEntry = (entry: string) =>
  entry.slice(NEW_EMAIL_PREFIX.length);

export const isValidEmail = (value: string) =>
  z.email().safeParse(value).success;

export const splitUserSelection = (
  entries: string[]
): { userIds: string[]; emails: string[] } => ({
  userIds: entries.filter((entry) => !isNewEmailEntry(entry)),
  emails: entries.filter(isNewEmailEntry).map(fromNewEmailEntry),
});

const userSelectionEntrySchema = z
  .string()
  .min(1)
  .refine(
    (entry) => !isNewEmailEntry(entry) || isValidEmail(fromNewEmailEntry(entry))
  );

export const trialUserRolesFormSchema = z.object({
  userIds: z.array(userSelectionEntrySchema).min(1),
  openctiRole: z.enum(ServiceGroupName).optional(),
  openaevRole: z.enum(ServiceGroupName).optional(),
  xtmoneRole: z.enum(ServiceGroupName),
});

export type TrialUserRolesFormValues = z.infer<typeof trialUserRolesFormSchema>;
