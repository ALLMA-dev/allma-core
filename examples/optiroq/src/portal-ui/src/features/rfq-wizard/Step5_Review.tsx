import { Stack, Alert, List, Badge, Text } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { useRfqWizardStore } from '@/stores/useRfqWizardStore';
import { useTranslation } from 'react-i18next';
import { ReviewSection } from './components/ReviewSection';
import { format } from 'date-fns';

export function Step5_Review() {
  const { t } = useTranslation('rfq_wizard');
  const {
    rfqId,
    parts,
    partDescriptions,
    volumeScenarios,
    commodity,
    attachments,
    suppliers,
    requirements,
    responseDeadline,
    additionalNotes,
    languagePreference,
    actions,
  } = useRfqWizardStore();

  const selectedSuppliers = suppliers.filter(s => s.selected);
  const selectedRequirements = Object.entries(requirements)
    .filter(([, value]) => value === true)
    .map(([key]) => t(`step3.req${key.charAt(0).toUpperCase() + key.slice(1)}`, { ns: 'rfq_wizard', defaultValue: key }));


  return (
    <Stack gap="xl">
      <Alert color="green" icon={<IconCircleCheck />} title={t('step5.readyToSendTitle')}>
        {t('step5.readyToSendDesc')}
      </Alert>

      <ReviewSection title={t('step1_label')} onEdit={() => actions.setStep(1)}>
        <Stack gap="md">
          <Text><strong>{t('step5.projectIdLabel')}:</strong> {rfqId}</Text>
          <Text><strong>{t('step5.partsLabel')}:</strong></Text>
          <List>
            {parts.map(p => <List.Item key={p}>{p} - {partDescriptions?.[p]}</List.Item>)}
          </List>
          <Text><strong>{t('step5.volumesLabel')}:</strong></Text>
          <List>
            {volumeScenarios.map((v, i) => <List.Item key={i}>{v.volume.toLocaleString()} {v.unit}</List.Item>)}
          </List>
           <Text><strong>{t('step1.commodityTypeLabel')}:</strong> {commodity}</Text>
          <Text><strong>{t('step1.attachmentsLabel')}:</strong> {attachments?.length || 0} {t('step5.filesAttached')}</Text>
        </Stack>
      </ReviewSection>

      <ReviewSection title={t('step2_label')} onEdit={() => actions.setStep(2)}>
        <Text><strong>{t('step5.suppliersCount', { count: selectedSuppliers.length })}</strong></Text>
        <List>
            {selectedSuppliers.map(s => <List.Item key={s.email}>{s.name} ({s.email})</List.Item>)}
        </List>
      </ReviewSection>
      
      <ReviewSection title={t('step3_label')} onEdit={() => actions.setStep(3)}>
        <List icon={<IconCircleCheck size={16} color="var(--mantine-color-green-6)" />}>
            {selectedRequirements.map(r => <List.Item key={r}>{r}</List.Item>)}
        </List>
      </ReviewSection>

      <ReviewSection title={t('step4_label')} onEdit={() => actions.setStep(4)}>
        <Stack gap="sm">
            <Text><strong>{t('step4.deadlineLabel')}:</strong> {format(new Date(responseDeadline), 'PPP')}</Text>
            <Text><strong>{t('step4.notesLabel')}:</strong> {additionalNotes || t('common:N/A')}</Text>
            <Text><strong>{t('step4.languageLabel')}:</strong> {languagePreference}</Text>
        </Stack>
      </ReviewSection>
    </Stack>
  );
}