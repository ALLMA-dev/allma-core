import { Modal, ScrollArea, Box, useMantineColorScheme } from '@mantine/core';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface ContextDiffModalProps {
    opened: boolean;
    onClose: () => void;
    leftContext: any;
    rightContext: any;
    title: string;
    leftTitle?: string;
    rightTitle?: string;
}

const diffViewerStyles = {
  diffContainer: { fontSize: '12px', lineHeight: '1.3em' },
  gutter: { minWidth: '2.2rem' },
  marker: { width: '1.2em' },
  wordDiff: { padding: '2px 1px' },
};

export function ContextDiffModal({ 
    opened, 
    onClose, 
    leftContext, 
    rightContext, 
    title, 
    leftTitle = "Step Input Context (Before)", 
    rightTitle = "Final Context After Step (After)"
}: ContextDiffModalProps) {
    const { colorScheme } = useMantineColorScheme();

    const normalizedLeft = JSON.stringify(leftContext || {}, null, 2);
    const normalizedRight = JSON.stringify(rightContext || {}, null, 2);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={title}
            fullScreen
            radius={0}
            transitionProps={{ transition: 'fade', duration: 200 }}
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Box style={{ flex: 1, overflow: 'auto' }}>
                <ReactDiffViewer
                    oldValue={normalizedLeft}
                    newValue={normalizedRight}
                    splitView={true}
                    useDarkTheme={colorScheme === 'dark'}
                    leftTitle={leftTitle}
                    rightTitle={rightTitle}
                    compareMethod={DiffMethod.WORDS_WITH_SPACE}
                    styles={diffViewerStyles}
                />
            </Box>
        </Modal>
    );
}