import { handler } from './sanitize-rfq-document-ppt.step';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { Readable } from 'stream';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import JSZip from 'jszip';

jest.mock('@allma/core-sdk', () => ({
  log_info: jest.fn(),
  log_error: jest.fn(),
  offloadIfLarge: jest.fn((data) => Promise.resolve(data)),
}));

const s3Mock = mockClient(S3Client);

describe('sanitize-rfq-document-ppt handler', () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();
    process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket';
  });

  afterEach(() => {
    delete process.env.ARTEFACTS_BUCKET;
  });

  async function createMockPptxBuffer(): Promise<Buffer> {
    const zip = new JSZip();
    // Simplified XML structure for a slide
    const slide1Xml = `
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:txBody>
              <a:p><a:r><a:t>Title Text</a:t></a:r></a:p>
            </p:txBody>
            <p:txBody>
              <a:p><a:r><a:t>Bullet 1 with 'backticks'</a:t></a:r></a:p>
            </p:txBody>
          </p:spTree>
        </p:cSld>
      </p:sld>`;
    const notes1Xml = `<p:notes><p:txBody><a:p><a:t>Speaker note.</a:t></a:p></p:txBody></p:notes>`;
    
    zip.file('ppt/slides/slide1.xml', slide1Xml);
    zip.file('ppt/notesSlides/notesSlide1.xml', notes1Xml);
    zip.file('_rels/.rels', '<xml/>'); // Other required files

    return zip.generateAsync({ type: 'nodebuffer' });
  }

  it('should correctly parse a .pptx file and extract text from slides and notes', async () => {
    const pptxBuffer = await createMockPptxBuffer();
    const stream = sdkStreamMixin(Readable.from(pptxBuffer));
    s3Mock.on(GetObjectCommand).resolves({ Body: stream });

    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'presentation.pptx', correlationId: 'corr-ppt' } };
    const result = await handler(event);

    const expectedCleanText = "Title Text Bullet 1 with 'backticks'\nSpeaker note.\n";
    expect(result).toEqual({ cleanText: expectedCleanText });
  });

  it('should throw an error for unsupported .ppt files', async () => {
    const event = { stepInput: { s3Bucket: 'test-bucket', s3Key: 'old-presentation.ppt', correlationId: 'corr-ppt-fail' } };
    
    await expect(handler(event)).rejects.toThrow('Unsupported file type for PowerPoint handler: ppt. Only .pptx is supported.');
  });
});