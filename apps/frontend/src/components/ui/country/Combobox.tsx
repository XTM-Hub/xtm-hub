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
}

export const CountryCombobox = ({
  label,
  value,
  onValueChange,
}: CountryComboboxProps) => {
  const t = useTranslate();
  const { countries } = countryData;
  const dataTab = useMemo(() => {
    return countries.sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  return (
    <AppCombobox<CountryOption>
      label={label}
      placeholder={t('CountryComboBox.Placeholder')}
      options={dataTab}
      value={value ?? null}
      onValueChange={(next) => onValueChange(next ?? undefined)}
      getOptionLabel={(country) => country.name}
      isOptionEqualToValue={(a, b) => a.name === b.name}
    />
  );
};
