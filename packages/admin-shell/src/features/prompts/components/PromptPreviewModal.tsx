// packages/allma-admin-shell/src/features/prompts/components/PromptPreviewModal.tsx

import { useState, useEffect } from 'react';
import { Modal, Tabs, Code, ScrollArea, Alert, Paper, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EditableJsonView } from '@allma/ui-components';

interface PromptPreviewModalProps {
    opened: boolean;
    onClose: () => void;
    promptContent: string;
}

const isJson = (str: string): boolean => {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return false;
    }
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

const isXml = (str: string): boolean => {
    // Simple check, not a full validation
    const trimmed = str.trim();
    return trimmed.startsWith('<') && trimmed.endsWith('>');
};

// Check for common markdown syntax
const hasMarkdown = (str: string): boolean => {
    // This is a heuristic and not exhaustive
    const markdownPatterns = [
        /^#+\s/m,      // Headers
        /(\*|_){1,2}[^\s].*?[^\s](\*|_){1,2}/, // Bold/Italics
        /\[.*\]\(.*\)/, // Links
        /!\[.*\]\(.*\)/, // Images
        /^-{3,}/m,      // Horizontal rules
        /^>\s/m,       // Blockquotes
        /`.*?`/,        // Inline code
        /^(\s*(\*|\+|-)\s.*)/m, // Unordered lists
        /^(\s*\d+\.\s.*)/m,    // Ordered lists
    ];
    return markdownPatterns.some(pattern => pattern.test(str));
}

export function PromptPreviewModal({ opened, onClose, promptContent }: PromptPreviewModalProps) {
    const [activeTab, setActiveTab] = useState<string | null>('raw');
    const [jsonParseError, setJsonParseError] = useState<string | null>(null);
    const [isProbablyXml, setIsProbablyXml] = useState(false);
    const [jsonContent, setJsonContent] = useState<any>(null);

    useEffect(() => {
        if (opened) {
            // Attempt to parse JSON content once when the modal opens
            try {
                const parsed = JSON.parse(promptContent);
                setJsonContent(parsed);
                setJsonParseError(null);
            } catch (e) {
                setJsonContent(null);
                if (e instanceof Error) {
                    setJsonParseError(e.message);
                }
            }
            
            setIsProbablyXml(isXml(promptContent));

            // Detect and set the most appropriate initial tab
            if (isJson(promptContent)) {
                setActiveTab('json');
            } else if (isXml(promptContent)) {
                setActiveTab('xml');
            } else if (hasMarkdown(promptContent)) {
                setActiveTab('markdown');
            } else {
                setActiveTab('raw');
            }
        }
    }, [opened, promptContent]);
    
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Prompt Content Preview"
            fullScreen
            radius={0}
            transitionProps={{ transition: 'fade', duration: 200 }}
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
                <Tabs.List>
                    <Tabs.Tab value="raw">Raw Text</Tabs.Tab>
                    <Tabs.Tab value="markdown">Markdown</Tabs.Tab>
                    <Tabs.Tab value="json">JSON</Tabs.Tab>
                    <Tabs.Tab value="xml">XML</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="raw" pt="xs">
                    <Paper withBorder p="md">
                        <Code block>{promptContent || "No content to display."}</Code>
                    </Paper>
                </Tabs.Panel>
                
                <Tabs.Panel value="markdown" pt="xs">
                     <Paper withBorder p="md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{promptContent || "*No content to display*"}</ReactMarkdown>
                    </Paper>
                </Tabs.Panel>
                
                <Tabs.Panel value="json" pt="xs">
                    {jsonContent !== null ? (
                        <EditableJsonView value={jsonContent} readOnly />
                    ) : (
                        <Alert icon={<IconAlertCircle size="1rem" />} title="Invalid JSON" color="red" mt="md">
                            The content could not be parsed as valid JSON.
                            {jsonParseError && <Text mt="xs"><Code>{jsonParseError}</Code></Text>}
                        </Alert>
                    )}
                </Tabs.Panel>
                
                <Tabs.Panel value="xml" pt="xs">
                     {isProbablyXml ? (
                         <Paper withBorder p="md">
                            <Code block>{promptContent}</Code>
                        </Paper>
                     ) : (
                        <Alert icon={<IconAlertCircle size="1rem" />} title="Not XML" color="orange" mt="md">
                            The content does not appear to be XML.
                        </Alert>
                     )}
                </Tabs.Panel>
            </Tabs>
        </Modal>
    );
}