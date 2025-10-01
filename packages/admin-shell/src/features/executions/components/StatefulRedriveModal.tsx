// packages/allma-admin-shell/src/features/executions/components/StatefulRedriveModal.tsx
import { Modal, Button, Group, Stack, Text, Alert } from '@mantine/core';
import { AllmaStepExecutionRecord, StatefulRedriveInput } from '@allma/core-types';
import { useState } from 'react';
import { EditableJsonView } from '@allma/ui-components';
import { useStatefulRedrive } from '../../../api/flowControlService';

interface StatefulRedriveModalProps {
    opened: boolean;
    onClose: () => void;
    step: AllmaStepExecutionRecord;
    executionId: string;
}

export function StatefulRedriveModal({ opened, onClose, step, executionId }: StatefulRedriveModalProps) {
    const fullStepRecord = step as any;
    const initialContext = fullStepRecord.inputMappingContext || {};
    const [modifiedContext, setModifiedContext] = useState(initialContext);

    const redriveMutation = useStatefulRedrive();

    const handleRedrive = () => {
        const payload: StatefulRedriveInput = {
            startFromStepInstanceId: step.stepInstanceId,
            modifiedContextData: modifiedContext,
        };
        redriveMutation.mutate({ executionId, data: payload }, {
            onSuccess: onClose
        });
    };
    
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={`Redrive from Step: ${step.stepInstanceId}`}
            size="xl"
            centered
        >
            <Stack>
                <Alert color="orange" title="Warning">
                    You are about to start a new flow execution from the selected step. The new execution will begin with the context data provided below.
                </Alert>
                <Text fw={500}>Initial Context for Step</Text>
                <Text size="sm" c="dimmed" mt={-10}>
                    This is the full flow context as it was *before* this step ran. You can modify it to test different scenarios.
                </Text>
                <EditableJsonView 
                    value={modifiedContext}
                    onChange={setModifiedContext}
                />
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <Button
                        color="green"
                        onClick={handleRedrive}
                        loading={redriveMutation.isPending}
                    >
                        Confirm and Redrive
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}