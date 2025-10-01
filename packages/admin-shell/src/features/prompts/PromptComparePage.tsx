import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Box, LoadingOverlay, Alert, Group, Select, Text, useMantineColorScheme, Paper } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

import { PageContainer } from '@allma/ui-components';
import { useGetPromptByVersion, useListPromptVersions } from '../../api/promptTemplateService';
import { PromptsBreadcrumbs } from './components/PromptsBreadcrumbs';

const diffViewerStyles = {
  diffContainer: {
    fontSize: '12px',
    lineHeight: '1.3em',
  },
  gutter: {
    minWidth: '2.2rem',
  },
  marker: {
    width: '1.2em',
  },
  wordDiff: {
    padding: '2px 1px',
  },
};

export function PromptComparePage() {
    const { promptId, leftVersion, rightVersion } = useParams<{ promptId: string; leftVersion: string; rightVersion: string }>();
    const navigate = useNavigate();
    const { colorScheme } = useMantineColorScheme();

    // The 'rightVersion' is the one the user clicked on, it's our fixed base.
    // The 'leftVersion' is the one we are comparing against, it's dynamic via the dropdown.
    const { data: leftPrompt, isLoading: isLoadingLeft, error: errorLeft } = useGetPromptByVersion(
        promptId,
        leftVersion === '0' ? undefined : leftVersion // Don't fetch if version is '0' (baseline)
    );
    const { data: rightPrompt, isLoading: isLoadingRight, error: errorRight } = useGetPromptByVersion(promptId, rightVersion);
    
    const { data: allPromptVersions, isLoading: isLoadingAllPromptVersions } = useListPromptVersions(promptId);

    const promptName = rightPrompt?.name || leftPrompt?.name || '...';
    
    const versionOptions = useMemo(() => {
        // Start with a baseline option
        const options = [{ value: '0', label: 'Empty Baseline' }];
        if (!allPromptVersions || !promptId) return options;

        // Add all other versions, excluding the fixed (right) version
        allPromptVersions // `allPromptVersions` already filtered by `promptId` by the hook.
            .filter(p => String(p.version) !== rightVersion) // Filter out the right (fixed) version
            .sort((a, b) => b.version - a.version)
            .forEach(p => {
                options.push({
                    value: String(p.version),
                    label: `Version ${p.version}${p.isPublished ? ' (Published)' : ''}`
                });
            });
        return options;
    }, [allPromptVersions, promptId, rightVersion]); // MODIFIED: Depend on `allPromptVersions`

    const handleLeftVersionChange = (value: string | null) => {
        if (value && promptId) { // Ensure promptId is available
            navigate(`/prompts/compare/${promptId}/${value}/${rightVersion}`);
        }
    };
    
    const isLoading = isLoadingLeft || isLoadingRight || isLoadingAllPromptVersions;
    const error = errorLeft || errorRight;

    // --- NORMALIZE LINE ENDINGS ---
    // This is the crucial fix. It ensures consistent line endings (\n) for both strings,
    // preventing the diff algorithm from being thrown off by invisible characters (\r).
    const normalizedLeftContent = (leftVersion === '0' ? '' : leftPrompt?.content || '').replace(/\r\n/g, '\n');
    const normalizedRightContent = (rightPrompt?.content || '').replace(/\r\n/g, '\n');
    
    const leftTitle = `Version ${leftVersion === '0' ? '(Empty Baseline)' : leftVersion}`;
    const rightTitle = `Version ${rightVersion}`;

    return (
        <PageContainer
            fluid
            breadcrumb={<PromptsBreadcrumbs promptId={promptId} promptName={promptName} isComparing />}
        >
            <Box pos="relative" style={{ height: 'calc(100vh - 120px)' }}>
                <LoadingOverlay visible={isLoading} />
                {error && <Alert color="red" icon={<IconAlertCircle />}>{error.message}</Alert>}
                
                {!isLoading && !error && (
                    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Paper withBorder p="xs" radius={0}>
                           <Group justify="space-between" align="center">
                                <Group>
                                    <Select
                                        aria-label="Select version for comparison on the left"
                                        data={versionOptions}
                                        value={leftVersion}
                                        onChange={handleLeftVersionChange}
                                        searchable
                                        w={200}
                                    />
                                    <Text c="dimmed">compared with</Text>
                                </Group>
                                <Text fw={500} pr="md">{rightTitle}</Text>
                            </Group>
                        </Paper>
                        <Box style={{ flex: 1, overflow: 'auto' }}>
                            <ReactDiffViewer
                                oldValue={normalizedLeftContent}
                                newValue={normalizedRightContent}
                                splitView={true}
                                useDarkTheme={colorScheme === 'dark'}
                                leftTitle={leftTitle}
                                rightTitle={rightTitle}
                                compareMethod={DiffMethod.WORDS_WITH_SPACE}
                                styles={diffViewerStyles}
                            />
                        </Box>
                    </Box>
                )}
            </Box>
        </PageContainer>
    );
}