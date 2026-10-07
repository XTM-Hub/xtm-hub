'use client';

import { useTranslate } from '@/hooks/use-translate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { ServiceGroupName } from '@graphql/generated';
import { NO_ROLE_VALUE } from './manage-trial.const';

interface RoleSelectBaseProps {
  value: string;
  onValueChange: (value: string) => void;
  roles: ServiceGroupName[];
  namespace: string;
  isOptional: boolean;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName: string;
}

// A visible label names the trigger and would override an aria-label, so
// exactly one of the two is accepted.
type RoleSelectName =
  | { label: string; 'aria-label'?: never }
  | { label?: never; 'aria-label': string };

type RoleSelectProps = RoleSelectBaseProps & RoleSelectName;

export const RoleSelect = ({
  value,
  onValueChange,
  roles,
  namespace,
  isOptional,
  label,
  'aria-label': ariaLabel,
  placeholder,
  disabled,
  triggerClassName,
}: RoleSelectProps) => {
  const t = useTranslate();
  return (
    <div>
      <Select
        onValueChange={onValueChange}
        value={value}
        disabled={disabled}>
        {label && <SelectLabel>{label}</SelectLabel>}
        <SelectTrigger
          aria-label={ariaLabel}
          className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="layer-2">
          {isOptional && (
            <SelectItem value={NO_ROLE_VALUE}>
              {t('Service.Bundle.ManageTrial.Roles.NoAccess')}
            </SelectItem>
          )}
          {roles.map((role) => (
            <SelectItem
              key={role}
              value={role}>
              {t(`${namespace}.${role}.Label`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
