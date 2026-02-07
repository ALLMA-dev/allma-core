// allma-core/examples/optiroq/src/portal-ui/src/features/rfq-wizard/components/PartSelector.tsx
import { useState, useMemo } from 'react';
import { Combobox, TextInput, useCombobox, Group, Text, Checkbox, ScrollArea, Badge, ActionIcon, Box } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { BOMPart } from '@optiroq/types';
import { IconX } from '@tabler/icons-react';

interface PartSelectorProps {
  bomParts: BOMPart[];
  selectedParts: string[];
  onSelectionChange: (selected: string[]) => void;
  error?: string;
}

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param str The string to truncate.
 * @param length The maximum length.
 * @returns The truncated string.
 */
const truncate = (str: string | undefined, length: number): string => {
  if (!str) {
    return '';
  }
  if (str.length <= length) {
    return str;
  }
  return str.substring(0, length) + '...';
};

export function PartSelector({ bomParts, selectedParts, onSelectionChange, error }: PartSelectorProps) {
  const { t } = useTranslation('rfq_wizard');
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex(),
  });

  const [search, setSearch] = useState('');

  const handleValueSelect = (val: string) => {
    const newSelection = selectedParts.includes(val)
      ? selectedParts.filter((v) => v !== val)
      : [...selectedParts, val];
    onSelectionChange(newSelection);
  };
  
  const handleValueRemove = (val: string) => {
    onSelectionChange(selectedParts.filter((v) => v !== val));
  };
  
  const selectedBadges = selectedParts.map((partName) => (
    <Badge
      key={partName}
      ff="monospace"
      rightSection={
        <ActionIcon size="xs" color="blue" radius="xl" variant="transparent" onClick={() => handleValueRemove(partName)}>
          <IconX size={10} />
        </ActionIcon>
      }
    >
      {partName}
    </Badge>
  ));

  const filteredOptions = useMemo(() => {
    const lowerCaseSearch = search.toLowerCase();
    return bomParts.filter(part =>
      part.partName.toLowerCase().includes(lowerCaseSearch) ||
      (part.material && part.material.toLowerCase().includes(lowerCaseSearch)) ||
      (part.partDescription && part.partDescription.toLowerCase().includes(lowerCaseSearch))
    );
  }, [bomParts, search]);

  const options = filteredOptions.map((item) => (
    <Combobox.Option value={item.partName} key={item.partName}>
      <Group align="flex-start">
        <Checkbox
          checked={selectedParts.includes(item.partName)}
          onChange={() => {}}
          aria-hidden
          tabIndex={-1}
          style={{ pointerEvents: 'none', marginTop: 4 }}
        />
        <Box>
            <Text ff="monospace">{item.partName}</Text>
            <Text size="xs" c="dimmed">{item.material}</Text>
            {item.partDescription && (
              <Text size="xs" c="dimmed" mt={4} style={{ whiteSpace: 'normal', maxWidth: '350px' }}>
                {truncate(item.partDescription, 200)}
              </Text>
            )}
        </Box>
      </Group>
    </Combobox.Option>
  ));

  return (
    <Box>
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={handleValueSelect}
    >
      <Combobox.Target>
        <TextInput
          label={t('step1.partNameLabel')}
          description={t('step1.partNameDesc')}
          placeholder={t('step1.partNamePlaceholder')}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
              combobox.closeDropdown();
              setSearch('');
          }}
          required
          error={error}
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
            <ScrollArea.Autosize type="scroll" mah={250}>
                {options.length > 0 ? options : <Combobox.Empty>{t('common:noResultsFound')}</Combobox.Empty>}
            </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
    
    {selectedParts.length > 0 && (
        <Group gap="xs" mt="sm">
            {selectedBadges}
        </Group>
    )}
    </Box>
  );
}