import { useState, useMemo } from 'react';
import { Combobox, TextInput, useCombobox, Group, Text, ScrollArea, Loader } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { CategorizedCommodityViewModel } from '@optiroq/types';

interface CommoditySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  // MODIFIED: Added categorizedCommodities prop
  categorizedCommodities: CategorizedCommodityViewModel[];
}

/**
 * A user-friendly, searchable, and creatable select input for commodities.
 * It receives a categorized list of commodities and allows users to either select
 * an existing one or enter a new custom value.
 */
export function CommoditySelect({ value, onChange, label, description, error, disabled, required, categorizedCommodities }: CommoditySelectProps) {
  const { t } = useTranslation(['project_edit', 'common']);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState(value || '');
  
  // MODIFIED: Removed useApiView hook, as data is now passed in via props.
  const isLoading = !categorizedCommodities;

  const options = useMemo(() => {
    if (!categorizedCommodities) return [];

    const lowerCaseSearch = search.toLowerCase().trim();

    return categorizedCommodities.flatMap(category => {
      const filteredCommodities = category.commodities
        .filter(commodity => commodity.name.toLowerCase().includes(lowerCaseSearch))
        .map(commodity => (
          <Combobox.Option value={commodity.name} key={commodity.id}>
            {commodity.name}
          </Combobox.Option>
        ));

      if (filteredCommodities.length > 0) {
        return [
          <Combobox.Group label={t(`groups:${category.category}`, { defaultValue: category.category })} key={category.category}>
            {filteredCommodities}
          </Combobox.Group>
        ];
      }
      return [];
    }).flat();
  }, [categorizedCommodities, search, t]);
  
  const exactMatch = useMemo(() => {
    if (!categorizedCommodities) return false;
    return categorizedCommodities.some(cat => cat.commodities.some(com => com.name.toLowerCase() === search.toLowerCase().trim()));
  }, [categorizedCommodities, search]);
  
  const creatableOption = !exactMatch && search.trim().length > 0 ? (
    <Combobox.Option value={search.trim()}>
      <Group gap="xs">
        <span>{t('createCommodity')}</span>
        <Text
          span
          fw={700}
          style={{
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          "{search.trim()}"
        </Text>
      </Group>
    </Combobox.Option>
  ) : null;

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        onChange(val);
        setSearch(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          label={label}
          description={description}
          required={required}
          error={error}
          disabled={disabled}
          placeholder={t('searchCommoditiesPlaceholder')}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            // Allow free text input by calling onChange immediately
            onChange(event.currentTarget.value === '' ? null : event.currentTarget.value); 
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => {
            combobox.openDropdown();
            setSearch(value || ''); // Ensure search shows full value on focus
          }}
          onBlur={() => {
            combobox.closeDropdown();
            setSearch(value || ''); // On blur, sync input with final form value
          }}
          rightSection={isLoading ? <Loader size="xs" /> : null}
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
            <ScrollArea.Autosize type="scroll" mah={300}>
              {options.length > 0 || creatableOption ? (
                <>
                  {options}
                  {creatableOption}
                </>
              ) : (
                <Combobox.Empty>{t('common:noResultsFound')}</Combobox.Empty>
              )}
            </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}