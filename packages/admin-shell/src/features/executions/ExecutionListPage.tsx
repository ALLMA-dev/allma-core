import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, Select, Group, Badge, Text, ActionIcon, Tooltip, Box, LoadingOverlay, Alert, Pagination, Button } from '@mantine/core';
import { IconEye, IconAlertCircle, IconFilter, IconPlayerPlay, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@allma/ui-components';
import { useGetFlows, useListFlowVersions, useFlowRedrive } from '../../api/flowService';
import { useGetFlowExecutions } from '../../api/executionService';
import { FlowExecutionSummary } from '@allma/core-types';
import { formatFuzzyDurationWithDetail } from '../../utils/formatters';
import { EXECUTIONS_LIST_QUERY_KEY } from './constants';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'COMPLETED': return 'green';
        case 'RUNNING': return 'blue';
        case 'FAILED': return 'red';
        case 'TIMED_OUT': return 'orange';
        case 'CANCELLED': return 'gray';
        default: return 'dark';
    }
};

const SELECTED_FLOW_ID_STORAGE_KEY = 'allma-admin-selected-flow-id';

export function ExecutionListPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [selectedFlowId, setSelectedFlowId] = useState<string | null>(
        () => localStorage.getItem(SELECTED_FLOW_ID_STORAGE_KEY) || null
    );
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    
    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    // Stores the 'nextToken' for the *next* page. Index 0 is undefined (for page 1).
    // pageTokens[i] is the token needed to fetch page i+1.
    const [pageTokens, setPageTokens] = useState<(string | undefined)[]>([undefined]);

    // --- REDIRECT STATE ---
    const [redirectInfo, setRedirectInfo] = useState<{ newId: string; countdown: number } | null>(null);

    const { data: allFlowMetadata, isLoading: isLoadingFlows, error: flowsError } = useGetFlows({
        searchText: "",
        tag: undefined,
    });

    const { data: versionsForSelectedFlow } = useListFlowVersions(selectedFlowId ?? undefined);
    
    // The token needed to fetch the `currentPage`.
    const currentToken = pageTokens[currentPage - 1];

    const { data: executionsResponse, isLoading: isLoadingExecutions, isRefetching, error: executionsError } = useGetFlowExecutions({
        flowId: selectedFlowId!,
        flowVersion: selectedVersion ? Number(selectedVersion) : null,
        limit: 15,
        nextToken: currentToken, // Pass the token for the current page
    });

    const flowRedriveMutation = useFlowRedrive();

    // --- EFFECT: Update pagination tokens when new data is fetched ---
    useEffect(() => {
        if (executionsResponse?.nextToken) {
            // If we are on page `currentPage` and we received a token, it's for `currentPage + 1`.
            // The token for page N is stored at index N-1. So token for page `currentPage + 1` is at `currentPage`.
            if (pageTokens.length === currentPage) {
                setPageTokens(prevTokens => [...prevTokens, executionsResponse.nextToken]);
            }
        }
    }, [executionsResponse, currentPage, pageTokens]);

    // --- EFFECT: Timer for delayed redirect ---
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


    // Save the selected flow ID to local storage whenever it changes.
    useEffect(() => {
        if (selectedFlowId) {
            localStorage.setItem(SELECTED_FLOW_ID_STORAGE_KEY, selectedFlowId);
        } else {
            localStorage.removeItem(SELECTED_FLOW_ID_STORAGE_KEY);
        }
    }, [selectedFlowId]);

    // Client-side aggregation to create a de-duplicated list of "master" flows for the dropdown.
    const flowOptions = useMemo(() => {
        if (!allFlowMetadata) return [];
        return allFlowMetadata.map(flow => ({ value: flow.id, label: flow.name }))
            .sort((a,b) => a.label.localeCompare(b.label));
    }, [allFlowMetadata]);
    
    // Create version dropdown options from all versions of the selected flow.
    const versionOptions = useMemo(() => {
        if (!versionsForSelectedFlow) return [];
        const publishedVersion = versionsForSelectedFlow.find(v => v.isPublished)?.version;
        return versionsForSelectedFlow
            .sort((a, b) => b.version - a.version)
            .map(v => ({
                value: String(v.version),
                label: `Version ${v.version}${publishedVersion === v.version ? ' (Published)' : ''}`,
            }));
    }, [versionsForSelectedFlow]);

    const resetPaginationAndRefetch = () => {
        setCurrentPage(1);
        setPageTokens([undefined]);
        // Invalidate the query to force a refetch with the reset pagination state.
        // This is the canonical way to trigger a refresh with react-query.
        queryClient.invalidateQueries({ queryKey: [EXECUTIONS_LIST_QUERY_KEY] });
    };
    
    const handleRefresh = () => {
        resetPaginationAndRefetch();
    };

    const handleFlowChange = (value: string | null) => {
        setSelectedFlowId(value);
        setSelectedVersion(null); // Reset version filter when master flow changes
        setCurrentPage(1);
        setPageTokens([undefined]);
    };
    
    const handleVersionChange = (value: string | null) => {
        setSelectedVersion(value);
        setCurrentPage(1);
        setPageTokens([undefined]);
    };

    const handleFlowRedrive = (exec: FlowExecutionSummary) => {
        modals.openConfirmModal({
            title: 'Confirm Flow Redrive',
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to redrive execution {exec.flowExecutionId.substring(0,8)}...? A new execution will start using the original input.
                </Text>
            ),
            labels: { confirm: 'Redrive Flow', cancel: 'Cancel' },
            confirmProps: { color: 'green' },
            onConfirm: () => {
                flowRedriveMutation.mutate({ executionId: exec.flowExecutionId }, {
                    onSuccess: (data) => {
                        queryClient.invalidateQueries({ queryKey: [EXECUTIONS_LIST_QUERY_KEY] });
                        notifications.show({
                            title: 'Redrive Initiated',
                            message: `Successfully started new execution: ${data.newFlowExecutionId.substring(0,8)}...`,
                            color: 'green',
                            icon: <IconPlayerPlay size="1.1rem" />,
                        });
                        setRedirectInfo({ newId: data.newFlowExecutionId, countdown: 5 });
                    }
                });
            },
        });
    };

    const executions = executionsResponse?.items || [];
    
    // Calculate total pages based on discovered tokens and current response.
    // We take the max of the current page, the number of pages we have tokens for,
    // and `currentPage + 1` if a next token exists. This correctly preserves the total
    // page count even when navigating backwards.
    const totalPages = Math.max(
        currentPage,
        pageTokens.length,
        executionsResponse?.nextToken ? currentPage : 0
    );

    const rows = executions.map((exec: FlowExecutionSummary) => (
        <Table.Tr key={exec.flowExecutionId}>
            <Table.Td>
                <Link to={`/executions/${exec.flowExecutionId}`}>
                    <Text variant="link" c="blue.6" size="sm" ff="monospace">{exec.flowExecutionId}</Text>
                </Link>
            </Table.Td>
            <Table.Td>
                <Badge variant="light" color="cyan">v{exec.flowDefinitionVersion}</Badge>
            </Table.Td>
            <Table.Td>
                <Badge color={getStatusColor(exec.status)} variant="filled">{exec.status}</Badge>
            </Table.Td>
            <Table.Td>{format(new Date(exec.startTime), 'yyyy-MM-dd HH:mm:ss')}</Table.Td>
            <Table.Td>
                {exec.endTime ? formatFuzzyDurationWithDetail(exec.startTime, exec.endTime) : 'In-progress'}
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <Tooltip label="View Details">
                        <ActionIcon component={Link} to={`/executions/${exec.flowExecutionId}`} variant="subtle">
                            <IconEye size="1rem" />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Redrive Flow">
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => handleFlowRedrive(exec)}
                            loading={flowRedriveMutation.isPending && flowRedriveMutation.variables?.executionId === exec.flowExecutionId}
                        >
                            <IconPlayerPlay size="1rem" />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <PageContainer 
            title="Flow Execution Logs"
            rightSection={
                <Tooltip label="Refresh List">
                    <ActionIcon variant="default" size="lg" onClick={handleRefresh} loading={isRefetching || (isLoadingExecutions && !executionsResponse)}>
                        <IconRefresh size="1rem" />
                    </ActionIcon>
                </Tooltip>
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
            <Group mb="md" align="flex-end" grow>
                <Select
                    label="Select a Flow"
                    placeholder="Choose a flow definition..."
                    data={flowOptions}
                    value={selectedFlowId}
                    onChange={handleFlowChange}
                    searchable
                    clearable
                    leftSection={<IconFilter size="1rem" />}
                    disabled={isLoadingFlows}
                />
                <Select
                    label="Filter by Version (optional)"
                    placeholder="All versions"
                    data={versionOptions}
                    value={selectedVersion}
                    onChange={handleVersionChange}
                    disabled={!selectedFlowId || !versionsForSelectedFlow || versionsForSelectedFlow.length === 0}
                    clearable
                />
            </Group>

            {flowsError && <Alert color="red" title="Error" icon={<IconAlertCircle/>}>Could not load flow definitions: {flowsError.message}</Alert>}

            <Box pos="relative" mt="lg">
                <LoadingOverlay visible={isLoadingExecutions && !isRefetching} />
                {executionsError && <Alert color="red" title="Error" icon={<IconAlertCircle/>}>Could not load executions: {executionsError.message}</Alert>}
                
                {!selectedFlowId && (
                     <Alert color="blue" title="Select a Flow" icon={<IconInfoCircle />}>
                        Please select a flow from the dropdown above to see its execution history.
                    </Alert>
                )}
                
                {selectedFlowId && !isLoadingExecutions && executions.length === 0 && (
                     <Alert color="gray" title="No Executions Found" >
                        There are no recorded executions for the selected flow and version filter.
                    </Alert>
                )}
                
                {executions.length > 0 && (
                    <>
                        <Table.ScrollContainer minWidth={800}>
                            <Table striped highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Execution ID</Table.Th>
                                        <Table.Th>Version</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th>Start Time</Table.Th>
                                        <Table.Th>Duration</Table.Th>
                                        <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>{rows}</Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                        <Pagination
                            mt="lg"
                            total={totalPages}
                            value={currentPage}
                            onChange={setCurrentPage}
                        />
                    </>
                )}
            </Box>
        </PageContainer>
    );
}