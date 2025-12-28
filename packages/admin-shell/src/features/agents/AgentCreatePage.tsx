import { useForm, zodResolver } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { CreateAgentInputSchema, CreateAgentInput } from '@allma/core-types';
import { useCreateAgent } from '../../api/agentService';
import { AgentForm } from './components/AgentForm';
import { PageContainer } from '@allma/ui-components';

export function AgentCreatePage() {
    const navigate = useNavigate();
    const createMutation = useCreateAgent();

    const form = useForm<CreateAgentInput>({
        initialValues: {
            name: '',
            description: '',
            enabled: true,
            flowIds: [],
            flowVariables: {},
        },
        validate: zodResolver(CreateAgentInputSchema),
    });

    const handleSubmit = (values: CreateAgentInput) => {
        createMutation.mutate(values, {
            onSuccess: () => {
                navigate('/agents');
            },
        });
    };

    return (
        <PageContainer title="Create New Agent">
            <AgentForm
                form={form}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/agents')}
                isSubmitting={createMutation.isPending}
            />
        </PageContainer>
    );
}