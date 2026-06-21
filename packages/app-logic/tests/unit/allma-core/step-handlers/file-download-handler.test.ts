import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { S3Client } from '@aws-sdk/client-s3';
import { StepType, TransientStepError, type StepDefinition } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../../_helpers/aws-mock.js';
import { makeRuntimeState } from '../../_helpers/fixtures.js';

// axios is the transport collaborator (mocked); S3 is stubbed at the client layer so the
// lib-storage Upload streams "to S3" without real network/credentials. Clear the default
// bucket env before import so the "missing bucket" branch is deterministic; success cases
// pass destinationBucket explicitly.
vi.hoisted(() => {
  delete process.env.ALLMA_EXECUTION_TRACES_BUCKET_NAME;
  // The module-scope S3 client is constructed with no explicit region; give it one so the
  // lib-storage Upload can resolve an endpoint (the send itself is intercepted by the mock).
  process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
});

vi.mock('axios', () => {
  const fn = vi.fn();
  return { default: Object.assign(fn, { isAxiosError: vi.fn(() => false) }) };
});

import axios from 'axios';
import { handleFileDownload } from '../../../../src/allma-core/step-handlers/file-download-handler.js';

const mockedAxios = vi.mocked(axios);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);
const s3Mock = mockClient(S3Client);

const makeStepDef = (overrides: Record<string, unknown> = {}): StepDefinition =>
  ({
    id: 'dl-1',
    stepType: StepType.FILE_DOWNLOAD,
    sourceUrlTemplate: 'https://files.test/{{name}}',
    destinationBucket: 'my-bucket',
    destinationKeyTemplate: 'downloads/{{name}}',
    ...overrides,
  }) as unknown as StepDefinition;

const streamResponse = (body: string, headers: Record<string, string>): unknown => ({
  data: Readable.from([Buffer.from(body)]),
  headers,
});

describe('handleFileDownload', () => {
  beforeEach(() => {
    resetAwsClientMocks(s3Mock);
    s3Mock.resolves({});
    mockedAxios.mockReset();
    mockedIsAxiosError.mockReturnValue(false);
  });

  it('streams the download to S3 and returns an S3 pointer wrapper', async () => {
    mockedAxios.mockResolvedValue(
      streamResponse('hello world', { 'content-type': 'text/plain', 'content-length': '11' })
    );

    const result = await handleFileDownload(
      makeStepDef(),
      {},
      makeRuntimeState({ currentContextData: { name: 'report.txt' } })
    );

    expect(result.outputData).toMatchObject({
      filePointer: { bucket: 'my-bucket', key: 'downloads/report.txt' },
      content: { _s3_output_pointer: { bucket: 'my-bucket', key: 'downloads/report.txt' } },
      contentType: 'text/plain',
      contentLength: 11,
      _meta: { status: 'SUCCESS', sourceUrl: 'https://files.test/report.txt' },
    });
    // The rendered URL is what axios was asked to fetch.
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://files.test/report.txt', responseType: 'stream' })
    );
  });

  it('defaults the content type to octet-stream when the response omits it', async () => {
    mockedAxios.mockResolvedValue(streamResponse('x', {}));

    const result = await handleFileDownload(makeStepDef(), {}, makeRuntimeState({ currentContextData: { name: 'f' } }));

    expect(result.outputData!.contentType).toBe('application/octet-stream');
    expect(result.outputData!.contentLength).toBeUndefined();
  });

  it('rejects a structurally invalid step definition', async () => {
    await expect(
      handleFileDownload({ stepType: StepType.FILE_DOWNLOAD } as never, {}, makeRuntimeState())
    ).rejects.toThrow('Invalid StepDefinition for FILE_DOWNLOAD');
  });

  it('throws when no destination bucket is configured', async () => {
    await expect(
      handleFileDownload(
        makeStepDef({ destinationBucket: undefined }),
        {},
        makeRuntimeState({ currentContextData: { name: 'f' } })
      )
    ).rejects.toThrow('Destination bucket is not configured');
  });

  it('maps a 5xx response to a TransientStepError', async () => {
    mockedIsAxiosError.mockReturnValue(true);
    mockedAxios.mockRejectedValue({ response: { status: 503 }, message: 'server error' });

    await expect(
      handleFileDownload(makeStepDef(), {}, makeRuntimeState({ currentContextData: { name: 'f' } }))
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('maps a connection-aborted timeout to a TransientStepError', async () => {
    mockedIsAxiosError.mockReturnValue(true);
    mockedAxios.mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' });

    await expect(
      handleFileDownload(makeStepDef(), {}, makeRuntimeState({ currentContextData: { name: 'f' } }))
    ).rejects.toBeInstanceOf(TransientStepError);
  });

  it('re-throws a non-axios error unchanged', async () => {
    const boom = new Error('unexpected');
    mockedAxios.mockRejectedValue(boom);

    await expect(
      handleFileDownload(makeStepDef(), {}, makeRuntimeState({ currentContextData: { name: 'f' } }))
    ).rejects.toBe(boom);
  });
});
