import { AppCombobox } from '@/components/ui/AppCombobox';
import countryData from '@/components/ui/country/data.json';
import { useTranslate } from '@/hooks/use-translate';
import { useMemo } from 'react';

interface CountryOption {
  name: string;
}

interface CountryComboboxProps {
  label: string;
  value?: CountryOption | undefined;
  onValueChange: (value: CountryOption | undefined) => void;
  error?: string;
  contentClassName?: string;
}

export const CountryCombobox = ({
  label,
  value,
  onValueChange,
  error,
  contentClassName,
}: CountryComboboxProps) => {
  const t = useTranslate();
  const { countries } = countryData;
  const dataTab = useMemo(() => {
    return countries.sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  return (
    <AppCombobox<CountryOption>
      formField
      label={label}
      placeholder={t('CountryComboBox.Placeholder')}
      error={error}
      options={dataTab}
      value={value ?? null}
      onValueChange={(next) => onValueChange(next ?? undefined)}
      getOptionLabel={(country) => country.name}
      isOptionEqualToValue={(a, b) => a.name === b.name}
      contentClassName={contentClassName}
    />
  );
};
