import { handler } from './sanitize-rfq-document-ocr.step';
import { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_error: jest.fn(),
  offloadIfLarge: jest.fn((data) => Promise.resolve(data)),
}));

const textractMock = mockClient(TextractClient);

describe('sanitize-rfq-document-ocr handler', () => {
  beforeEach(() => {
    textractMock.reset();
    jest.clearAllMocks();
    process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket';
  });

  afterEach(() => {
    delete process.env.ARTEFACTS_BUCKET;
  });

  it('should process a PDF using Textract with polling', async () => {
    jest.useFakeTimers();

    textractMock.on(StartDocumentTextDetectionCommand).resolves({ JobId: 'fake-job-id' });
    textractMock.on(GetDocumentTextDetectionCommand)
      .resolvesOnce({ JobStatus: 'IN_PROGRESS' })
      .resolvesOnce({
        JobStatus: 'SUCCEEDED',
        Blocks: [
          { BlockType: 'LINE', Text: 'Line 1 from `PDF`' },
          { BlockType: 'LINE', Text: 'Line 2' },
        ],
      });
      
    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'test.pdf', correlationId: 'corr-ocr' } };
    const handlerPromise = handler(event);

    await jest.advanceTimersByTimeAsync(2000); // Simulate one polling interval
    const result = await handlerPromise;

    expect(textractMock).toHaveReceivedCommand(StartDocumentTextDetectionCommand);
    expect(textractMock).toHaveReceivedCommandTimes(GetDocumentTextDetectionCommand, 2);
    expect(result).toEqual({ cleanText: "Line 1 from 'PDF'\nLine 2" });

    jest.useRealTimers();
  });

  it('should throw an error if Textract job fails', async () => {
    textractMock.on(StartDocumentTextDetectionCommand).resolves({ JobId: 'fake-job-id' });
    textractMock.on(GetDocumentTextDetectionCommand).resolves({ JobStatus: 'FAILED', StatusMessage: 'Internal error' });
      
    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'test.jpg', correlationId: 'corr-ocr-fail' } };
    
    await expect(handler(event)).rejects.toThrow('Textract job failed: Internal error');
  });

  it('should throw an error for unsupported file types', async () => {
    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'document.docx', correlationId: 'corr-ocr-unsupported' } };
    
    await expect(handler(event)).rejects.toThrow('Unsupported file type for OCR handler: docx');
  });
});