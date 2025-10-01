// packages/allma-admin-shell/src/features/executions/components/MappingEventsDisplay.tsx
import { Accordion, Badge, Code, Group, Paper, Stack, Text, useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { MappingEvent } from '@allma/core-types';
import { EditableJsonView } from "@allma/ui-components";

const StyledMappingMessage = ({ message }: { message: string; }) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    const styles = {
        from: { backgroundColor: isDark ? theme.colors.yellow[9] : theme.colors.yellow[1], color: isDark ? theme.colors.yellow[2] : theme.colors.yellow[8] },
        to: { backgroundColor: isDark ? theme.colors.green[9] : theme.colors.green[1], color: isDark ? theme.colors.green[2] : theme.colors.green[8] },
        error: { backgroundColor: isDark ? theme.colors.orange[9] : theme.colors.orange[1], color: isDark ? theme.colors.orange[2] : theme.colors.orange[8] },
        omitted: { backgroundColor: isDark ? theme.colors.gray[8] : theme.colors.gray[1], color: isDark ? theme.colors.gray[4] : theme.colors.gray[7] }
    };
    
    const patterns = [
      { regex: /Mapped '(.*?)' to input key '(.*?)'./, render: ([, from, to]: string[]) => (<>Mapped <Code style={styles.from}>{from}</Code> to input key <Code style={styles.to}>{to}</Code>.</>) },
      { regex: /Mapped step output '(.*?)' to context path '(.*?)'./, render: ([, from, to]: string[]) => (<>Mapped step output <Code style={styles.from}>{from}</Code> to context path <Code style={styles.to}>{to}</Code>.</>) },
      { regex: /Error evaluating JSONPath '(.*?)' for input key '(.*?)'./, render: ([, from, to]: string[]) => (<>Error evaluating JSONPath <Code style={styles.error}>{from}</Code> for input key <Code style={styles.error}>{to}</Code>.</>) },
      { regex: /Error applying output mapping from '(.*?)' to '(.*?)'./, render: ([, from, to]: string[]) => (<>Error applying output mapping from <Code style={styles.error}>{from}</Code> to <Code style={styles.error}>{to}</Code>.</>) },
      { regex: /Source path '(.*?)' resolved to undefined. Key '(.*?)' was omitted/, render: ([, from, to]: string[]) => (<>Source path <Code style={styles.from}>{from}</Code> resolved to undefined. Key <Code style={styles.omitted}>{to}</Code> was omitted</>) }
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern.regex);
        if (match) {
            return <Text size="sm" mt="xs">{pattern.render(match)}</Text>;
        }
    }
    
    return <Text size="sm" mt="xs">{message}</Text>;
};

export function MappingEventsDisplay({ events }: { events?: MappingEvent[] }) {
    if (!events || events.length === 0) {
        return <Text size="sm" c="dimmed">No mapping events were logged for this step.</Text>;
    }
    return (
        <Stack gap="xs">
            {events.map((event, index) => (
                <Paper withBorder p="xs" radius="sm" key={index}>
                    <Group>
                         <Badge size="sm" variant="light" color={event.status === 'SUCCESS' ? 'green' : event.status === 'ERROR' ? 'red' : 'yellow'}>
                            {event.status}
                        </Badge>
                        <Text size="sm" fw={500}>{event.type}</Text>
                        <Text size="xs" c="dimmed" ml="auto">{new Date(event.timestamp).toLocaleTimeString()}</Text>
                    </Group>
                    <StyledMappingMessage message={event.message} />
                    <Accordion variant="separated" mt="xs">
                        <Accordion.Item value="details">
                            <Accordion.Control>Details</Accordion.Control>
                            <Accordion.Panel>
                                <EditableJsonView value={event.details} readOnly />
                            </Accordion.Panel>
                        </Accordion.Item>
                    </Accordion>
                </Paper>
            ))}
        </Stack>
    );
}