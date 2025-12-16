import { useState, useMemo } from 'react';
import { Select, Group, Alert, Box, Stack, Title, LoadingOverlay, ActionIcon, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@allma/ui-components';
import { useGetFlows } from '../../api/flowService';
import { FlowExecutionsPreview } from './components/FlowExecutionsPreview';

export function ExecutionListPage() {
    const queryClient = useQueryClient();
    const [limit, setLimit] = useState<string>('10');

    const { data: allFlowMetadata, isLoading: isLoadingFlows, isRefetching, error: flowsError } = useGetFlows({
        searchText: "",
        tag: undefined,
    });

    const handleRefresh = () => {
        // This will refetch the list of flows. Each `FlowExecutionsPreview` component has its own
        // query that will refetch based on its own staleTime or if explicitly invalidated.
        // For a full deep refresh, we would need a more complex invalidation strategy,
        // but this is sufficient for the primary use case.
        queryClient.invalidateQueries({ queryKey: ['flows'] });
    };
    
    const sortedFlows = useMemo(() => {
        if (!allFlowMetadata) return [];
        return [...allFlowMetadata].sort((a,b) => a.name.localeCompare(b.name));
    }, [allFlowMetadata]);
    
    return (
        <PageContainer 
            title="Executions Monitor"
            rightSection={
                <Group>
                    <Select
                        label="Executions"
                        value={limit}
                        onChange={(value) => setLimit(value || '10')}
                        data={['5', '10', '50', '100']}
                        w={100}
                        allowDeselect={false}
                    />
                    <Tooltip label="Refresh All">
                        <ActionIcon variant="default" size="lg" onClick={handleRefresh} loading={isRefetching || isLoadingFlows} mt="xl">
                            <IconRefresh size="1rem" />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            }
        >
            <Box pos="relative" mt="lg">
                <LoadingOverlay visible={isLoadingFlows && !isRefetching} />
                {flowsError && <Alert color="red" title="Error" icon={<IconAlertCircle/>}>Could not load flow definitions: {flowsError.message}</Alert>}
                
                {!isLoadingFlows && sortedFlows.length === 0 && (
                     <Alert color="gray" title="No Flows Found" icon={<IconInfoCircle />}>
                        There are no flows in the system. Create one to see executions here.
                    </Alert>
                )}
                
                {sortedFlows.length > 0 && (
                    <Stack>
                        {sortedFlows.map(flow => (
                            <FlowExecutionsPreview key={flow.id} flow={flow} limit={Number(limit)} />
                        ))}
                    </Stack>
                )}
            </Box>
        </PageContainer>
    );
}