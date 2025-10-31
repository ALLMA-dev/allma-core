import { z } from 'zod';
import { StepTypeSchema } from '../../common/enums.js';

export const EmailStartPointStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.EMAIL_START_POINT),
  emailAddress: z.string().email('Must be a valid email address.').describe("Email Address|text|The unique email address that will trigger this start point."),
  triggerMessagePattern: z.string().optional().describe("Trigger Pattern|text|Optional: A regex pattern to match against the email body (for future use)."),
  keyword: z.string().optional().describe("Keyword/Code|text|An optional, unique code to distinguish between multiple start points for the same email address. The flow will start here if this keyword is found in the email body."),
}).passthrough();

export const ScheduleStartPointStepPayloadSchema = z.object({
  stepType: z.literal(StepTypeSchema.enum.SCHEDULE_START_POINT),
  scheduleExpression: z.string().describe("Schedule Expression|text|The cron or rate expression for the schedule (e.g., `cron(5 8 ? * MON-FRI *)`)."),
  timezone: z.string().optional().describe("Timezone|text|The timezone for the schedule (e.g., `America/New_York`). Defaults to UTC."),
  enabled: z.boolean().default(true).describe("Enabled|switcher|A flag to enable or disable this schedule trigger."),
  payloadTemplate: z.record(z.any()).optional().describe("Payload Template|json|A static JSON payload to be included in the flow's initial context data when the schedule triggers."),
}).passthrough();
