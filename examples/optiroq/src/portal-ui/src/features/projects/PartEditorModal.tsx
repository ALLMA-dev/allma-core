import { useEffect, useState, useMemo } from 'react';
import { Modal, Button, Group, Stack, Fieldset, SimpleGrid, ActionIcon, Tooltip, Box } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { BOMPart, MasterField, FieldPriority, buildZodSchema } from '@optiroq/types';
import { DynamicFormControl } from './DynamicFormControl';
import { groupBy } from 'lodash-es';
import { IconPlus, IconX } from '@tabler/icons-react';
import { AddFieldModal } from '@/components/shared/AddFieldModal';
import { useProjectEditStore } from '@/stores/projectEditStore';

interface PartEditorModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (part: BOMPart) => void;
  partToEdit?: BOMPart | null;
  partFields: MasterField[];
}

export function PartEditorModal({ opened, onClose, onSave, partToEdit, partFields }: PartEditorModalProps) {
  const { t } = useTranslation(['project_edit', 'translation', 'common']);
  const isEditing = !!partToEdit;
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const project = useProjectEditStore((state) => state.project);

  const partSchema = useMemo(() => buildZodSchema(partFields), [partFields]);

  const form = useForm({
    initialValues: {},
    validate: zodResolver(partSchema),
  });

  // Effect to reset form and state when modal opens
  useEffect(() => {
    if (opened) {
      // Start with the part to edit, or an empty object for a new part.
      const initialValues: Record<string, any> = (isEditing && partToEdit) ? { ...partToEdit } : {};
      
      const initialVisible = new Set<string>();

      // 1. Determine which optional fields should be visible from the start based on existing data.
      partFields.forEach(field => {
        const hasValue = initialValues[field.key] != null && initialValues[field.key] !== '';
        if ((field.priority === FieldPriority.OPTIONAL || field.priority === FieldPriority.RECOMMENDED) && hasValue) {
          initialVisible.add(field.key);
        }
      });
      setVisibleOptionalFields(initialVisible);

      // 2. Ensure all mandatory fields and initially visible optional fields have the correct object structure for convertible types.
      partFields.forEach(field => {
        const isMandatory = Array.isArray(field.validationRules) && field.validationRules.some(r => r.type === 'required');
        const isVisibleOptional = initialVisible.has(field.key);

        if (!isMandatory && !isVisibleOptional) return;

        const isConvertible = ['currency', 'weight', 'length', 'volume'].includes(field.fieldType);
        if (!isConvertible) return;

        const currentValue = initialValues[field.key];
        
        // If the field is missing or not in the correct object format, create the default structure.
        if (currentValue === undefined || currentValue === null || typeof currentValue !== 'object' || !('unit' in currentValue)) {
            let defaultUnit: string | undefined;
            switch(field.fieldType) {
                case 'currency': defaultUnit = project.defaultCurrency; break;
                case 'weight': defaultUnit = project.defaultWeightUnit; break;
                case 'length': defaultUnit = project.defaultLengthUnit; break;
                case 'volume': defaultUnit = project.defaultVolumeUnit; break;
            }
            initialValues[field.key] = {
                value: typeof currentValue === 'number' ? currentValue : null, // Preserve numeric value if it was a plain number
                unit: defaultUnit
            };
        }
      });

      form.setValues(initialValues);
      form.clearErrors();
    } else {
      form.reset();
      setVisibleOptionalFields(new Set());
    }
  }, [partToEdit, isEditing, opened, partFields, project, form.setValues, form.clearErrors, form.reset]);

  const { currentlyVisibleFields, availableOptionalFields } = useMemo(() => {
    const visible = partFields.filter(f =>
      f.priority === FieldPriority.MUST_HAVE || visibleOptionalFields.has(f.key)
    );
    const available = partFields.filter(f =>
      (f.priority === FieldPriority.OPTIONAL || f.priority === FieldPriority.RECOMMENDED) &&
      !visible.some(vf => vf.key === f.key)
    );
    return { currentlyVisibleFields: visible, availableOptionalFields: available };
  }, [partFields, visibleOptionalFields]);

  const handleAddFields = (keys: string[]) => {
    setVisibleOptionalFields(prev => new Set([...prev, ...keys]));
    keys.forEach(key => {
        const field = availableOptionalFields.find(f => f.key === key);
        if (!field) return;

        const isConvertible = ['currency', 'weight', 'length', 'volume'].includes(field.fieldType);
        if (isConvertible) {
            let defaultUnit: string | undefined;
            switch(field.fieldType) {
                case 'currency': defaultUnit = project.defaultCurrency; break;
                case 'weight': defaultUnit = project.defaultWeightUnit; break;
                case 'length': defaultUnit = project.defaultLengthUnit; break;
                case 'volume': defaultUnit = project.defaultVolumeUnit; break;
            }
            form.setFieldValue(key, { value: null, unit: defaultUnit });
        }
    });
  };

  const handleDeleteField = (key: string) => {
    setVisibleOptionalFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
    form.setFieldValue(key, undefined); // Clear the value from the form state
  };

  const handleSubmit = (values: any) => {
    onSave(values as BOMPart);
    onClose();
  };

  const groupedBySubgroup = groupBy(currentlyVisibleFields.sort((a,b) => a.display_order - b.display_order), 'subgroup');

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={isEditing ? t('partEditorTitle_edit', { partName: partToEdit?.partName }) : t('partEditorTitle_new')}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
          <Stack>
            {Object.entries(groupedBySubgroup).map(([subgroupName, subgroupFields]) => (
              <Fieldset key={subgroupName} legend={t(`groups:${subgroupName}`, { defaultValue: subgroupName })} mb="lg" variant="filled">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  {subgroupFields.map(field => {
                    const isRemovable = field.priority === FieldPriority.OPTIONAL || field.priority === FieldPriority.RECOMMENDED;
                    return (
                      <Group key={field.key} align="flex-start" gap="xs" wrap="nowrap">
                        <Box style={{ flex: 1 }}>
                           <DynamicFormControl
                                field={field}
                                value={form.values[field.key]}
                                onChange={(value) => form.setFieldValue(field.key, value)}
                                error={form.errors[field.key] as string | undefined}
                            />
                        </Box>
                        {isRemovable && (
                          <Tooltip label={t('deleteField')}>
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

            {availableOptionalFields.length > 0 && (
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

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onClose}>{t('cancel')}</Button>
              <Button type="submit">{t('savePart')}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <AddFieldModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddFields={handleAddFields}
        availableFields={availableOptionalFields}
      />
    </>
  );
}