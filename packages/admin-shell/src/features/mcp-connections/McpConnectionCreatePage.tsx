import { useForm, zodResolver } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { CreateMcpConnectionInputSchema, CreateMcpConnectionInput } from '@allma/core-types';
import { useCreateMcpConnection } from '../../api/mcpConnectionService';
import { McpConnectionForm } from './components/McpConnectionForm';
import { PageContainer } from '@allma/ui-components';

export function McpConnectionCreatePage() {
    const navigate = useNavigate();
    const createMutation = useCreateMcpConnection();

    const form = useForm<CreateMcpConnectionInput>({
        initialValues: {
            name: '',
            serverUrl: '',
            authentication: {
                type: 'NONE',
            },
        },
        validate: zodResolver(CreateMcpConnectionInputSchema),
    });

    const handleSubmit = (values: CreateMcpConnectionInput) => {
        createMutation.mutate(values, {
            onSuccess: () => {
                navigate('/mcp-connections');
            },
        });
    };

    return (
        <PageContainer title="Create MCP Connection">
            <McpConnectionForm
                form={form}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/mcp-connections')}
                isSubmitting={createMutation.isPending}
            />
        </PageContainer>
    );
}
