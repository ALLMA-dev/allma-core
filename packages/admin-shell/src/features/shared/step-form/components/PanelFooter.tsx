import { Button, Group } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

interface PanelFooterProps {
    isReadOnly: boolean;
    isStartNode: boolean;
    onDelete: () => void;
}

export function PanelFooter({ isReadOnly, isStartNode, onDelete }: PanelFooterProps) {
    if (isReadOnly) {
        return null;
    }

    return (
        <Group justify='flex-start' p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            {!isStartNode && (
                <Button type="button" color="red" variant="outline" leftSection={<IconTrash size="1rem" />} onClick={onDelete}>Delete Step</Button>
            )}
        </Group>
    );
}
