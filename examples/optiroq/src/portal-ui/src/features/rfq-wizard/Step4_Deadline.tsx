// NEW FILE
import { Stack, Select, Textarea } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useRfqWizardStore } from '@/stores/useRfqWizardStore';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n';

export function Step4_Deadline() {
  const { t } = useTranslation(['rfq_wizard', 'header']);
  const { responseDeadline, additionalNotes, languagePreference, actions } = useRfqWizardStore();
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 3); // Must be at least 3 days from today

  const languageOptions = supportedLanguages.map(lang => ({
    value: lang.nativeName,
    label: t(`header:language_${lang.code}`, lang.nativeName),
  }));

  return (
    <Stack gap="xl">
      <DatePickerInput
        label={t('step4.deadlineLabel')}
        description={t('step4.deadlineDesc')}
        value={responseDeadline ? new Date(responseDeadline) : null}
        onChange={(date: any) => actions.setField('responseDeadline', date ? date.toISOString().split('T')[0] : '')}
        minDate={minDate}
        required
      />
      <Textarea
        label={t('step4.notesLabel')}
        description={t('step4.notesDesc')}
        placeholder={t('step4.notesPlaceholder')}
        value={additionalNotes || ''}
        onChange={(event) => actions.setField('additionalNotes', event.currentTarget.value)}
        rows={4}
        maxLength={1000}
      />
      <Select
        label={t('step4.languageLabel')}
        description={t('step4.languageDesc')}
        data={languageOptions}
        value={languagePreference}
        onChange={(val) => actions.setField('languagePreference', val || 'English')}
        required
      />
    </Stack>
  );
}
