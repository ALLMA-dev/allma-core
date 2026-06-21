import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { JSONPath } from 'jsonpath-plus';
import { z } from 'zod';
import {
  LlmMediaAttachment,
  LlmMediaAttachmentSchema,
  LlmMediaContent,
  LlmMediaKind,
  PermanentStepError,
  SUPPORTED_LLM_DOCUMENT_MIME_TYPES,
  SUPPORTED_LLM_IMAGE_MIME_TYPES,
} from '@allma/core-types';
import { log_debug, log_info, log_warn } from '@allma/core-sdk';

const s3Client = new S3Client({});

/** Maps common file extensions to MIME types, used as a last-resort fallback for S3/URL sources. */
const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/** Strips any parameters (e.g. `; charset=utf-8`) and normalizes a raw MIME string. */
function normalizeMimeType(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.split(';')[0].trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Best-effort MIME inference from a key/URL path extension. */
function inferMimeFromPath(path: string): string | undefined {
  const cleaned = path.split('?')[0];
  const ext = cleaned.includes('.') ? cleaned.slice(cleaned.lastIndexOf('.') + 1).toLowerCase() : '';
  return EXTENSION_MIME_MAP[ext];
}

/**
 * Classifies a MIME type into an {@link LlmMediaKind}, throwing a {@link PermanentStepError} for
 * any type not supported by the multimodal providers.
 */
function classifyMime(mimeType: string, correlationId?: string): LlmMediaKind {
  if ((SUPPORTED_LLM_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return LlmMediaKind.IMAGE;
  }
  if ((SUPPORTED_LLM_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return LlmMediaKind.DOCUMENT;
  }
  log_warn('Unsupported media MIME type for LLM attachment.', { mimeType }, correlationId);
  throw new PermanentStepError(
    `Unsupported media type '${mimeType}'. Supported types: ${[
      ...SUPPORTED_LLM_IMAGE_MIME_TYPES,
      ...SUPPORTED_LLM_DOCUMENT_MIME_TYPES,
    ].join(', ')}.`
  );
}

/** Resolves a single attachment to normalized, base64-encoded media. */
async function resolveOne(
  attachment: LlmMediaAttachment,
  correlationId?: string
): Promise<LlmMediaContent> {
  let data: string;
  let mimeType: string | undefined = normalizeMimeType(attachment.mimeType);

  if (attachment.s3Pointer) {
    const { bucket, key } = attachment.s3Pointer;
    log_debug('Resolving LLM media from S3 pointer.', { bucket, key }, correlationId);
    const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) {
      throw new PermanentStepError(`S3 object body is empty for media attachment: ${key}`);
    }
    const bytes = await response.Body.transformToByteArray();
    data = Buffer.from(bytes).toString('base64');
    mimeType = mimeType ?? normalizeMimeType(response.ContentType) ?? inferMimeFromPath(key);
  } else if (attachment.url) {
    log_debug('Resolving LLM media from URL.', { url: attachment.url }, correlationId);
    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new PermanentStepError(
        `Failed to fetch media URL '${attachment.url}': ${response.status} ${response.statusText}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    data = Buffer.from(arrayBuffer).toString('base64');
    mimeType =
      mimeType ?? normalizeMimeType(response.headers.get('content-type') ?? undefined) ?? inferMimeFromPath(attachment.url);
  } else if (attachment.base64) {
    if (!mimeType) {
      throw new PermanentStepError('A base64 media attachment must include an explicit mimeType.');
    }
    data = attachment.base64;
  } else {
    // Unreachable: the schema's refine guarantees exactly one source.
    throw new PermanentStepError('Media attachment has no resolvable source.');
  }

  if (!mimeType) {
    throw new PermanentStepError(
      'Could not determine the MIME type for a media attachment. Provide an explicit mimeType.'
    );
  }

  const kind = classifyMime(mimeType, correlationId);
  return { kind, mimeType, data };
}

/**
 * Resolves a list of media attachment configs into normalized, base64-encoded {@link LlmMediaContent}.
 * Attachments are resolved concurrently. Returns an empty array when given no attachments.
 */
export async function resolveLlmMedia(
  attachments: LlmMediaAttachment[],
  correlationId?: string
): Promise<LlmMediaContent[]> {
  if (attachments.length === 0) return [];
  log_info(`Resolving ${attachments.length} LLM media attachment(s).`, {}, correlationId);
  return Promise.all(attachments.map((a) => resolveOne(a, correlationId)));
}

/**
 * Reads the media attachment configuration off a step, mirroring the EMAIL step's pattern: a
 * static list takes precedence; otherwise a JSONPath into the context is resolved and validated.
 *
 * @param staticList - The step's `mediaAttachments` config, if any.
 * @param dynamicPath - The step's `mediaAttachmentsPath` JSONPath, if any.
 * @param context - The data the JSONPath is evaluated against.
 * @returns A validated array of media attachment configs (possibly empty).
 */
export function getMediaAttachmentsConfig(
  staticList: LlmMediaAttachment[] | undefined,
  dynamicPath: string | undefined,
  context: Record<string, unknown>,
  correlationId?: string
): LlmMediaAttachment[] {
  if (staticList && staticList.length > 0) {
    log_debug('Using static media attachments from step configuration.', { count: staticList.length }, correlationId);
    return staticList;
  }

  if (!dynamicPath) return [];

  log_debug(`Resolving dynamic media attachments from path: ${dynamicPath}`, {}, correlationId);
  const value = JSONPath({ path: dynamicPath, json: context, wrap: false });
  if (value === undefined) {
    log_warn(`mediaAttachmentsPath '${dynamicPath}' resolved to undefined. No media will be sent.`, {}, correlationId);
    return [];
  }

  const validation = z.array(LlmMediaAttachmentSchema).safeParse(value);
  if (!validation.success) {
    throw new PermanentStepError(
      `The data at mediaAttachmentsPath '${dynamicPath}' is not a valid array of media attachments: ${validation.error.message}`
    );
  }
  log_info(`Resolved ${validation.data.length} dynamic media attachment(s).`, {}, correlationId);
  return validation.data;
}
