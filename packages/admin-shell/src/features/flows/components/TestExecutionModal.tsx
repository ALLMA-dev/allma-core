import { Modal, Stack, Text, Group, Button } from '@mantine/core';
import { EditableJsonView } from '@allma/ui-components';
import { useState } from 'react';
import { useExecuteFlowVersion } from '../../../api/flowService';

interface TestExecutionModalProps {
    opened: boolean;
    onClose: () => void;
    flowId: string | null;
    version: number | string | null;
    onExecutionSuccess: () => void;
}

export function TestExecutionModal({ opened, onClose, flowId, version, onExecutionSuccess }: TestExecutionModalProps) {
    const [initialContextData, setInitialContextData] = useState<Record<string, any>>({});
    const executeMutation = useExecuteFlowVersion();

    const handleRunExecution = () => {
        if (flowId && version) {
            executeMutation.mutate(
                { flowId, version, initialContextData },
                {
                    onSuccess: () => {
                        onExecutionSuccess();
                    },
                }
            );
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={`Run Test Execution for version ${version}`}
            size="lg"
        >
            <Stack>
                <Text>
                    Provide an initial context data object (in JSON format) to start a new, real execution for this flow version.
                </Text>
                <EditableJsonView
                    value={initialContextData}
                    onChange={(newValue) => setInitialContextData(newValue as Record<string, any>)}
                />
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRunExecution}
                        loading={executeMutation.isPending}
                        disabled={!flowId || !version}
                    >
                        Run Execution
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}