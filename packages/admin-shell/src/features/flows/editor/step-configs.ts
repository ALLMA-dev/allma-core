import { StepType } from '@allma/core-types';
import {
    IconApi,
    IconLogicAnd,
    IconPlayerTrackNext,
    IconMessage2Code,
    IconBox,
    IconRepeat,
    IconHourglass,
    IconArrowsSplit,
    IconArrowRight,
    IconDeviceFloppy,
    IconFileImport,
    IconCloudUpload,
    IconSitemap,
    IconPlayerPlay,
    IconMessage,
    IconMail,
    IconClock,
    IconPlugConnected,
} from '@tabler/icons-react';
import React from 'react';

export interface StepTypeConfig {
  type: StepType;
  label: string;
  icon: React.FC<any>;
  isAvailableInPalette: boolean; // Not all step types should be draggable by users
  category?: string;
}

// Centralized configuration for all step types.
// This drives the appearance of nodes and the available steps in the palette.
export const STEP_TYPE_CONFIGS: Record<StepType, StepTypeConfig> = {
  [StepType.LLM_INVOCATION]: { type: StepType.LLM_INVOCATION, label: 'LLM Invocation', icon: IconMessage2Code, isAvailableInPalette: true },
  [StepType.DATA_LOAD]: { type: StepType.DATA_LOAD, label: 'Data Load', icon: IconFileImport, isAvailableInPalette: true },
  [StepType.DATA_SAVE]: { type: StepType.DATA_SAVE, label: 'Data Save', icon: IconDeviceFloppy, isAvailableInPalette: true },
  [StepType.DATA_TRANSFORMATION]: { type: StepType.DATA_TRANSFORMATION, label: 'Data Transform', icon: IconLogicAnd, isAvailableInPalette: true },
  [StepType.CUSTOM_LOGIC]: { type: StepType.CUSTOM_LOGIC, label: 'Custom Logic', icon: IconBox, isAvailableInPalette: false },
  [StepType.API_CALL]: { type: StepType.API_CALL, label: 'API Call', icon: IconApi, isAvailableInPalette: true, category: 'Integrations' },
  [StepType.MCP_CALL]: { type: StepType.MCP_CALL, label: 'MCP Call', icon: IconPlugConnected, isAvailableInPalette: true, category: 'Integrations' },
  
  [StepType.START_SUB_FLOW]: { type: StepType.START_SUB_FLOW, label: 'Start Sub-Flow', icon: IconSitemap, isAvailableInPalette: true },
  [StepType.NO_OP]: { type: StepType.NO_OP, label: 'No-Op', icon: IconPlayerTrackNext, isAvailableInPalette: true },
  [StepType.END_FLOW]: { type: StepType.END_FLOW, label: 'End Flow', icon: IconArrowRight, isAvailableInPalette: true },
  [StepType.WAIT_FOR_EXTERNAL_EVENT]: { type: StepType.WAIT_FOR_EXTERNAL_EVENT, label: 'Wait for Event', icon: IconHourglass, isAvailableInPalette: true },
  [StepType.POLL_EXTERNAL_API]: { type: StepType.POLL_EXTERNAL_API, label: 'Poll API', icon: IconRepeat, isAvailableInPalette: true },
  [StepType.PARALLEL_FORK_MANAGER]: { type: StepType.PARALLEL_FORK_MANAGER, label: 'Parallel Fork', icon: IconArrowsSplit, isAvailableInPalette: true },
  [StepType.CUSTOM_LAMBDA_INVOKE]: { type: StepType.CUSTOM_LAMBDA_INVOKE, label: 'Invoke Lambda', icon: IconCloudUpload, isAvailableInPalette: true },
  [StepType.START_FLOW_EXECUTION]: { type: StepType.START_FLOW_EXECUTION, label: 'Start Flow', icon: IconPlayerPlay, isAvailableInPalette: true },
  [StepType.SQS_SEND]: { type: StepType.SQS_SEND, label: 'SQS Send Message', icon: IconMessage, isAvailableInPalette: true },
  [StepType.SNS_PUBLISH]: { type: StepType.SNS_PUBLISH, label: 'SNS Publish Message', icon: IconMessage, isAvailableInPalette: true },
  [StepType.EMAIL]: { type: StepType.EMAIL, label: 'Send Email', icon: IconMail, isAvailableInPalette: true },
  [StepType.EMAIL_START_POINT]: { type: StepType.EMAIL_START_POINT, label: 'Email Start Point', icon: IconMail, isAvailableInPalette: true, category: 'Start Points' },
  [StepType.SCHEDULE_START_POINT]: { type: StepType.SCHEDULE_START_POINT, label: 'Schedule', icon: IconClock, isAvailableInPalette: true, category: 'Start Points' },
};

/**
 * A helper function to safely get a step's configuration.
 * If the type is unknown, it returns the configuration for the NO_OP step type
 * to prevent runtime errors.
 * @param stepType The StepType enum member.
 * @returns The corresponding StepTypeConfig.
 */
export const getStepConfig = (stepType: StepType): StepTypeConfig => {
    return (STEP_TYPE_CONFIGS as Record<StepType, StepTypeConfig>)[stepType] || STEP_TYPE_CONFIGS[StepType.NO_OP];
};
