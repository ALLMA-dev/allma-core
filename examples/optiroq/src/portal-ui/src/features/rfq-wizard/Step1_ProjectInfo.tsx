// allma-core/examples/optiroq/src/portal-ui/src/features/rfq-wizard/Step1_ProjectInfo.tsx
import { Stack } from '@mantine/core';
import { useRfqWizardStore } from '@/stores/useRfqWizardStore';
import { PartSelector } from './components/PartSelector';
import { PartDescriptionInputs } from './components/PartDescriptionInputs';
import { VolumeScenarioManager } from './components/VolumeScenarioManager';
import { CommoditySelect } from '../projects/CommoditySelect';
import { AttachmentsDropzone } from './components/AttachmentsDropzone';
import { useTranslation } from 'react-i18next';

export function Step1_ProjectInfo() {
  const { t } = useTranslation('rfq_wizard');
  const { parts, bomParts, partDescriptions, volumeScenarios, commodity, attachments, categorizedCommodities, actions, errors } = useRfqWizardStore();

  const getFieldError = (path: string): string | undefined => {
    if (!errors) return undefined;
    const issue = errors.issues.find(i => i.path.join('.') === path);
    // Translate the message key from Zod
    return issue ? t(issue.message as any) : undefined;
  };

  return (
    <Stack gap="xl">
      <PartSelector
        bomParts={bomParts}
        selectedParts={parts}
        onSelectionChange={(newSelection) => actions.setField('parts', newSelection)}
        error={getFieldError('parts')}
      />
      <PartDescriptionInputs
        selectedParts={parts}
        bomParts={bomParts}
        descriptions={partDescriptions || {}}
        onDescriptionChange={(partName, desc) => {
          const newDescriptions = { ...partDescriptions, [partName]: desc };
          actions.setField('partDescriptions', newDescriptions);
        }}
      />
      <VolumeScenarioManager
        scenarios={volumeScenarios}
        onScenariosChange={(newScenarios) => actions.setField('volumeScenarios', newScenarios)}
        errors={errors}
      />
      <CommoditySelect
        label={t('step1.commodityTypeLabel')}
        description={t('step1.commodityTypeDesc')}
        value={commodity}
        onChange={(val) => actions.setField('commodity', val || '')}
        categorizedCommodities={categorizedCommodities}
        required
        error={getFieldError('commodity')}
      />
      <AttachmentsDropzone
        attachments={attachments || []}
        onAttachmentsChange={(newAttachments) => actions.setField('attachments', newAttachments)}
      />
    </Stack>
  );
}