import countryData from '@/components/ui/country/data.json';
import { useTranslate } from '@/hooks/use-translate';
import { Combobox } from '@filigran/ui';
import { useMemo } from 'react';

interface CountryComboboxProps {
  value?: { name: string } | undefined;
  onValueChange: (value: { name: string } | undefined) => void;
}

export const CountryCombobox = ({
  value,
  onValueChange,
}: CountryComboboxProps) => {
  const t = useTranslate();
  const { countries } = countryData;
  const dataTab = useMemo(() => {
    return countries.sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  return (
    <Combobox
      dataTab={dataTab}
      placeholder={t('CountryComboBox.Placeholder')}
      order={t('CountryComboBox.Placeholder')}
      onValueChange={onValueChange}
      onInputChange={() => {}}
      emptyCommand={t('Utils.NotFound')}
      keyValue={'name'}
      keyLabel={'name'}
      value={value}
    />
  );
};
