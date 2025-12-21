import { useState, useEffect } from 'react';
import { Pagination, Title, Group, Tooltip, ActionIcon } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { IconRefresh } from '@tabler/icons-react';
import { useGetFlowExecutions } from '../../../api/executionService';
import { ExecutionsTable } from '../../executions/components/ExecutionsTable';
import { EXECUTIONS_LIST_QUERY_KEY } from '../constants';

interface FlowExecutionsListProps {
    flowId: string;
}

export function FlowExecutionsList({ flowId }: FlowExecutionsListProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageTokens, setPageTokens] = useState<(string | undefined)[]>([undefined]);
    const queryClient = useQueryClient();

    const currentToken = pageTokens[currentPage - 1];

    const { data: executionsResponse, isLoading, isRefetching, error } = useGetFlowExecutions({
        flowId: flowId,
        limit: 10,
        nextToken: currentToken,
    });

    useEffect(() => {
        if (executionsResponse?.nextToken) {
            if (pageTokens.length === currentPage) {
                setPageTokens(prevTokens => [...prevTokens, executionsResponse.nextToken]);
            }
        }
    }, [executionsResponse, currentPage, pageTokens]);
    
    // Reset pagination when flowId changes
    useEffect(() => {
        setCurrentPage(1);
        setPageTokens([undefined]);
    }, [flowId]);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: [EXECUTIONS_LIST_QUERY_KEY] });
    };

    const handleRedriveSuccess = () => {
        setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: [EXECUTIONS_LIST_QUERY_KEY] });
        }, 5000);
    };

    const executions = executionsResponse?.items || [];
    
    const totalPages = Math.max(
        currentPage,
        pageTokens.length,
        executionsResponse?.nextToken ? currentPage : 0
    );

    return (
        <>
            <Group justify="space-between" align="center" mt="xl" mb="md">
                <Title order={3}>Executions</Title>
                <Tooltip label="Refresh Executions">
                    <ActionIcon variant="default" size="lg" onClick={handleRefresh} loading={isRefetching}>
                        <IconRefresh size="1rem" />
                    </ActionIcon>
                </Tooltip>
            </Group>
            <ExecutionsTable
                executions={executions}
                isLoading={isLoading}
                isRefetching={isRefetching}
                error={error}
                flowId={flowId}
                onRedriveSuccess={handleRedriveSuccess}
            />
            {executions.length > 0 && totalPages > 1 && (
                <Pagination
                    mt="lg"
                    total={totalPages}
                    value={currentPage}
                    onChange={setCurrentPage}
                />
            )}
        </>
    );
}