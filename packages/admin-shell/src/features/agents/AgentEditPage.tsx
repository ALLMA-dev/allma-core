import { useForm, zodResolver } from '@mantine/form';
import { useNavigate, useParams } from 'react-router-dom';
import { UpdateAgentInput, UpdateAgentInputSchema } from '@allma/core-types';
import { useGetAgent, useUpdateAgent } from '../../api/agentService';
import { AgentForm } from './components/AgentForm';
import { PageContainer } from '@allma/ui-components';
import { useEffect } from 'react';
import { LoadingOverlay, Alert } from '@mantine/core';

export function AgentEditPage() {
    const { agentId } = useParams();
    const navigate = useNavigate();
    const { data: agent, isLoading, error } = useGetAgent(agentId);
    const updateMutation = useUpdateAgent();

    const form = useForm<UpdateAgentInput>({
        initialValues: {
            name: '',
            description: '',
            enabled: true,
            flowIds: [],
            flowVariables: {},
        },
        validate: zodResolver(UpdateAgentInputSchema),
    });

    useEffect(() => {
        if (agent) {
            form.setValues({
                name: agent.name,
                description: agent.description || '',
                enabled: agent.enabled,
                flowIds: agent.flowIds,
                flowVariables: agent.flowVariables,
            });
        }
    }, [agent]);

    const handleSubmit = (values: UpdateAgentInput) => {
        if (!agentId) return;
        updateMutation.mutate({ agentId, data: values }, {
            onSuccess: () => {
                navigate('/agents');
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
        <PageContainer title={`Edit Agent: ${agent?.name}`}>
            <AgentForm
                form={form as any}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/agents')}
                isSubmitting={updateMutation.isPending}
            />
        </PageContainer>
    );
}