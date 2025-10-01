import { useState, useEffect, useMemo } from 'react';
import { Modal, Tabs, Code, ScrollArea, Alert, Paper, Text, LoadingOverlay, Box, Badge, SimpleGrid, Title } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { useListPromptVersions, useGetPromptByVersion } from '../../../api/promptTemplateService';
import { EditableJsonView } from '@allma/ui-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PromptInFlowPreviewModalProps {
    opened: boolean;
    onClose: () => void;
    promptId: string | null;
}

const isJson = (str: string): boolean => {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

export function PromptInFlowPreviewModal({ opened, onClose, promptId }: PromptInFlowPreviewModalProps) {
    const [activeTab, setActiveTab] = useState<string | null>('raw');

    // 1. Fetch all versions of the specific prompt to find metadata.
    const { data: allPromptVersions, isLoading: isLoadingAllPrompts } = useListPromptVersions(promptId || undefined); 

    // 2. Determine latest version and published version from all prompts data
    const promptInfo = useMemo(() => {
        if (!promptId || !allPromptVersions) return null;
        // `allPromptVersions` already contains only versions for the current `promptId`.
        if (allPromptVersions.length === 0) return null;

        const latestVersion = allPromptVersions.reduce((latest, current) => current.version > latest.version ? current : latest);
        const publishedVersion = allPromptVersions.find(p => p.isPublished);
        
        return {
            name: latestVersion.name,
            latestVersionNumber: latestVersion.version,
            publishedVersionNumber: publishedVersion?.version,
        };
    }, [promptId, allPromptVersions]);

    // 3. Fetch the content of the latest version
    const { data: latestVersionContent, isLoading: isLoadingContent, error } = useGetPromptByVersion(
        promptId || undefined, 
        promptInfo?.latestVersionNumber ? String(promptInfo.latestVersionNumber) : undefined
    );
    
    const promptContent = latestVersionContent?.content || '';

    // 4. Effect to set the best initial tab based on content
    useEffect(() => {
        if (opened && promptContent) {
            if (isJson(promptContent)) setActiveTab('json');
            else setActiveTab('raw');
        }
    }, [opened, promptContent]);
    
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={`Preview Prompt: ${promptInfo?.name || 'Loading...'}`}
            fullScreen
            radius={0}
            transitionProps={{ transition: 'fade', duration: 200 }}
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Box pos="relative">
                <LoadingOverlay visible={isLoadingAllPrompts || isLoadingContent} />

                {error && <Alert color="red" title="Error Loading Prompt">{error.message}</Alert>}
                
                {promptInfo && (
                     <Paper withBorder p="md" mb="md" shadow="sm">
                        <Title order={4} mb="sm">Version Information</Title>
                        <SimpleGrid cols={2}>
                             <Box>
                                <Text size="sm" c="dimmed">Latest Version</Text>
                                <Text fw={500}>v{promptInfo.latestVersionNumber}</Text>
                            </Box>
                             <Box>
                                <Text size="sm" c="dimmed">Published Version (used in execution)</Text>
                                {promptInfo.publishedVersionNumber ? (
                                    <Badge color="green" variant="light" size="lg" leftSection={<IconCheck size="1rem" />}>
                                        v{promptInfo.publishedVersionNumber}
                                    </Badge>
                                ) : (
                                    <Badge color="gray" variant="light" size="lg" leftSection={<IconX size="1rem" />}>
                                        None
                                    </Badge>
                                )}
                            </Box>
                        </SimpleGrid>
                    </Paper>
                )}

                <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
                    <Tabs.List>
                        <Tabs.Tab value="raw">Raw Text</Tabs.Tab>
                        <Tabs.Tab value="markdown">Markdown</Tabs.Tab>
                        <Tabs.Tab value="json">JSON</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="raw" pt="xs">
                        <Paper withBorder p="md">
                            <Code 
                              block
                              style={{
                                whiteSpace: 'pre-wrap', // Allow wrapping of long lines
                                wordBreak: 'break-all',   // Force breaks for unbreakable strings
                              }}
                            >
                              {promptContent || "No content to display."}
                            </Code>
                        </Paper>
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="markdown" pt="xs">
                        <Paper withBorder p="md">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{promptContent || "*No content to display*"}</ReactMarkdown>
                        </Paper>
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="json" pt="xs">
                        {isJson(promptContent) ? (
                            <EditableJsonView value={JSON.parse(promptContent)} readOnly />
                        ) : (
                            <Alert icon={<IconAlertCircle size="1rem" />} title="Invalid JSON" color="red">
                                The content could not be parsed as valid JSON.
                            </Alert>
                        )}
                    </Tabs.Panel>
                </Tabs>
            </Box>
        </Modal>
    );
}