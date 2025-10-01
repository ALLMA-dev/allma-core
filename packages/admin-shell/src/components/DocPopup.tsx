// packages/allma-admin-shell/src/components/DocPopup.tsx
import { Popover, ActionIcon, ScrollArea, Text, Title, Code, useMantineTheme } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocPopupProps {
  content: string | undefined;
}

export function DocPopup({ content }: DocPopupProps) {
  const theme = useMantineTheme();
  if (!content) return null;

  return (
    <Popover width={400} position="left-start" withArrow shadow="md" withinPortal>
      <Popover.Target>
        <ActionIcon component="span" variant="transparent" color="gray" size="sm" ml={4} aria-label="View documentation">
          <IconQuestionMark style={{ width: '70%', height: '70%' }} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <ScrollArea.Autosize mah={400}>
          <Text component="div" px="xs" styles={{ root: { fontSize: 'var(--mantine-font-size-sm)' } }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h3: (props) => <Title order={5} mt="xs" mb="xs" {...props} />,
                code: ({...props }) => <Code color={theme.primaryColor} {...props} />,
                pre: ({...props }) => <Code block {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </Text>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}