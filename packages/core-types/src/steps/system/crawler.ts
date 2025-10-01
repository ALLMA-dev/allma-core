import { z } from 'zod';

export const CrawlerExtractionRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required.'),
  selector: z.string().min(1, 'CSS selector is required.'),
  type: z.enum(['text', 'html', 'array_of_text']).default('text'),
});
export type CrawlerExtractionRule = z.infer<typeof CrawlerExtractionRuleSchema>;

export const CrawlerLinkExtractionRuleSchema = z.object({
  name: z.string().min(1, 'Link rule name is required.'),
  selector: z.string().min(1, 'CSS selector for link is required.'),
  attribute: z.string().default('href'),
  substring: z.string().min(1, 'Substring to match is required.'),
  returnType: z.enum(['href', 'text']).default('href'),
});
export type CrawlerLinkExtractionRule = z.infer<typeof CrawlerLinkExtractionRuleSchema>;

export const PreNavigationHookSchema = z.object({
    action: z.enum(['click', 'waitFor']),
    selector: z.string().min(1, 'Selector for pre-navigation hook is required.'),
});
export type PreNavigationHook = z.infer<typeof PreNavigationHookSchema>;

/**
 * Defines the configuration for the crawler worker module.
 */
export const CrawlerWorkerCustomConfigSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'At least one start URL is required.'),
  linkDiscovery: z.object({
      selector: z.string().optional().default('a'),
      globs: z.array(z.string()).optional(),
  }).optional(),
  extractionRules: z.array(CrawlerExtractionRuleSchema).min(1, 'At least one extraction rule is required.'),
  linkExtractionRules: z.array(CrawlerLinkExtractionRuleSchema).optional(),
  preNavigationHooks: z.array(PreNavigationHookSchema).optional(),
  crawlerSettings: z.object({
      maxDepth: z.number().int().min(0).optional().default(0),
      maxRequests: z.number().int().min(1).optional().default(50),
      crawlerType: z.enum(['cheerio', 'playwright']).default('cheerio'),
      maxRequestsPerMinute: z.number().int().min(1).optional().default(120),
      navigationTimeoutSecs: z.number().int().min(10).optional().default(120),
      pageValidationSelector: z.string().optional(),
  }).default({}),
});
export type CrawlerWorkerCustomConfig = z.infer<typeof CrawlerWorkerCustomConfigSchema>;