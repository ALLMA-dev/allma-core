import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand, UpdateScheduleCommand } from '@aws-sdk/client-scheduler';
import { FlowDefinition, StepInstance, StartFlowExecutionInput, StepType, ENV_VAR_NAMES } from '@allma/core-types';
import { log_info, log_error, log_warn } from '@allma/core-sdk';
import { createHash } from 'crypto';

const schedulerClient = new SchedulerClient({});

/**
 * A service to manage EventBridge Schedules for flow triggers.
 */
export const ScheduleService = {
  /**
   * Synchronizes the schedules for a flow version based on the differences between an old and new version.
   * @param flowId - The ID of the flow.
   * @param oldVersion - The previous version of the flow definition.
   * @param newVersion - The new version of the flow definition.
   */
  async syncSchedulesForFlowVersion(flowId: string, oldVersion?: FlowDefinition, newVersion?: FlowDefinition) {
    const getScheduleSteps = (version?: FlowDefinition): StepInstance[] => {
      if (!version?.steps) return [];
      return Object.values(version.steps).filter((step: StepInstance) => step.stepType === StepType.SCHEDULE_START_POINT);
    };

    const oldSchedules = getScheduleSteps(oldVersion);
    const newSchedules = getScheduleSteps(newVersion);

    const schedulesToDelete = oldSchedules.filter((oldStep: StepInstance) => !newSchedules.some((newStep: StepInstance) => newStep.stepInstanceId === oldStep.stepInstanceId));
    const schedulesToCreate = newSchedules.filter((newStep: StepInstance) => !oldSchedules.some((oldStep: StepInstance) => oldStep.stepInstanceId === newStep.stepInstanceId));
    const schedulesToUpdate = newSchedules.filter((newStep: StepInstance) => oldSchedules.some((oldStep: StepInstance) => oldStep.stepInstanceId === newStep.stepInstanceId));

    for (const step of schedulesToDelete) {
      await this._deleteSchedule(this._generateScheduleName(flowId, oldVersion!.version, step.stepInstanceId));
    }

    for (const step of schedulesToCreate) {
      await this._createSchedule(flowId, newVersion!.version, step, newVersion!.isPublished);
    }

    for (const step of schedulesToUpdate) {
      await this._updateSchedule(flowId, newVersion!.version, step, newVersion!.isPublished);
    }
  },

  /**
   * Generates a deterministic and unique name for a schedule.
   * The name is hashed to ensure it's under the 64-character limit.
   */
  _generateScheduleName(flowId: string, version: number, stepInstanceId: string): string {
    const longName = `${flowId}-v${version}-${stepInstanceId}`;
    const hash = createHash('sha256').update(longName).digest('hex');
    return `allma-${hash.substring(0, 58)}`; // 6 chars for "allma-" + 58 for hash
  },

  /**
   * Creates a new schedule in EventBridge Scheduler.
   */
  async _createSchedule(flowId: string, version: number, step: StepInstance, isPublished: boolean) {
    const scheduleName = this._generateScheduleName(flowId, version, step.stepInstanceId);
    const { scheduleExpression, timezone, enabled, payloadTemplate } = step as any;

    const targetInput: StartFlowExecutionInput = {
      flowDefinitionId: flowId,
      flowVersion: String(version),
      triggerSource: `ScheduleTrigger:${step.stepInstanceId}`,
      initialContextData: payloadTemplate ?? {},
    };

    const command = new CreateScheduleCommand({
      Name: scheduleName,
      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: timezone ?? 'UTC',
      State: isPublished && enabled ? 'ENABLED' : 'DISABLED',
      Target: {
        Arn: process.env[ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_ARN],
        RoleArn: process.env[ENV_VAR_NAMES.EVENTBRIDGE_SCHEDULER_ROLE_ARN],
        Input: JSON.stringify(targetInput),
      },
      FlexibleTimeWindow: { Mode: 'OFF' },
    });

    try {
      await schedulerClient.send(command);
      log_info(`Successfully created schedule: ${scheduleName}`);
    } catch (error: any) {
      log_error(`Error creating schedule ${scheduleName}: ${error.name} - ${error.message}`);
      throw error;
    }
  },

  /**
   * Updates an existing schedule in EventBridge Scheduler.
   */
  async _updateSchedule(flowId: string, version: number, step: StepInstance, isPublished: boolean) {
    const scheduleName = this._generateScheduleName(flowId, version, step.stepInstanceId);
    const { scheduleExpression, timezone, enabled, payloadTemplate } = step as any;

    const targetInput: StartFlowExecutionInput = {
      flowDefinitionId: flowId,
      flowVersion: String(version),
      triggerSource: `ScheduleTrigger:${step.stepInstanceId}`,
      initialContextData: payloadTemplate ?? {},
    };

    const command = new UpdateScheduleCommand({
      Name: scheduleName,
      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: timezone ?? 'UTC',
      State: isPublished && enabled ? 'ENABLED' : 'DISABLED',
      Target: {
        Arn: process.env[ENV_VAR_NAMES.ALLMA_FLOW_START_REQUEST_QUEUE_ARN],
        RoleArn: process.env[ENV_VAR_NAMES.EVENTBRIDGE_SCHEDULER_ROLE_ARN],
        Input: JSON.stringify(targetInput),
      },
      FlexibleTimeWindow: { Mode: 'OFF' },
    });

    try {
      await schedulerClient.send(command);
      log_info(`Successfully updated schedule: ${scheduleName}`);
    } catch (error: any) {
      // If the schedule doesn't exist, create it instead. This can happen if a previous deletion failed.
      if (error.name === 'ResourceNotFoundException') {
        log_warn(`Schedule ${scheduleName} not found for update, creating it instead.`);
        await this._createSchedule(flowId, version, step, isPublished);
      } else {
        log_error(`Error updating schedule ${scheduleName}: ${error.name} - ${error.message}`);
        throw error;
      }
    }
  },

  /**
   * Deletes a schedule from EventBridge Scheduler.
   */
  async _deleteSchedule(scheduleName: string) {
    const command = new DeleteScheduleCommand({ Name: scheduleName });
    try {
      await schedulerClient.send(command);
      log_info(`Successfully deleted schedule: ${scheduleName}`);
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        log_error(`Error deleting schedule ${scheduleName}: ${error.name} - ${error.message}`);
        throw error;
      }
    }
  },
};