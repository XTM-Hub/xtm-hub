'use client';

import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
import { ServiceGroupName } from '@graphql/generated';
import { NO_ROLE_VALUE } from './manage-trial.const';

interface RoleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  roles: ServiceGroupName[];
  namespace: string;
  isOptional: boolean;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName: string;
}

export const RoleSelect = ({
  value,
  onValueChange,
  roles,
  namespace,
  isOptional,
  placeholder,
  disabled,
  triggerClassName,
}: RoleSelectProps) => {
  const t = useTranslate();
  return (
    <Select
      onValueChange={onValueChange}
      value={value}
      disabled={disabled}>
      <SelectTrigger className={cn('content-body-base', triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="layer-2 bg-input-default">
        {isOptional && (
          <SelectItem
            value={NO_ROLE_VALUE}
            className="focus:bg-input-hover">
            {t('Service.Bundle.ManageTrial.Roles.NoAccess')}
          </SelectItem>
        )}
        {roles.map((role) => (
          <SelectItem
            key={role}
            value={role}
            className="focus:bg-input-hover content-body-base">
            {t(`${namespace}.${role}.Label`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
