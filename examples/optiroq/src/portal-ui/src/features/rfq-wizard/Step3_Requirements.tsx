// NEW FILE
import { Stack, Checkbox, Fieldset, Title, Text, Badge } from '@mantine/core';
import { useRfqWizardStore } from '@/stores/useRfqWizardStore';
import { useTranslation } from 'react-i18next';

interface RequirementItemProps {
  labelKey: string;
  descriptionKey: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isCritical?: boolean;
}

function RequirementItem({ labelKey, descriptionKey, checked, onChange, disabled, isCritical }: RequirementItemProps) {
  const { t } = useTranslation('rfq_wizard');
  return (
    <Checkbox
      checked={checked}
      onChange={(event) => onChange(event.currentTarget.checked)}
      disabled={disabled}
      label={
        <>
          <Text component="span" fw={500}>{t(labelKey)}</Text>
          {isCritical && <Badge color="red" variant="light" ml="sm">{t('step3.critical')}</Badge>}
        </>
      }
      description={t(descriptionKey)}
      styles={{ description: { marginTop: 'var(--mantine-spacing-xs)' } }}
    />
  );
}

export function Step3_Requirements() {
  const { t } = useTranslation('rfq_wizard');
  const { requirements, actions } = useRfqWizardStore();

  const handleRequirementChange = (key: keyof typeof requirements, value: boolean) => {
    actions.setField('requirements', { ...requirements, [key]: value });
  };

  return (
    <Stack gap="xl">
      <Title order={4}>{t('step3.title')}</Title>
      <Text c="dimmed">{t('step3.subtitle')}</Text>
      
      <Fieldset legend={t('step3.requiredItemsTitle')} variant="filled">
        <Stack gap="lg">
          <RequirementItem labelKey="step3.reqMaterialCost" descriptionKey="step3.reqMaterialCostDesc" checked={requirements.material} onChange={(c) => handleRequirementChange('material', c)} disabled />
          <RequirementItem labelKey="step3.reqProcessCost" descriptionKey="step3.reqProcessCostDesc" checked={requirements.process} onChange={(c) => handleRequirementChange('process', c)} disabled />
          <RequirementItem labelKey="step3.reqToolingCost" descriptionKey="step3.reqToolingCostDesc" checked={requirements.tooling} onChange={(c) => handleRequirementChange('tooling', c)} disabled isCritical />
          <RequirementItem labelKey="step3.reqLogisticsCost" descriptionKey="step3.reqLogisticsCostDesc" checked={requirements.logistics} onChange={(c) => handleRequirementChange('logistics', c)} disabled />
          <RequirementItem labelKey="step3.reqPaymentTerms" descriptionKey="step3.reqPaymentTermsDesc" checked={requirements.terms} onChange={(c) => handleRequirementChange('terms', c)} disabled />
          <RequirementItem labelKey="step3.reqCapacity" descriptionKey="step3.reqCapacityDesc" checked={requirements.capacity} onChange={(c) => handleRequirementChange('capacity', c)} disabled />
        </Stack>
      </Fieldset>
      
      <Fieldset legend={t('step3.optionalItemsTitle')}>
        <Stack gap="lg">
          <RequirementItem labelKey="step3.optQuality" descriptionKey="step3.optQualityDesc" checked={requirements.quality || false} onChange={(c) => handleRequirementChange('quality', c)} />
          <RequirementItem labelKey="step3.optPrototype" descriptionKey="step3.optPrototypeDesc" checked={requirements.prototype || false} onChange={(c) => handleRequirementChange('prototype', c)} />
          <RequirementItem labelKey="step3.optSustainability" descriptionKey="step3.optSustainabilityDesc" checked={requirements.sustainability || false} onChange={(c) => handleRequirementChange('sustainability', c)} />
        </Stack>
      </Fieldset>
    </Stack>
  );
}