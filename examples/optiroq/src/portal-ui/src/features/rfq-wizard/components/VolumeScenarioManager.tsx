// allma-core/examples/optiroq/src/portal-ui/src/features/rfq-wizard/components/VolumeScenarioManager.tsx
import { Stack, Text, Group, Button, NumberInput, Select, ActionIcon } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconX } from '@tabler/icons-react';
import { z } from 'zod';

interface VolumeScenario {
  volume: number;
  unit: string;
}

interface VolumeScenarioManagerProps {
  scenarios: VolumeScenario[];
  onScenariosChange: (newScenarios: VolumeScenario[]) => void;
  errors?: z.ZodError | null;
}

const unitOptions = ['pieces/year', 'kg/year', 'liters/year', 'units/year'];

export function VolumeScenarioManager({ scenarios, onScenariosChange, errors }: VolumeScenarioManagerProps) {
  const { t } = useTranslation('rfq_wizard');

  const arrayError = errors?.issues.find(issue => issue.path.length === 1 && issue.path[0] === 'volumeScenarios')?.message;

  const handleAddScenario = () => {
    onScenariosChange([...scenarios, { volume: 0, unit: 'pieces/year' }]);
  };

  const handleRemoveScenario = (index: number) => {
    if (scenarios.length > 1) {
      onScenariosChange(scenarios.filter((_, i) => i !== index));
    }
  };

  const handleScenarioChange = (index: number, field: keyof VolumeScenario, value: any) => {
    const newScenarios = [...scenarios];
    if(field === 'volume') {
        newScenarios[index][field] = value === '' ? 0 : Number(value);
    } else {
        newScenarios[index][field] = value;
    }
    onScenariosChange(newScenarios);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Text fw={500}>{t('step1.volumeScenariosLabel')}</Text>
          <Text size="sm" c="dimmed">{t('step1.volumeScenariosDesc')}</Text>
        </div>
        <Button variant="outline" size="xs" leftSection={<IconPlus size={14} />} onClick={handleAddScenario}>
          {t('step1.addScenario')}
        </Button>
      </Group>

      <Stack gap="sm">
        {scenarios.map((scenario, index) => {
          const itemError = errors?.issues.find(issue => issue.path.join('.') === `volumeScenarios.${index}.volume`)?.message;
          return (
            <Group key={index} grow wrap="nowrap" align="flex-start">
              <NumberInput
                placeholder={t('step1.volumePlaceholder')}
                value={scenario.volume}
                onChange={(val) => handleScenarioChange(index, 'volume', val)}
                thousandSeparator
                min={0}
                error={itemError ? t(itemError as any) : undefined}
              />
              <Select
                data={unitOptions}
                value={scenario.unit}
                onChange={(val) => handleScenarioChange(index, 'unit', val)}
              />
              {scenarios.length > 1 && (
                <ActionIcon variant="subtle" color="red" onClick={() => handleRemoveScenario(index)} mt={4}>
                  <IconX size={16} />
                </ActionIcon>
              )}
            </Group>
          );
        })}
      </Stack>
      {arrayError && <Text c="red" size="xs" mt="xs">{t(arrayError as any)}</Text>}
    </Stack>
  );
}