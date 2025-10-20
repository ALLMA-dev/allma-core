import { Modal, Stack, Alert, Accordion } from '@mantine/core';
import { StepExecutionResult, AllmaStepExecutionRecord, SandboxStepInput, ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD } from '@allma/core-types';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { StandardStepAccordionItem } from '../../../../executions/components/StandardStepAccordionItem';
import { ContextDiffModal } from '../../../../executions/components/ContextDiffModal';
import { useDisclosure } from '@mantine/hooks';

interface SandboxResultModalProps {
    opened: boolean;
    onClose: () => void;
    result: StepExecutionResult | null;
    input: SandboxStepInput | null;
}

export function SandboxResultModal({ opened, onClose, result, input }: SandboxResultModalProps) {
    const [diffData, setDiffData] = useState<{ left: any; right: any; } | null>(null);
    const [diffModalOpened, { open: openDiffModal, close: closeDiffModal }] = useDisclosure(false);

    const syntheticStepRecord = useMemo((): AllmaStepExecutionRecord | null => {
        if (!result || !input) return null;

        const now = new Date();
        const startTime = new Date(now.getTime() - (result.logs?.durationMs || 0));

        // Create a synthetic record that mimics the structure of a real execution log
        // This allows us to reuse the StandardStepAccordionItem component directly.
        const record: any = {
            // --- Mocked/Static fields for component compatibility ---
            flowExecutionId: 'sandbox-run',
            eventTimestamp_stepInstanceId_attempt: `STEP#${now.toISOString()}#${input.stepInstanceId}#1#${result.success ? 'COMPLETED' : 'FAILED'}`,
            itemType: ITEM_TYPE_ALLMA_STEP_EXECUTION_RECORD,
            eventTimestamp: now.toISOString(),
            fullRecordS3Pointer: { bucket: 'N/A', key: 'N/A' },
            stepDefinitionId: 'N/A (Sandbox)',
            stepType: 'N/A (Sandbox)',
            attemptNumber: 1,

            // --- Fields derived from sandbox input & result ---
            stepInstanceId: input.stepInstanceId,
            status: result.success ? 'COMPLETED' : 'FAILED',
            startTime: startTime.toISOString(),
            endTime: now.toISOString(),
            durationMs: result.logs?.durationMs,

            // --- "fullRecordS3Pointer" data (passthrough fields for the UI) ---
            inputMappingContext: input.contextData,
            outputData: result.outputData,
            errorInfo: result.errorInfo,
            logDetails: result.logs || {}, // Ensure logDetails is always an object to prevent the accordion from disappearing.
            // This is the key part for the diff view to work.
            // We use the raw output data as the "right" side of the diff.
            outputMappingContext: result.outputData || (result.errorInfo ? { error: 'Step failed, no output data' } : {}),
            // The input context IS the input mapping result in a sandbox run
            inputMappingResult: input.contextData,
        };

        return record as AllmaStepExecutionRecord;
    }, [result, input]);

    const handleOpenDiff = (step: AllmaStepExecutionRecord) => {
        const fullStepRecord = step as any;
        setDiffData({
            left: fullStepRecord.inputMappingContext,
            right: fullStepRecord.outputMappingContext, // In sandbox, this is the raw step output
        });
        openDiffModal();
    };

    if (!result || !input) return null;
    
    return (
        <>
            <Modal opened={opened} onClose={onClose} title="Sandbox Execution Result" size="90%" centered>
                <Stack>
                    {result.success ? (
                        <Alert color="green" title="Execution Succeeded" icon={<IconCheck />}>
                            The step completed successfully. Review the details below.
                        </Alert>
                    ) : (
                        <Alert color="red" title="Execution Failed" icon={<IconX />}>
                            The step encountered an error. Review the error details below.
                        </Alert>
                    )}
                    
                    {syntheticStepRecord && (
                         <Accordion variant="separated" defaultValue={`${syntheticStepRecord.stepInstanceId}-${syntheticStepRecord.startTime}`}>
                            <StandardStepAccordionItem
                                step={syntheticStepRecord}
                                stepNumber={1}
                                onOpenDiff={handleOpenDiff}
                                onOpenConfig={() => {}} // Not applicable in sandbox
                                onRedrive={() => {}}   // Not applicable in sandbox
                                isSandbox={true}
                            />
                        </Accordion>
                    )}
                </Stack>
            </Modal>
            
            {diffData && (
                 <ContextDiffModal
                    opened={diffModalOpened}
                    onClose={closeDiffModal}
                    title={`Sandbox Diff for Step: ${input?.stepInstanceId}`}
                    leftContext={diffData?.left}
                    rightContext={diffData?.right}
                    leftTitle="Input Context (Before)"
                    rightTitle="Raw Step Output (After - Not Mapped)"
                />
            )}
        </>
    );
}
