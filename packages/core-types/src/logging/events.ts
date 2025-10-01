import { z } from 'zod';

/**
 * Defines the type of a mapping or resolution event during step execution.
 */
export enum MappingEventType {
  INPUT_MAPPING = 'INPUT_MAPPING',
  OUTPUT_MAPPING = 'OUTPUT_MAPPING',
  TEMPLATE_CONTEXT_MAPPING = 'TEMPLATE_CONTEXT_MAPPING',
  S3_POINTER_RESOLVE = 'S3_POINTER_RESOLVE',
  DYNAMIC_PATH_RESOLVE = 'DYNAMIC_PATH_RESOLVE',
}
export const MappingEventTypeSchema = z.nativeEnum(MappingEventType);

/**
 * Defines the status of a mapping event.
 */
export enum MappingEventStatus {
  SUCCESS = 'SUCCESS',
  WARN = 'WARN',
  ERROR = 'ERROR',
  INFO = 'INFO',
}
export const MappingEventStatusSchema = z.nativeEnum(MappingEventStatus);

/**
 * Schema for a single mapping debug event, used for detailed execution tracing.
 */
export const MappingEventSchema = z.object({
  type: MappingEventTypeSchema,
  timestamp: z.string().datetime({ precision: 3, offset: true }),
  status: MappingEventStatusSchema,
  message: z.string(),
  details: z.record(z.any()),
});
export type MappingEvent = z.infer<typeof MappingEventSchema>;

/**
 * Schema for logging the details of a transition evaluation.
 */
export const TransitionEvaluationEventSchema = z.object({
  type: z.enum(['CONDITION', 'DEFAULT', 'END_OF_PATH']),
  condition: z.string().optional(),
  resolvedValue: z.any().optional(),
  result: z.boolean(),
  chosenNextStepId: z.string().optional(),
  mappingEvents: z.array(MappingEventSchema).optional(),
});
export type TransitionEvaluationEvent = z.infer<typeof TransitionEvaluationEventSchema>;