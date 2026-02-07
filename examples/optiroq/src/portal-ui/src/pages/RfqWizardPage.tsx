// allma-core/examples/optiroq/src/portal-ui/src/pages/RfqWizardPage.tsx
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { useApiView, useApiCommand } from '@/hooks/useApi';
import { RfqEditViewModel } from '@optiroq/types';
import { PageLoader } from '@/components/shared/PageLoader';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { useTranslation } from 'react-i18next';

import { Stepper, Button, Group, Card, Title, Text, Progress, Box, Badge } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconSend } from '@tabler/icons-react';
import { useRfqWizardStore } from '@/stores/useRfqWizardStore';
import { Step1_ProjectInfo } from '@/features/rfq-wizard/Step1_ProjectInfo';
import { Step2_Suppliers } from '@/features/rfq-wizard/Step2_Suppliers';
import { Step3_Requirements } from '@/features/rfq-wizard/Step3_Requirements';
import { Step4_Deadline } from '@/features/rfq-wizard/Step4_Deadline';
import { Step5_Review } from '@/features/rfq-wizard/Step5_Review';
import { notifications } from '@mantine/notifications';

const STEPS = 5;

export function RfqWizardPage() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['rfq_wizard', 'common']);

  const { data, isLoading, error } = useApiView<RfqEditViewModel>('rfq-edit', rfqId!);
  
  const {
    currentStep,
    errors,
    actions,
    getRfqPayload,
    isSubmitting,
    parts,
    bomParts,
    categorizedCommodities,
  } = useRfqWizardStore();

  const isStepValid = errors === null;

  useEffect(() => {
    if (data) {
      actions.initialize(data);
    }
  }, [data, actions]);

  const { mutate: updateRfqCommand } = useApiCommand('rfq', rfqId);
  const { mutate: sendRfqCommand } = useApiCommand('rfq', rfqId);

  // MODIFIED: Calculate required commodity IDs based on selected parts
  const requiredCommodityIds = useMemo(() => {
    const selectedMaterials = parts
        .map(partName => bomParts.find(p => p.partName === partName)?.material)
        .filter((m): m is string => !!m)
        .map(m => m.toLowerCase());
    
    if (selectedMaterials.length === 0) return [];
    
    const allCommodities = categorizedCommodities.flatMap(c => c.commodities);
    const matchedIds = new Set<string>();

    for (const material of selectedMaterials) {
        for (const commodity of allCommodities) {
            // Match if material contains commodity name or vice-versa (e.g., "Alu 6061" matches "Aluminum")
            if (material.includes(commodity.name.toLowerCase()) || commodity.name.toLowerCase().includes(material)) {
                matchedIds.add(commodity.id);
            }
        }
    }
    return Array.from(matchedIds);
  }, [parts, bomParts, categorizedCommodities]);

  const handleNext = () => {
    if (currentStep < STEPS) {
      actions.goToNextStep();
    }
  };
  
  const handleSaveAndExit = () => {
    actions.setSubmitting(true);
    updateRfqCommand({
        command: 'updateRfq',
        payload: getRfqPayload(),
        suppressNotification: true,
    }, {
        onSuccess: () => {
            notifications.show({ title: t('common:Success'), message: t('draftSavedSuccess'), color: 'green' });
            navigate(`/projects/${data?.rfq.projectId}`);
        },
        onSettled: () => actions.setSubmitting(false),
    });
  };

  const handleSubmit = () => {
    actions.setSubmitting(true);
    updateRfqCommand({
        command: 'updateRfq',
        payload: getRfqPayload(),
        suppressNotification: true,
    }, {
        onSuccess: () => {
            sendRfqCommand({ command: 'sendRfq', suppressNotification: true }, {
                onSuccess: () => {
                    notifications.show({ title: t('common:Success'), message: t('rfqSentSuccess'), color: 'green' });
                    navigate(`/projects/${data?.rfq.projectId}`);
                },
                onSettled: () => actions.setSubmitting(false),
            });
        },
        onError: () => actions.setSubmitting(false),
    });
  };

  if (isLoading) {
    return <AppShell><PageLoader /></AppShell>;
  }

  if (error || !data) {
    return <AppShell><PageContainer title={t('common:Error')}><ErrorAlert title={t('errorLoadingTitle')} message={error?.message} /></PageContainer></AppShell>;
  }

  const progressPercent = ((currentStep - 1) / (STEPS - 1)) * 100;

  return (
    <AppShell>
      <PageContainer title={t('pageTitle')}>
        <Card withBorder radius="md" p="lg" maw="56rem" mx="auto">
          <Box p="md">
            <Group justify="space-between">
              <div>
                <Title order={3}>{t('cardTitle')}</Title>
                <Text c="dimmed" size="sm">{t('cardSubtitle', { rfqId })}</Text>
              </div>
              <Badge variant="outline" size="lg">{t('stepXofY', { current: currentStep, total: STEPS })}</Badge>
            </Group>
            <Progress value={progressPercent} mt="md" />
          </Box>
          <Stepper active={currentStep - 1} onStepClick={(stepIndex) => actions.setStep(stepIndex + 1)} allowNextStepsSelect={false} p="md">
            <Stepper.Step label={t('step1_label')} description={t('step1_desc')} />
            <Stepper.Step label={t('step2_label')} description={t('step2_desc')} />
            <Stepper.Step label={t('step3_label')} description={t('step3_desc')} />
            <Stepper.Step label={t('step4_label')} description={t('step4_desc')} />
            <Stepper.Step label={t('step5_label')} description={t('step5_desc')} />
          </Stepper>

          <Box mt="xl" p="md">
            {currentStep === 1 && <Step1_ProjectInfo />}
            {currentStep === 2 && <Step2_Suppliers requiredCommodityIds={requiredCommodityIds} />}
            {currentStep === 3 && <Step3_Requirements />}
            {currentStep === 4 && <Step4_Deadline />}
            {currentStep === 5 && <Step5_Review />}
          </Box>
          
          <Group justify="space-between" p="md" mt="xl" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)'}}>
            <Button variant="default" onClick={handleSaveAndExit} loading={isSubmitting}>
                {t('common:Save & Exit')}
            </Button>
            <Group>
                {currentStep > 1 && (
                    <Button variant="default" leftSection={<IconChevronLeft size={16} />} onClick={actions.goToPrevStep}>
                        {t('common:Previous')}
                    </Button>
                )}
                {currentStep < STEPS ? (
                    <Button rightSection={<IconChevronRight size={16} />} onClick={handleNext} disabled={!isStepValid}>
                        {t('common:Next')}
                    </Button>
                ) : (
                    <Button rightSection={<IconSend size={16} />} onClick={handleSubmit} disabled={!isStepValid} loading={isSubmitting}>
                        {t('sendRfq')}
                    </Button>
                )}
            </Group>
          </Group>
        </Card>
      </PageContainer>
    </AppShell>
  );
}