import { Link, useNavigate, useParams } from 'react-router-dom';
import { Accordion, Alert, Loader, Button, Tooltip, Group, Text, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconPlayerPlay, IconSettings, IconRefresh } from '@tabler/icons-react';
import { PageContainer } from '@allma/ui-components';
import { useGetExecutionDetail } from '../../api/executionService';
import { useState, useEffect } from 'react';
import { ExecutionsBreadcrumbs } from './ExecutionsBreadcrumbs';
import { useDisclosure } from '@mantine/hooks';
import { ExecutionSummary } from './components/ExecutionSummary';
import { ContextDiffModal } from './components/ContextDiffModal';
import { AllmaStepExecutionRecord, StepType, StepInstance } from '@allma/core-types';
import { ParallelStepAccordionItem } from './components/ParallelStepAccordionItem';
import { StandardStepAccordionItem } from './components/StandardStepAccordionItem';
import { StatefulRedriveModal } from './components/StatefulRedriveModal';
import { StepConfigurationDrawer } from './components/StepConfigurationDrawer';
import { useGetFlowByVersion, useFlowRedrive } from '../../api/flowService';
import { modals } from '@mantine/modals';
import { useQueryClient } from '@tanstack/react-query';
import { EXECUTION_DETAIL_QUERY_KEY, EXECUTIONS_LIST_QUERY_KEY } from './constants';
import { notifications } from '@mantine/notifications';

export function ExecutionDetailPage() {
    const { flowExecutionId } = useParams<{ flowExecutionId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: execution, isLoading, error, isRefetching } = useGetExecutionDetail(flowExecutionId);
    
    const { data: flowDef, isLoading: isLoadingFlowDef } = useGetFlowByVersion(
        execution?.metadata.flowDefinitionId,
        execution?.metadata.flowDefinitionVersion ? String(execution.metadata.flowDefinitionVersion) : undefined
    );

    const [openItems, setOpenItems] = useState<string[]>([]);
    
    const [diffData, setDiffData] = useState<{ left: any; right: any; stepId: string } | null>(null);
    const [diffModalOpened, { open: openDiffModal, close: closeDiffModal }] = useDisclosure(false);
    
    const [stepToRedrive, setStepToRedrive] = useState<AllmaStepExecutionRecord | null>(null);
    const [redriveModalOpened, { open: openRedriveModal, close: closeRedriveModal }] = useDisclosure(false);

    const [stepConfigToShow, setStepConfigToShow] = useState<StepInstance | null>(null);
    const [configDrawerOpened, { open: openConfigDrawer, close: closeConfigDrawer }] = useDisclosure(false);

    // State for the redirect timer
    const [redirectInfo, setRedirectInfo] = useState<{ newId: string; countdown: number } | null>(null);

    const flowRedriveMutation = useFlowRedrive();
    
    useEffect(() => {
        setRedirectInfo(null); // when redirect done, clear state
    }, [flowExecutionId]);
    
    // Timer effect for the redirect
    useEffect(() => {
        if (!redirectInfo || redirectInfo.countdown <= 0) {
            if (redirectInfo?.countdown === 0) {
                navigate(`/executions/${redirectInfo.newId}`);
            }
            return;
        }

        const timer = setTimeout(() => {
            setRedirectInfo(info => info ? { ...info, countdown: info.countdown - 1 } : null);
        }, 1000);

        return () => clearTimeout(timer);
    }, [redirectInfo, navigate]);


    const handleFlowRedrive = () => {
        modals.openConfirmModal({
            title: 'Confirm Flow Redrive',
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to redrive this flow? A new execution will be started from the beginning using the original input payload.
                </Text>
            ),
            labels: { confirm: 'Redrive Flow', cancel: 'Cancel' },
            confirmProps: { color: 'green' },
            onConfirm: () => {
                if (flowExecutionId) {
                    flowRedriveMutation.mutate({ executionId: flowExecutionId }, {
                        onSuccess: (data) => {
                            queryClient.invalidateQueries({ queryKey: [EXECUTIONS_LIST_QUERY_KEY] });
                            notifications.show({
                                id: `redrive-${data.newFlowExecutionId}`,
                                title: 'Redrive Initiated',
                                message: `Successfully started new execution: ${data.newFlowExecutionId.substring(0,8)}...`,
                                color: 'green',
                                icon: <IconPlayerPlay size="1.1rem" />,
                            });
                            // Set state to trigger the countdown banner
                            setRedirectInfo({ newId: data.newFlowExecutionId, countdown: 5 });
                        }
                    });
                }
            },
        });
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: [EXECUTION_DETAIL_QUERY_KEY, flowExecutionId] });
    };

    const handleOpenDiff = (step: AllmaStepExecutionRecord) => {
        const fullStepRecord = step as any;
        setDiffData({ left: fullStepRecord.inputMappingContext, right: fullStepRecord.outputMappingContext, stepId: step.stepInstanceId });
        openDiffModal();
    };

    const handleOpenRedrive = (step: AllmaStepExecutionRecord) => {
        setStepToRedrive(step);
        openRedriveModal();
    };

    const handleOpenConfig = (step: AllmaStepExecutionRecord) => {
        const fullStepRecord = step as any;
        if (flowDef) {
            const config = flowDef.steps[step.stepInstanceId];
            if (config) {
                setStepConfigToShow(config);
                openConfigDrawer();
                return;
            }
        }
        if (fullStepRecord.stepInstanceConfig) {
            setStepConfigToShow(fullStepRecord.stepInstanceConfig);
            openConfigDrawer();
            return;
        }
    };

    if (isLoading && !isRefetching) {
        return <PageContainer title="Loading Execution..."><Loader /></PageContainer>;
    }
    if (error) {
        return <PageContainer title="Error"><Alert color="red" title="Failed to load execution details" icon={<IconAlertCircle />}>{error.message}</Alert></PageContainer>;
    }
    if (!execution) {
        return <PageContainer title="Not Found"><Alert color="orange" title="Not Found">Execution with ID {flowExecutionId} could not be found.</Alert></PageContainer>;
    }

    const { metadata, steps } = execution;

    return (
        <>
            <PageContainer
                title={`Execution: ${metadata.flowExecutionId.split('-')[0]}`}
                breadcrumb={<ExecutionsBreadcrumbs />}
                rightSection={
                    <Group>
                        <Tooltip label="Refresh Execution Details">
                            <ActionIcon variant="default" size={36} onClick={handleRefresh} loading={isRefetching}>
                                <IconRefresh size="1.1rem" />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Go to Flow Definition">
                            <Button component={Link} to={`/flows/edit/${metadata.flowDefinitionId}/${metadata.flowDefinitionVersion}`} variant='default' leftSection={<IconSettings size="1rem"/>}>
                                View Flow v{metadata.flowDefinitionVersion}
                            </Button>
                        </Tooltip>
                        <Tooltip label="Redrive this flow execution from the beginning">
                            <Button 
                                variant='outline' 
                                leftSection={<IconPlayerPlay size="1rem"/>}
                                onClick={handleFlowRedrive}
                                loading={flowRedriveMutation.isPending}
                            >
                                Flow Redrive
                            </Button>
                        </Tooltip>
                    </Group>
                }
            >
                {redirectInfo && (
                    <Alert 
                        title="Redirecting..." 
                        color="blue" 
                        withCloseButton 
                        onClose={() => setRedirectInfo(null)} 
                        mb="md"
                    >
                        <Group justify="space-between">
                            <Text>
                                Successfully started new execution. Redirecting in <strong>{redirectInfo.countdown}</strong> seconds...
                            </Text>
                            <Button component={Link} to={`/executions/${redirectInfo.newId}`} variant="light" size="xs">
                                Go Now
                            </Button>
                        </Group>
                    </Alert>
                )}
                <ExecutionSummary metadata={metadata} />

                <Accordion 
                    variant="separated"
                    multiple
                    value={openItems}
                    onChange={setOpenItems}
                    mt="xl"
                >
                    {steps.map((step, index) => {
                        const isParallelStep = step.stepType === StepType.PARALLEL_FORK_MANAGER;
                        
                        return isParallelStep ? (
                            <ParallelStepAccordionItem
                                key={`${step.stepInstanceId}-${step.startTime}`}
                                flowExecutionId={flowExecutionId!}
                                step={step}
                                stepNumber={index + 1}
                                onOpenDiff={handleOpenDiff}
                                onOpenConfig={handleOpenConfig}
                                onRedrive={handleOpenRedrive}
                            />
                        ) : (
                            <StandardStepAccordionItem
                                key={`${step.stepInstanceId}-${step.startTime}`}
                                step={step}
                                stepNumber={index + 1}
                                onOpenDiff={handleOpenDiff}
                                onOpenConfig={handleOpenConfig}
                                onRedrive={handleOpenRedrive}
                            />
                        );
                    })}
                </Accordion>
            </PageContainer>
            
            {diffData && (
                 <ContextDiffModal
                    opened={diffModalOpened}
                    onClose={() => { closeDiffModal(); setDiffData(null); }}
                    title={`Context Diff for Step: ${diffData.stepId}`}
                    leftContext={diffData.left}
                    rightContext={diffData.right}
                />
            )}
            {stepToRedrive && flowExecutionId && (
                <StatefulRedriveModal
                    opened={redriveModalOpened}
                    onClose={() => { closeRedriveModal(); setStepToRedrive(null); }}
                    step={stepToRedrive}
                    executionId={flowExecutionId}
                />
            )}
             {stepConfigToShow && (
                <StepConfigurationDrawer
                    opened={configDrawerOpened}
                    onClose={() => { closeConfigDrawer(); setStepConfigToShow(null); }}
                    stepConfig={stepConfigToShow}
                    isLoading={isLoadingFlowDef}
                />
            )}
        </>
    );
}