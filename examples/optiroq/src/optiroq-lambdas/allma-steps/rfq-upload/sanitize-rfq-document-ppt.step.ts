import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { log_info, log_error, offloadIfLarge } from '@allma/core-sdk';
import { randomUUID } from 'crypto';
import yauzl from 'yauzl';
import { XMLParser } from 'fast-xml-parser';

interface StepInput {
  s3Bucket: string;
  s3Key: string;
  correlationId: string;
}

const s3Client = new S3Client({});
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function sanitizeTextForLlm(text: string): string {
    return text.replace(/`/g, "'");
}

/**
 * Extracts text from a buffer representing a single XML file from the PPTX archive.
 * @param buffer The XML file buffer.
 * @returns The extracted text content.
 */
function extractTextFromXml(buffer: Buffer): string {
    const slideObject = xmlParser.parse(buffer);
    let slideText = '';

    // This is a simplified traversal. A real-world parser would need to be more robust
    // and recursively search the object for 'a:t' nodes.
    const traverse = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach(traverse);
        } else if (typeof node === 'object') {
            if (node['a:t']) {
                slideText += (node['a:t'] || '') + ' ';
            }
            Object.values(node).forEach(traverse);
        }
    };

    traverse(slideObject);
    return slideText.trim() + '\n';
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step specialized for PowerPoint files.
 * Extracts text content by unzipping the .pptx archive and parsing slide XML.
 * @param event The input event from Allma.
 * @returns An object with the clean, sanitized text.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<{ cleanText: string } | { _s3_output_pointer: any }> => {
  const { s3Bucket, s3Key, correlationId } = event.stepInput;
  log_info('Sanitizing PowerPoint document', { correlationId, s3Bucket, s3Key });
  
  const artefactsBucket = process.env.ARTEFACTS_BUCKET;
  if (!artefactsBucket) {
      throw new Error('ARTEFACTS_BUCKET environment variable is not set.');
  }

  const fileExtension = s3Key.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'pptx') {
      // For legacy .ppt, a conversion step would be needed first. We only support .pptx here.
      throw new Error(`Unsupported file type for PowerPoint handler: ${fileExtension}. Only .pptx is supported.`);
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
    const stream = response.Body;
    if (!stream) throw new Error('S3 object body is empty.');
    const buffer = await stream.transformToByteArray().then(bytes => Buffer.from(bytes));

    let rawText = '';

    await new Promise<void>((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) return reject(err);

            zipfile.readEntry();
            zipfile.on('entry', (entry: yauzl.Entry) => {
                // We are interested in slides and notes
                if (entry.fileName.startsWith('ppt/slides/slide') || entry.fileName.startsWith('ppt/notesSlides/notesSlide')) {
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err || !readStream) return reject(err);
                        const chunks: Buffer[] = [];
                        readStream.on('data', chunk => chunks.push(chunk));
                        readStream.on('end', () => {
                            const contentBuffer = Buffer.concat(chunks);
                            rawText += extractTextFromXml(contentBuffer);
                            zipfile.readEntry(); // Move to next entry
                        });
                    });
                } else {
                    zipfile.readEntry(); // Skip and move to next entry
                }
            });
            zipfile.on('end', resolve);
            zipfile.on('error', reject);
        });
    });

    log_info('Successfully extracted text from PowerPoint', { correlationId, textLength: rawText.length });

    const cleanText = sanitizeTextForLlm(rawText);

    const result = await offloadIfLarge(
        { cleanText }, 
        `sanitized-output/${correlationId}-${randomUUID()}.json`,
        artefactsBucket,
        correlationId
    );
    
    if (!result) throw new Error('offloadIfLarge returned an undefined result.');
    return result as { cleanText: string } | { _s3_output_pointer: any };

  } catch (error) {
    log_error('Failed to sanitize PowerPoint document', { correlationId, error });
    throw error;
  }
};