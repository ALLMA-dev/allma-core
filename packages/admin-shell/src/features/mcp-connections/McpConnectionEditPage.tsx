import { useForm, zodResolver } from '@mantine/form';
import { useNavigate, useParams } from 'react-router-dom';
import { UpdateMcpConnectionInputSchema, UpdateMcpConnectionInput } from '@allma/core-types/src/admin/api-schemas';
import { useGetMcpConnection, useUpdateMcpConnection } from '../../api/mcpConnectionService';
import { McpConnectionForm } from './components/McpConnectionForm';
import { PageContainer } from '@allma/ui-components';
import { useEffect } from 'react';
import { LoadingOverlay, Alert } from '@mantine/core';

export function McpConnectionEditPage() {
    const { connectionId } = useParams();
    const navigate = useNavigate();
    const { data: connection, isLoading, error } = useGetMcpConnection(connectionId);
    const updateMutation = useUpdateMcpConnection();

    const form = useForm<UpdateMcpConnectionInput>({
        initialValues: {
            name: '',
            serverUrl: '',
            authentication: {
                type: 'NONE',
            },
        },
        validate: zodResolver(UpdateMcpConnectionInputSchema),
    });

    useEffect(() => {
        if (connection) {
            form.setValues(connection);
        }
    }, [connection]);

    const handleSubmit = (values: UpdateMcpConnectionInput) => {
        if (!connectionId) return;
        updateMutation.mutate({ id: connectionId, data: values }, {
            onSuccess: () => {
                navigate('/mcp-connections');
            },
        });
    };

    if (isLoading) {
        return <PageContainer title="Loading..."><LoadingOverlay visible /></PageContainer>;
    }

    if (error) {
        return <PageContainer title="Error"><Alert color="red">{error.message}</Alert></PageContainer>;
    }

    return (
        <PageContainer title={`Edit Connection: ${connection?.name}`}>
            <McpConnectionForm
                form={form as any}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/mcp-connections')}
                isSubmitting={updateMutation.isPending}
            />
        </PageContainer>
    );
}
