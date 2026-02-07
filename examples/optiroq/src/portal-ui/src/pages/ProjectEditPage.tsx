import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from 'use-debounce';
import { useApiView, useApiCommand } from '@/hooks/useApi';
import { ProjectEditViewModel, BOMPart, SUPPORTED_WEIGHT_UNITS } from '@optiroq/types';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageLoader } from '@/components/shared/PageLoader';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { Button, Group, Title, Box, Text, Fieldset, SimpleGrid, Select, Breadcrumbs, Anchor } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { IconDeviceFloppy, IconChevronRight, IconLoader } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useProjectEditStore } from '@/stores/projectEditStore';
import { DynamicFormSection } from '@/features/projects/DynamicFormSection';
import { PartsListTable } from '@/features/projects/PartsListTable';
import { PartEditorModal } from '@/features/projects/PartEditorModal';
import { useCurrencyStore } from '@/stores/useCurrencyStore';

export function ProjectEditPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation(['project_edit', 'groups', 'projects_dashboard', 'common']);
    const { rates } = useCurrencyStore();
    const currencyCodes = useMemo(() => rates ? Object.keys(rates.rates).sort() : [], [rates]);

    const isCreatingNew = !projectId;
    const queryId = projectId || 'new';
    
    const [editingPart, setEditingPart] = useState<BOMPart | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const project = useProjectEditStore((state) => state.project);
    const bomParts = useProjectEditStore((state) => state.bomParts);
    const { isDirty, isSaving, lastSaved, actions } = useProjectEditStore((state) => state);
    
    const { data, isLoading, error } = useApiView<ProjectEditViewModel>(
        'project-edit',
        queryId,
    );
    
    useEffect(() => {
        if (data) {
            actions.initialize(data);
        }
    }, [data, actions]);

    const { mutate: saveProject, isPending: isFinalSaving } = useApiCommand('project', queryId === 'new' ? null : queryId);

    const handleSaveDraft = useDebouncedCallback(() => {
        if (!isDirty) return;
        actions.setSavingStatus(true);
        saveProject({
            command: 'saveProject',
            payload: { project, bomParts, isDraft: true }
        }, {
            onSuccess: () => {
                actions.setSavingStatus(false);
            },
            onError: () => {
                actions.setSavingStatus(false);
            }
        });
    }, 1000);

    useEffect(() => {
        if (isDirty) {
            const interval = setInterval(handleSaveDraft, 60000); // Autosave every 60 seconds
            return () => clearInterval(interval);
        }
    }, [isDirty, handleSaveDraft]);

    const handleAddPart = () => {
        setEditingPart(null);
        setIsModalOpen(true);
    };

    const handleEditPart = (part: BOMPart) => {
        setEditingPart(part);
        setIsModalOpen(true);
    };

    const handleSavePart = (part: BOMPart) => {
        if (editingPart) {
            actions.updatePart(editingPart.partName, part);
        } else {
            actions.addPart(part);
        }
    };

    const dynamicProjectFields = useMemo(() => {
        return data?.projectFields.filter(f => f.key !== 'defaultCurrency' && f.key !== 'defaultWeightUnit') ?? [];
    }, [data?.projectFields]);
    
    if (isLoading) return <PageLoader />;

    if (error || !data) {
        return <AppShell><PageContainer title={t('common:Error')}><ErrorAlert title={t('errorLoadingTitle')} message={error?.message} /></PageContainer></AppShell>;
    }

    const isLimitedEditMode = !isCreatingNew && data.project.status !== 'DRAFT' && data.project.status !== 'DRAFT_AWAITING_REVIEW';
    const pageTitle = isCreatingNew ? t('createTitle') : isLimitedEditMode ? t('editTitle', { projectId: data.project.projectId }) : t('confirmTitle', { projectId: data.project.projectId });

    const handleFinalSave = () => {
        const isFinalizing = !isLimitedEditMode;
        saveProject({
            command: 'saveProject',
            payload: { project, bomParts, isDraft: false }
        }, {
            onSuccess: (response: any) => {
                notifications.show({ color: 'green', title: t('common:Success'), message: isFinalizing ? t('projectFinalized') : t('projectSaved') });
                navigate(`/projects/${response.projectId}`);
            },
        });
    }
    
    const breadcrumbs = [
        { title: t('projects_dashboard:Projects Dashboard'), href: '/projects' },
        { title: pageTitle, href: '#' }
    ].map((item, index) => (
        <Anchor component={Link} to={item.href} key={index}>
            {item.title}
        </Anchor>
    ));

    return (
        <ModalsProvider>
            <AppShell>
                <PartEditorModal
                    opened={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePart}
                    partToEdit={editingPart}
                    partFields={data.partFields}
                />
                <PageContainer
                    title={<Breadcrumbs>{breadcrumbs}</Breadcrumbs>}
                    rightSection={
                        <Group>
                             {isSaving && <Group gap="xs"><IconLoader size={16} className="animate-spin" /><Text size="sm" c="dimmed">{t('common:Saving...')}</Text></Group>}
                             {!isSaving && lastSaved && <Text size="sm" c="dimmed">{t('common:Saved!')}</Text>}
                            {!isLimitedEditMode && (
                                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveDraft} loading={isSaving} disabled={!isDirty}>
                                    {t('saveDraft')}
                                </Button>
                            )}
                            <Button rightSection={<IconChevronRight size={16} />} onClick={handleFinalSave} loading={isFinalSaving}>
                                {isLimitedEditMode ? t('saveChanges') : t('continueToAnalysis')}
                            </Button>
                        </Group>
                    }
                >
                    <Box>
                        <Title order={4} mb="md">{t('projectDetailsTitle')}</Title>
                        
                        <DynamicFormSection
                            fields={dynamicProjectFields}
                            data={project}
                            onFieldChange={actions.setProjectField}
                            disabled={isSaving || isFinalSaving || isLimitedEditMode}
                            defaultUnits={{
                                defaultCurrency: project.defaultCurrency,
                                defaultWeightUnit: project.defaultWeightUnit,
                                defaultLengthUnit: project.defaultLengthUnit,
                                defaultVolumeUnit: project.defaultVolumeUnit,
                            }}
                        />

                        <Fieldset legend={t('Project Defaults', { ns: 'groups' })} mt="xl" mb="xl">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                                <Select
                                    label={t('Default Currency', { ns: 'groups' })}
                                    description={t('Default currency for the project (e.g., EUR, USD).', { ns: 'groups' })}
                                    data={currencyCodes}
                                    value={project.defaultCurrency}
                                    onChange={(value) => actions.setProjectField('defaultCurrency', value)}
                                    searchable
                                    disabled={isSaving || isFinalSaving || isLimitedEditMode}
                                />
                                <Select
                                    label={t('Default Weight Unit', { ns: 'groups' })}
                                    description={t('Default weight unit for the project (e.g., kg, g, lb).', { ns: 'groups' })}
                                    data={[...SUPPORTED_WEIGHT_UNITS]}
                                    value={project.defaultWeightUnit}
                                    onChange={(value) => actions.setProjectField('defaultWeightUnit', value)}
                                    disabled={isSaving || isFinalSaving || isLimitedEditMode}
                                />
                            </SimpleGrid>
                        </Fieldset>

                        <Title order={4} mt="xl" mb="md">{t('partsListTitle')}</Title>
                        <PartsListTable
                            parts={bomParts}
                            partFields={data.partFields}
                            variant="edit"
                            onAdd={handleAddPart}
                            onEdit={handleEditPart}
                            onDelete={actions.deletePart}
                        />
                    </Box>
                </PageContainer>
            </AppShell>
        </ModalsProvider>
    );
}