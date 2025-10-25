import { Card, Stack, Text, Group, Loader, Alert, Tabs, ScrollArea } from '@mantine/core';
import React from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { STEP_TYPE_CONFIGS } from '../../step-configs';
import { UnifiedStepDefinition, useGetAvailableSteps } from '../../../../../api/stepDefinitionService';

export function StepPalette() {
    const { data: availableSteps, isLoading, error } = useGetAvailableSteps();

    const onDragStart = (event: React.DragEvent, step: UnifiedStepDefinition) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(step));
        event.dataTransfer.effectAllowed = 'move';
    };

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return (
            <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
                Failed to load available steps. Please try again later.
            </Alert>
        );
    }

    const systemSteps = availableSteps?.filter(s => s.source === 'system') || [];
    const customSteps = availableSteps?.filter(s => s.source === 'user') || [];
    const externalSteps = availableSteps?.filter(s => s.source === 'external') || [];

    const DraggableStepCard = ({ step }: { step: UnifiedStepDefinition }) => {
        const Icon = STEP_TYPE_CONFIGS[step.stepType]?.icon || (() => null);
        // The source name is now clean, no need for regex replacement.
        const displayName = step.name;

        return (
            <Card
                withBorder
                p="sm"
                radius="sm"
                onDragStart={(event) => onDragStart(event, step)}
                draggable
                style={{ cursor: 'grab' }}
            >
                <Group>
                    <Icon />
                    <Text size="sm">{displayName}</Text>
                </Group>
            </Card>
        );
    };
    
    const renderStepList = (steps: UnifiedStepDefinition[]) => {
        const groupedSteps = steps.reduce((acc, step) => {
            const category = STEP_TYPE_CONFIGS[step.stepType]?.category || 'General';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(step);
            return acc;
        }, {} as Record<string, UnifiedStepDefinition[]>);

        return (
            <Stack>
                {Object.entries(groupedSteps).map(([category, stepsInCategory]) => (
                    <React.Fragment key={category}>
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">{category}</Text>
                        {stepsInCategory.map((step) => <DraggableStepCard key={step.id} step={step} />)}
                    </React.Fragment>
                ))}
            </Stack>
        );
    };

    return (
        // The root Stack now fills the height of its new Paper container.
        <Stack style={{ height: '100%' }}>
            <Text fw={700}>Add Steps</Text>
            <Text size="sm" c="dimmed" mt={-10} mb={10}>Drag a step onto the canvas.</Text>

            {/* This structure now precisely matches the working StepEditorPanel */}
            <Tabs defaultValue="system" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <Tabs.List>
                    {systemSteps.length > 0 && <Tabs.Tab value="system">System</Tabs.Tab>}
                    {customSteps.length > 0 && <Tabs.Tab value="custom">Custom</Tabs.Tab>}
                    {externalSteps.length > 0 && <Tabs.Tab value="external">External</Tabs.Tab>}
                </Tabs.List>

                {/* A single ScrollArea now wraps all panels and grows to fill the remaining space */}
                <ScrollArea style={{ flex: 1 }}>
                    {systemSteps.length > 0 && (
                        <Tabs.Panel value="system" pt="xs">
                            {renderStepList(systemSteps)}
                        </Tabs.Panel>
                    )}

                    {customSteps.length > 0 && (
                        <Tabs.Panel value="custom" pt="xs">
                            {renderStepList(customSteps)}
                        </Tabs.Panel>
                    )}

                    {externalSteps.length > 0 && (
                        <Tabs.Panel value="external" pt="xs">
                            {renderStepList(externalSteps)}
                        </Tabs.Panel>
                    )}
                </ScrollArea>
            </Tabs>
        </Stack>
    );
}
