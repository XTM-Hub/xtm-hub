import countryData from '@/components/ui/country/data.json';
import { useTranslate } from '@/hooks/use-translate';
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxControls,
  ComboboxField,
  ComboboxInput,
  ComboboxLabel,
  ComboboxTrigger,
} from '@filigran/design-system';
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
    <Combobox<CountryOption>
      options={dataTab}
      value={value ?? null}
      onValueChange={(next) =>
        onValueChange((next as CountryOption | null) ?? undefined)
      }
      getOptionLabel={(country) => country.name}
      isOptionEqualToValue={(a, b) => a.name === b.name}>
      <ComboboxLabel>{label}</ComboboxLabel>
      <ComboboxField>
        <ComboboxInput placeholder={t('CountryComboBox.Placeholder')} />
        <ComboboxControls>
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxControls>
      </ComboboxField>
      <ComboboxContent
        emptyMessage={t('Utils.NotFound')}
        listAriaLabel={label}
      />
    </Combobox>
  );
};
