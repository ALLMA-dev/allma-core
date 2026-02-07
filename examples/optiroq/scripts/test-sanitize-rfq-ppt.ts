/**
 * Local Test Runner for the 'sanitize-rfq-document-ppt' Lambda.
 *
 * This script tests the PPTX parsing logic using a dynamically generated in-memory
 * .pptx file, avoiding the need to store binary files in the repository.
 *
 * How to use:
 * 1. Run the script from the 'examples/optiroq' directory using the command:
 *    `npm run test:local:sanitize-rfq-ppt`
 * 2. The extracted text output will be printed and saved to 'sanitized-rfq-ppt.json'.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';
import JSZip from 'jszip';
import { handler } from '../src/optiroq-lambdas/allma-steps/rfq-upload/sanitize-rfq-document-ppt.step';

const s3Mock = mockClient(S3Client);

async function createMockPptxBuffer(): Promise<Buffer> {
  const zip = new JSZip();
  const slide1Xml = `
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree>
        <p:txBody><a:p><a:r><a:t>Title with \`backticks\`</a:t></a:r></a:p></p:txBody>
        <p:txBody><a:p><a:r><a:t>Bullet Point 1</a:t></a:r></a:p></p:txBody>
      </p:spTree></p:cSld>
    </p:sld>`;
  const notes1Xml = `<p:notes><p:txBody><a:p><a:t>This is a speaker note.</a:t></a:p></p:txBody></p:notes>`;
  
  zip.file('ppt/slides/slide1.xml', slide1Xml);
  zip.file('ppt/notesSlides/notesSlide1.xml', notes1Xml);
  zip.file('_rels/.rels', '<xml/>'); // Other required files

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function main() {
  console.log(`Testing PPTX handler with in-memory .pptx file...`);

  const pptxBuffer = await createMockPptxBuffer();
  const stream = sdkStreamMixin(Readable.from(pptxBuffer));

  s3Mock.on(GetObjectCommand).resolves({ Body: stream });
  s3Mock.on(PutObjectCommand).resolves({}); // Mock for offloadIfLarge

  process.env.ARTEFACTS_BUCKET = 'mock-artefacts-bucket';

  const event = {
    stepInput: {
      s3Bucket: 'mock-bucket',
      s3Key: 'mock-presentation.pptx',
      correlationId: `local-test-ppt-${new Date().toISOString()}`,
    },
  };

  try {
    console.log('\nInvoking handler...');
    const result = await handler(event);

    console.log('\n✅ Handler executed successfully!');
    console.log('--- Sanitized Text Output ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('----------------------------\n');

    const outputPath = path.join(__dirname, '..', 'test-data', 'sanitized-rfq-ppt.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 Output saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('\n❌ Handler execution failed:', error);
    process.exit(1);
  } finally {
    delete process.env.ARTEFACTS_BUCKET;
  }
}

main();