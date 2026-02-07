import { Stack, Text, Card, Textarea, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { BOMPart } from '@optiroq/types';

interface PartDescriptionInputsProps {
  selectedParts: string[];
  bomParts: BOMPart[];
  descriptions: Record<string, string>;
  onDescriptionChange: (partName: string, description: string) => void;
}

export function PartDescriptionInputs({ selectedParts, bomParts, descriptions, onDescriptionChange }: PartDescriptionInputsProps) {
  const { t } = useTranslation('rfq_wizard');

  if (selectedParts.length === 0) {
    return (
      <Alert icon={<IconInfoCircle size={16} />} color="blue">
        {t('step1.noPartsSelected')}
      </Alert>
    );
  }

  return (
    <Stack>
      <Text fw={500}>{t('step1.partDescriptionsLabel')}</Text>
      <Text size="sm" c="dimmed">{t('step1.partDescriptionsDesc')}</Text>
      {selectedParts.map(partName => {
        const bomPart = bomParts.find(p => p.partName === partName);
        return (
          <Card key={partName} withBorder p="md">
            <Text fw={700} ff="monospace">{partName}</Text>
            {bomPart?.material && <Text size="xs" c="dimmed">{bomPart.material}</Text>}
            <Textarea
              mt="sm"
              placeholder={t('step1.partDescriptionPlaceholder')}
              value={descriptions[partName] ?? bomPart?.partDescription ?? ''}
              onChange={(event) => onDescriptionChange(partName, event.currentTarget.value)}
              autosize
              minRows={2}
              maxLength={500}
            />
          </Card>
        );
      })}
    </Stack>
  );
}