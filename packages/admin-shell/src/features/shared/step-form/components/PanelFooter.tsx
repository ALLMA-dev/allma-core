import { Button, Group, Badge } from '@mantine/core';
import { IconTrash, IconPlayerPlay } from '@tabler/icons-react';

interface PanelFooterProps {
    isReadOnly: boolean;
    isStartNode: boolean;
    onDelete: () => void;
    onSetStartNode?: () => void;
}

export function PanelFooter({ isReadOnly, isStartNode, onDelete, onSetStartNode }: PanelFooterProps) {
    if (isReadOnly) {
        return null;
    }

    return (
        <Group justify='space-between' p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            {!isStartNode ? (
                <Button type="button" color="red" variant="outline" leftSection={<IconTrash size="1rem" />} onClick={onDelete}>Delete Step</Button>
            ) : (
                // Empty placeholder to maintain spacing/layout consistency
                <div />
            )}

            {!isStartNode && onSetStartNode && (
                <Button type="button" variant="light" leftSection={<IconPlayerPlay size="1rem" />} onClick={onSetStartNode}>
                    Set as Start Step
                </Button>
            )}

            {isStartNode && (
                <Badge size="lg" variant="light" color="green" leftSection={<IconPlayerPlay size="1rem" />}>
                    Start Step
                </Badge>
            )}
        </Group>
    );
}