import { Drawer, Loader, Text, ScrollArea, Alert, Stack } from '@mantine/core';
import { StepInstance } from '@allma/core-types';
import { EditableJsonView } from '@allma/ui-components';
import { IconAlertCircle } from '@tabler/icons-react';

interface StepConfigurationDrawerProps {
    opened: boolean;
    onClose: () => void;
    stepConfig: StepInstance | null;
    isLoading: boolean;
}

export function StepConfigurationDrawer({ opened, onClose, stepConfig, isLoading }: StepConfigurationDrawerProps) {
    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={`Configuration for Step: ${stepConfig?.stepInstanceId || '...'}`}
            position="right"
            size="lg"
        >
            <ScrollArea style={{ height: 'calc(100vh - 60px)' }}>
                <Stack p="md">
                    {isLoading && <Loader />}
                    {!isLoading && !stepConfig && (
                         <Alert color="red" title="Not Found" icon={<IconAlertCircle />}>
                            The flow definition could not be loaded, or the step configuration was not found in it.
                        </Alert>
                    )}
                    {stepConfig && (
                        <>
                             <Text size="sm" c="dimmed">
                                This is the exact configuration for this step instance as defined in its flow version.
                            </Text>
                            <EditableJsonView value={stepConfig} readOnly />
                        </>
                    )}
                </Stack>
            </ScrollArea>
        </Drawer>
    );
}