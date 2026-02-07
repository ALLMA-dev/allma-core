import { useState, useMemo } from 'react';
import { Modal, Checkbox, ScrollArea, TextInput, Stack, Group, Button, Fieldset, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { groupBy } from 'lodash-es';
import { MasterField } from '@optiroq/types';

interface AddFieldModalProps {
  opened: boolean;
  onClose: () => void;
  onAddFields: (fieldKeys: string[]) => void;
  availableFields: MasterField[];
}

export function AddFieldModal({ opened, onClose, onAddFields, availableFields }: AddFieldModalProps) {
  const { t } = useTranslation(['project_edit', 'translation', 'groups']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const filteredAndGroupedFields = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = availableFields.filter(field =>
      t(`translation:masterFields.${field.key}.label`, { defaultValue: field.displayName }).toLowerCase().includes(lowerCaseQuery) ||
      (field.description && t(`translation:masterFields.${field.key}.description`, { defaultValue: field.description }).toLowerCase().includes(lowerCaseQuery))
    );
    return groupBy(filtered, 'subgroup');
  }, [availableFields, searchQuery, t]);

  const handleAdd = () => {
    onAddFields(selectedFields);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setSelectedFields([]);
    setSearchQuery('');
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('addFieldModalTitle')}
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack>
        <TextInput
          placeholder={t('searchFieldsPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
        />
        <Checkbox.Group value={selectedFields} onChange={setSelectedFields}>
          <Stack gap="md">
            {Object.entries(filteredAndGroupedFields).map(([subgroupName, fields]) => (
              <Fieldset key={subgroupName} legend={t(`${subgroupName}`, { ns: 'groups', defaultValue: subgroupName })}>
                <Stack gap="sm">
                  {fields.map(field => (
                    <Checkbox
                      key={field.key}
                      value={field.key}
                      label={t(`translation:masterFields.${field.key}.label`, { defaultValue: field.displayName })}
                      description={field.description ? <Text size="xs" c="dimmed">{t(`translation:masterFields.${field.key}.description`, { defaultValue: field.description })}</Text> : undefined}
                    />
                  ))}
                </Stack>
              </Fieldset>
            ))}
            {Object.keys(filteredAndGroupedFields).length === 0 && (
                <Text c="dimmed" ta="center" mt="md">{t('noFieldsFound')}</Text>
            )}
          </Stack>
        </Checkbox.Group>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>{t('project_edit:cancel')}</Button>
          <Button onClick={handleAdd} disabled={selectedFields.length === 0}>{t('addSelectedFields')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}