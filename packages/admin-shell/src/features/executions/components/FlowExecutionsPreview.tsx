import { Paper, Title, Alert } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FlowMetadataStorageItem } from '@allma/core-types';
import { useGetFlowExecutions } from '../../../api/executionService';
import { ExecutionsTable } from './ExecutionsTable';
import { EXECUTIONS_LIST_QUERY_KEY } from '../constants';

interface FlowExecutionsPreviewProps {
    flow: FlowMetadataStorageItem;
    limit: number;
}

export function FlowExecutionsPreview({ flow, limit }: FlowExecutionsPreviewProps) {
    const queryClient = useQueryClient();
    const { data: executionsResponse, isLoading, isRefetching, error } = useGetFlowExecutions({
        flowId: flow.id,
        limit,
    });

    const executions = executionsResponse?.items || [];

    const handleRedrive = () => {
        // After a redrive, just invalidate the query for this component to refresh its list.
        setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: [EXECUTIONS_LIST_QUERY_KEY, { flowId: flow.id, limit }] });
        }, 500); // Small delay to allow new execution to be indexed.
    };

    return (
        <Paper withBorder p="lg" mb="xl" shadow="sm">
            <Title order={3} mb="md">
                <Link to={`/flows/versions/${flow.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {flow.name}
                </Link>
            </Title>
            {isLoading && !executionsResponse ? (
                <ExecutionsTable executions={[]} isLoading={true} isRefetching={false} flowId={flow.id} />
            ) : error ? (
                <Alert color="red" title="Error">Failed to load executions for this flow: {error.message}</Alert>
            ) : (
                <ExecutionsTable
                    executions={executions}
                    isLoading={isLoading}
                    isRefetching={isRefetching}
                    flowId={flow.id}
                    error={error}
                    onRedriveSuccess={handleRedrive}
                />
            )}
        </Paper>
    );
}
