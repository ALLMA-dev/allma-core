import { useState, useMemo, useEffect } from 'react';
import { Fieldset, SimpleGrid, Button, Group, ActionIcon, Tooltip, Box, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { MasterField, FieldPriority } from '@optiroq/types';
import { DynamicFormControl } from '@/components/shared/DynamicFormControl';
import { groupBy } from 'lodash-es';
import { IconPlus, IconX } from '@tabler/icons-react';
import { AddFieldModal } from '@/components/shared/AddFieldModal';

/**
 * Default unit configuration for convertible value fields.
 * When a new convertible field is added, it will be initialized with
 * the corresponding default unit from this object.
 */
export interface DefaultUnits {
  defaultCurrency?: string;
  defaultWeightUnit?: string;
  defaultLengthUnit?: string;
  defaultVolumeUnit?: string;
}

interface DynamicFormSectionProps {
  fields: MasterField[];
  data: Record<string, any>;
  onFieldChange: (key: string, value: any) => void;
  disabled?: boolean;
  /** Optional default units for convertible value fields. */
  defaultUnits?: DefaultUnits;
}

export function DynamicFormSection({ fields, data, onFieldChange, disabled, defaultUnits }: DynamicFormSectionProps) {
  const { t } = useTranslation(['groups', 'project_edit', 'common']);
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize visible optional fields based on whether they already have data
  useEffect(() => {
    const initialVisible = new Set<string>();
    fields.forEach(field => {
      if ((field.priority === FieldPriority.OPTIONAL || field.priority === FieldPriority.RECOMMENDED) && data[field.key] != null && data[field.key] !== '') {
        initialVisible.add(field.key);
      }
    });
    setVisibleOptionalFields(initialVisible);
  }, [fields, data]);

  const { currentlyVisibleFields, availableOptionalFields } = useMemo(() => {
    const visible = fields.filter(f =>
      f.priority === FieldPriority.MUST_HAVE || visibleOptionalFields.has(f.key)
    );
    const available = fields.filter(f =>
      (f.priority === FieldPriority.OPTIONAL || f.priority === FieldPriority.RECOMMENDED) &&
      !visible.some(vf => vf.key === f.key)
    );
    return { currentlyVisibleFields: visible, availableOptionalFields: available };
  }, [fields, visibleOptionalFields]);

  const handleAddFields = (keys: string[]) => {
    setVisibleOptionalFields(prev => new Set([...prev, ...keys]));
    keys.forEach(key => {
        const field = availableOptionalFields.find(f => f.key === key);
        if (!field) return;

        const isConvertible = ['currency', 'weight', 'length', 'volume'].includes(field.fieldType);
        if (isConvertible && defaultUnits) {
            let defaultUnit: string | undefined;
            switch(field.fieldType) {
                case 'currency': defaultUnit = defaultUnits.defaultCurrency; break;
                case 'weight': defaultUnit = defaultUnits.defaultWeightUnit; break;
                case 'length': defaultUnit = defaultUnits.defaultLengthUnit; break;
                case 'volume': defaultUnit = defaultUnits.defaultVolumeUnit; break;
            }
            onFieldChange(key, { value: null, unit: defaultUnit });
        }
    });
  };

  const handleDeleteField = (key: string) => {
    setVisibleOptionalFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
    onFieldChange(key, undefined);
  };

  const groupedByGroup = groupBy(currentlyVisibleFields.sort((a, b) => (a.group.localeCompare(b.group)) || (a.display_order - b.display_order)), 'group');

  return (
    <Stack>
      {Object.entries(groupedByGroup).map(([groupName, groupFields]) => {
        const groupedBySubgroup = groupBy(groupFields.sort((a,b) => a.display_order - b.display_order), 'subgroup');
        return (
          <Fieldset key={groupName} legend={t(`${groupName}`, { ns: 'groups', defaultValue: groupName })} mb="xl">
            {Object.entries(groupedBySubgroup).map(([subgroupName, subgroupFields]) => (
                <Fieldset key={subgroupName} legend={t(`${subgroupName}`, { ns: 'groups', defaultValue: subgroupName })} mb="lg" variant="filled">
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    {subgroupFields.map((field) => {
                        const isRemovable = field.priority === FieldPriority.OPTIONAL || field.priority === FieldPriority.RECOMMENDED;
                        return (
                        <Group key={field.key} align="flex-start" gap="xs" wrap="nowrap">
                            <Box style={{ flex: 1 }}>
                            <DynamicFormControl
                                field={field}
                                value={data[field.key]}
                                onChange={(value) => onFieldChange(field.key, value)}
                                disabled={disabled}
                            />
                            </Box>
                            {isRemovable && !disabled && (
                            <Tooltip label={t('project_edit:deleteField')}>
                                <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteField(field.key)} mt={28}>
                                <IconX size={16} />
                                </ActionIcon>
                            </Tooltip>
                            )}
                        </Group>
                        );
                    })}
                    </SimpleGrid>
                </Fieldset>
            ))}
          </Fieldset>
        );
      })}

      {availableOptionalFields.length > 0 && !disabled && (
        <Group justify="flex-start" mt="md">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setIsModalOpen(true)}
          >
            {t('common:Add Field')}
          </Button>
        </Group>
      )}

      <AddFieldModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddFields={handleAddFields}
        availableFields={availableOptionalFields}
      />
    </Stack>
  );
}
