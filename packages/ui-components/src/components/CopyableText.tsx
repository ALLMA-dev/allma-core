import { Group, Text, Tooltip, ActionIcon, type MantineSize } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCheck, IconCopy } from '@tabler/icons-react';

interface CopyableTextProps {
    text: string;
    size?: MantineSize;
    showText?: boolean;
}

/**
 * A small component that displays a string of text with a copy-to-clipboard button.
 */
export function CopyableText({ text, size = 'xs', showText = true }: CopyableTextProps) {
  const clipboard = useClipboard({ timeout: 1000 });
  return (
    <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
      {showText && <Text size={size} c="dimmed" ff="monospace">{text}</Text>}
      <Tooltip label="Copy ID" withArrow position="right">
        <ActionIcon size="xs" variant="transparent" color="gray" onClick={() => clipboard.copy(text)}>
          {clipboard.copied ? <IconCheck size="0.9rem" color="teal" /> : <IconCopy size="0.9rem" />}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
