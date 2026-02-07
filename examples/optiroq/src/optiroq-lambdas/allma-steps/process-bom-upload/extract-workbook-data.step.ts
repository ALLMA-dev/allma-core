import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import ExcelJS, { CellValue } from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { log_info, log_error } from '@allma/core-sdk';
import { ExcelWorkbook, ExcelSheet, ExcelRow, ExcelCell, ExcelImage, WorkbookExtractionResult } from '@optiroq/types';

interface StepInput {
  s3Bucket: string;
  s3Key: string;
  correlationId: string;
}

const s3Client = new S3Client({});
const SUMMARY_ROW_LIMIT = 200; // Limit the summary to prevent excessive length

/**
 * Converts a 1-based column number to an Excel column name (A, B, ..., Z, AA, etc.).
 */
function toColumnName(colNumber: number): string {
    let columnName = '';
    let num = colNumber;
    while (num > 0) {
        const remainder = (num - 1) % 26;
        columnName = String.fromCharCode(65 + remainder) + columnName;
        num = Math.floor((num - 1) / 26);
    }
    return columnName;
}

/**
 * Gets the string representation of a cell's type.
 */
function getCellType(cell: ExcelJS.Cell): string {
  try {
    switch (cell.type) {
      case ExcelJS.ValueType.Null: return 'null';
      case ExcelJS.ValueType.Number: return 'number';
      case ExcelJS.ValueType.String: return 'string';
      case ExcelJS.ValueType.Date: return 'date';
      case ExcelJS.ValueType.Hyperlink: return 'hyperlink';
      case ExcelJS.ValueType.Formula: return 'formula';
      case ExcelJS.ValueType.SharedString: return 'string';
      case ExcelJS.ValueType.RichText: return 'richtext';
      case ExcelJS.ValueType.Boolean: return 'boolean';
      case ExcelJS.ValueType.Error: return 'error';
      default: return 'unknown';
    }
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Safely converts a Date to ISO string, handling invalid dates.
 */
function safeDateToISOString(date: Date): string | null {
  try {
    // Check if date is valid
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Extracts a clean, serializable VALUE (not formula) from an ExcelJS cell with robust error handling.
 * This prioritizes the calculated result over the formula itself.
 */
function getCellValue(cell: ExcelJS.Cell): CellValue | string | null {
  try {
    if (!cell.value) return null;
    
    const cellValue = cell.value;
    
    // Handle null or undefined
    if (cellValue === null || cellValue === undefined) {
      return null;
    }
    
    // Handle primitive types (string, number, boolean)
    if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
      return cellValue;
    }
    
    // Handle Date objects
    if (cellValue instanceof Date) {
      const isoString = safeDateToISOString(cellValue);
      return isoString || cellValue.toString();
    }
    
    // Handle object types
    if (typeof cellValue === 'object') {
      // CRITICAL: Handle shared formulas - these have a 'sharedFormula' property
      // For shared formulas, we need to get the result from the cell itself
      if ('sharedFormula' in cellValue) {
        // Try to get the calculated result from the cell
        // ExcelJS stores the result separately for shared formulas
        if ('result' in cellValue) {
          const result = cellValue.result;
          
          // Handle null/undefined results
          if (result === null || result === undefined) {
            return null;
          }
          
          // Handle Date result
          if (result instanceof Date) {
            const isoString = safeDateToISOString(result);
            return isoString || result.toString();
          }
          
          // Handle primitive results
          if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
            return result;
          }
          
          // Handle object results
          if (typeof result === 'object') {
            try {
              return JSON.stringify(result);
            } catch {
              return String(result);
            }
          }
          
          return String(result);
        }
        
        // If no result available, try to get it from cell.text or cell.result
        try {
          if (cell.text !== undefined && cell.text !== null && cell.text !== '') {
            return cell.text;
          }
          
          // Try accessing result directly from cell
          if ('result' in cell && cell.result !== undefined && cell.result !== null) {
            const result = cell.result;
            if (result instanceof Date) {
              return safeDateToISOString(result) || result.toString();
            }
            return result;
          }
        } catch (error) {
          // Continue to fallback
        }
        
        // Last resort for shared formulas - return null rather than the formula reference
        return null;
      }
      
      // CRITICAL: Handle regular formulas - return the RESULT, not the formula
      if ('formula' in cellValue && !('sharedFormula' in cellValue)) {
        const result = cellValue.result;
        
        // Handle null/undefined results
        if (result === null || result === undefined) {
          return null;
        }
        
        // Handle Date result
        if (result instanceof Date) {
          const isoString = safeDateToISOString(result);
          return isoString || result.toString();
        }
        
        // Handle primitive results
        if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
          return result;
        }
        
        // Handle object results (shouldn't happen normally, but just in case)
        if (typeof result === 'object') {
          try {
            return JSON.stringify(result);
          } catch {
            return String(result);
          }
        }
        
        // Fallback for other result types
        return String(result);
      }
      
      // Handle cases where result is directly on the object (some formula types)
      if ('result' in cellValue && !('formula' in cellValue) && !('sharedFormula' in cellValue)) {
        const result = (cellValue as { result: unknown }).result;
        
        if (result === null || result === undefined) {
          return null;
        }
        
        if (result instanceof Date) {
          const isoString = safeDateToISOString(result);
          return isoString || result.toString();
        }
        
        if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
          return result;
        }
        
        return String(result);
      }
      
      // Handle rich text
      if ('richText' in cellValue && Array.isArray(cellValue.richText)) {
        try {
          return cellValue.richText
            .map(rt => (rt && typeof rt === 'object' && 'text' in rt) ? rt.text : '')
            .join('');
        } catch (error) {
          return null;
        }
      }
      
      // Handle hyperlinks - return the display text
      if ('text' in cellValue && 'hyperlink' in cellValue) {
        return typeof cellValue.text === 'string' ? cellValue.text : String(cellValue.text);
      }
      
      // Handle shared strings
      if ('sharedString' in cellValue) {
        return typeof cellValue.sharedString === 'string' ? cellValue.sharedString : String(cellValue.sharedString);
      }
      
      // Handle error values
      if ('error' in cellValue) {
        return `#ERROR: ${cellValue.error}`;
      }
      
      // Try to stringify other objects as last resort
      try {
        return JSON.stringify(cellValue);
      } catch (error) {
        return String(cellValue);
      }
    }
    
    // Fallback: convert to string
    return String(cellValue);
  } catch (error) {
    // Ultimate fallback - try to get the cell's text representation
    try {
      // Try cell.text first
      if (cell.text !== undefined && cell.text !== null) {
        return cell.text;
      }
      // Try cell.result
      if ('result' in cell && cell.result !== undefined && cell.result !== null) {
        const result = cell.result;
        if (result instanceof Date) {
          return safeDateToISOString(result) || result.toString();
        }
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Generates a concise text summary of the workbook for LLM analysis.
 */
function generateSummary(workbook: ExcelWorkbook): string {
    try {
      let summary = `Workbook: ${workbook.workbookName || 'Unknown'}\n\n`;
      
      for (const sheet of workbook.sheets || []) {
        summary += `--- SHEET: ${sheet.sheetName || 'Unknown'} (${sheet.rowCount} rows, ${sheet.columnCount} columns) ---\n`;
        let rowCount = 0;
        
        for (const row of sheet.data || []) {
          if (rowCount >= SUMMARY_ROW_LIMIT) {
            const remainingRows = (sheet.data?.length || 0) - SUMMARY_ROW_LIMIT;
            if (remainingRows > 0) {
              summary += `... (and ${remainingRows} more rows)\n`;
            }
            break;
          }
          
          // Get the 1-based row number from the first cell's address
          let rowNumber: string | number = 'N/A';
          try {
            if (row.length > 0 && row[0].address) {
              const match = row[0].address.match(/\d+/);
              rowNumber = match ? parseInt(match[0], 10) : 'N/A';
            }
          } catch (error) {
            // Keep default 'N/A'
          }
          
          const rowValues = row.map(cell => {
            const val = cell.value ?? '';
            // Truncate very long values in summary
            const valStr = String(val);
            return valStr.length > 100 ? valStr.substring(0, 97) + '...' : valStr;
          }).join(' | ');
          
          summary += `Row ${rowNumber}: ${rowValues}\n`;
          rowCount++;
        }
        
        // Add image info if present
        if (sheet.images && sheet.images.length > 0) {
          summary += `Images: ${sheet.images.length} image(s) found in ranges: ${sheet.images.map(img => img.range).join(', ')}\n`;
        }
        
        summary += '\n';
      }
      
      return summary;
    } catch (error) {
      return `Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}

/**
 * Safely extracts image data with error handling.
 */
async function extractImage(
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  image: any,
  correlationId: string,
  artefactsBucket: string
): Promise<ExcelImage | null> {
  try {
    const imageId = parseInt(image.imageId, 10);
    if (isNaN(imageId)) {
      log_error('Invalid image ID', { correlationId, imageId: image.imageId });
      return null;
    }
    
    const imageData = workbook.getImage(imageId);
    if (!imageData?.buffer) {
      return null;
    }
    
    const extension = imageData.extension || 'png';
    const imageKey = `bom-images/${correlationId}/${uuidv4()}.${extension}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: artefactsBucket,
      Key: imageKey,
      Body: Buffer.from(imageData.buffer),
      ContentType: `image/${extension}`,
    }));
    
    // Safely extract range
    let range = 'Unknown';
    try {
      const tlCol = toColumnName((image.range?.tl?.nativeCol ?? 0) + 1);
      const tlRow = (image.range?.tl?.nativeRow ?? 0) + 1;
      const brCol = toColumnName((image.range?.br?.nativeCol ?? 0) + 1);
      const brRow = (image.range?.br?.nativeRow ?? 0) + 1;
      range = `${tlCol}${tlRow}:${brCol}${brRow}`;
    } catch (error) {
      log_error('Failed to extract image range', { correlationId, error });
    }
    
    return {
      s3Key: `s3://${artefactsBucket}/${imageKey}`,
      range
    };
  } catch (error) {
    log_error('Failed to extract image', { correlationId, error });
    return null;
  }
}

/**
 * @description An Allma CUSTOM_LAMBDA_INVOKE step.
 * Fetches an Excel file, converts it to a full JSON representation with VALUES (not formulas), 
 * offloads it to S3, and generates a lightweight text summary for LLM analysis.
 * @param event The input event from Allma.
 * @returns An object containing the text summary and a pointer to the full data in S3.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<WorkbookExtractionResult> => {
  const { s3Bucket, s3Key, correlationId } = event.stepInput;
  log_info('Extracting full workbook data from file', { correlationId, s3Bucket, s3Key });

  const artefactsBucket = process.env.ARTEFACTS_BUCKET!;
  if (!artefactsBucket) {
    throw new Error('ARTEFACTS_BUCKET environment variable is not set.');
  }

  try {
    // Fetch file from S3
    const getObjectCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key });
    const response = await s3Client.send(getObjectCommand);
    const stream = response.Body as Readable;

    if (!stream) {
      throw new Error('S3 object body is empty.');
    }

    // Load workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.read(stream);

    const sheets: ExcelSheet[] = [];
    
    // Process each worksheet
    for (const worksheet of workbook.worksheets) {
      try {
        const sheetData: ExcelRow[] = [];
        const rowCount = worksheet.rowCount || 0;
        const columnCount = worksheet.columnCount || 0;
        
        log_info('Processing worksheet', { 
          correlationId, 
          sheetName: worksheet.name, 
          rowCount, 
          columnCount 
        });
        
        // Extract cell data
        for (let i = 1; i <= rowCount; i++) {
          try {
            const row = worksheet.getRow(i);
            const rowData: ExcelCell[] = [];
            
            for (let j = 1; j <= columnCount; j++) {
              try {
                const cell = row.getCell(j);
                
                // Handle merged cells. Only process the master cell of a merge range.
                if (cell.isMerged && cell.master && cell.address !== cell.master.address) {
                  continue;
                }

                // Skip empty/null cells to save space and reduce noise
                if (!cell.value || cell.type === ExcelJS.ValueType.Null) {
                  continue;
                }

                // Get the CALCULATED VALUE, not the formula
                const cellValue = getCellValue(cell);
                const cellType = getCellType(cell);
                
                // Only include cells with actual content
                if (cellValue !== null && cellValue !== undefined) {
                  // Additional check: skip cells with empty string values
                  if (typeof cellValue === 'string' && cellValue.trim() === '') {
                    continue;
                  }
                  
                  rowData.push({
                    address: cell.address || `${toColumnName(j)}${i}`,
                    value: cellValue,
                    type: cellType,
                  });
                }
              } catch (cellError) {
                log_error('Error processing cell', { 
                  correlationId, 
                  sheetName: worksheet.name, 
                  row: i, 
                  col: j, 
                  error: cellError 
                });
                // Continue processing other cells
              }
            }
            
            // Only add non-empty rows
            if (rowData.length > 0) {
              sheetData.push(rowData);
            }
          } catch (rowError) {
            log_error('Error processing row', { 
              correlationId, 
              sheetName: worksheet.name, 
              row: i, 
              error: rowError 
            });
            // Continue processing other rows
          }
        }

        // Extract images
        const images: ExcelImage[] = [];
        try {
          const worksheetImages = worksheet.getImages();
          
          for (const image of worksheetImages) {
            const extractedImage = await extractImage(
              worksheet, 
              workbook, 
              image, 
              correlationId, 
              artefactsBucket
            );
            
            if (extractedImage) {
              images.push(extractedImage);
            }
          }
        } catch (imageError) {
          log_error('Error processing images for sheet', { 
            correlationId, 
            sheetName: worksheet.name, 
            error: imageError 
          });
          // Continue without images
        }

        sheets.push({
          sheetName: worksheet.name || 'Unknown',
          rowCount,
          columnCount,
          data: sheetData,
          images
        });
        
        log_info('Completed processing worksheet', {
          correlationId,
          sheetName: worksheet.name,
          extractedRows: sheetData.length,
          extractedCells: sheetData.reduce((sum, row) => sum + row.length, 0),
          extractedImages: images.length
        });
        
      } catch (sheetError) {
        log_error('Error processing worksheet', { 
          correlationId, 
          sheetName: worksheet.name, 
          error: sheetError 
        });
        // Continue processing other sheets
      }
    }

    const fullWorkbookData: ExcelWorkbook = {
      workbookName: s3Key,
      sheets
    };

    // Generate the lightweight summary for the LLM
    const workbookSummaryForLlm = generateSummary(fullWorkbookData);
    
    const totalCells = sheets.reduce((sum, sheet) => 
      sum + sheet.data.reduce((rowSum, row) => rowSum + row.length, 0), 0
    );
    
    log_info('Successfully extracted workbook structure and created summary', { 
      correlationId, 
      sheetCount: sheets.length,
      totalCells,
      summaryLength: workbookSummaryForLlm.length
    });

    return {
      workbookSummaryForLlm,
      fullWorkbookData,
    };

  } catch (error) {
    log_error('Failed to extract workbook data', { correlationId, error });
    throw error;
  }
};