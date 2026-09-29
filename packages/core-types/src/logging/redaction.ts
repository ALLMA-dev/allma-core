import { z } from 'zod';

export const LogRedactionConfigSchema = z
  .object({
    keys: z.array(z.string()).default([]),
    patterns: z.array(z.string()).default([]),
    replacement: z.string().optional(),
  })
  .superRefine(({ patterns }, ctx) => {
    patterns.forEach((pattern, index) => {
      try {
        new RegExp(pattern, 'gi');
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patterns', index], message: 'Pattern is not a valid regular expression.' });
      }
    });
  });

export type LogRedactionConfig = z.infer<typeof LogRedactionConfigSchema>;
