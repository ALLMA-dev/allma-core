import { useState, useEffect } from 'react';
import { Pagination, Title } from '@mantine/core';
import { useGetFlowExecutions } from '../../../api/executionService';
import { ExecutionsTable } from '../../executions/components/ExecutionsTable';

interface FlowExecutionsListProps {
    flowId: string;
}

export function FlowExecutionsList({ flowId }: FlowExecutionsListProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageTokens, setPageTokens] = useState<(string | undefined)[]>([undefined]);

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

    const executions = executionsResponse?.items || [];
    
    const totalPages = Math.max(
        currentPage,
        pageTokens.length,
        executionsResponse?.nextToken ? currentPage : 0
    );

    return (
        <>
            <Title order={3} mb="md" mt="xl">Executions</Title>
            <ExecutionsTable
                executions={executions}
                isLoading={isLoading}
                isRefetching={isRefetching}
                error={error}
                flowId={flowId}
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