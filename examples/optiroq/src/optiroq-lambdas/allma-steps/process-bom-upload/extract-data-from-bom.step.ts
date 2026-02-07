import { log_info, log_error } from '@allma/core-sdk';
import { ExcelWorkbook, BomExtractionPlan, ProjectData } from '@optiroq/types';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

interface StepInput {
  workbookData: ExcelWorkbook;
  extractionPlan: BomExtractionPlan;
  correlationId: string;
}

interface ExtractedBomOutput {
  project: ProjectData;
  parts: Record<string, any>[];
  headers: string[];
}

/**
 * Extracts the actual value from a cell, handling formulas, shared formulas, objects, and plain values.
 * @param cellValue The raw cell value from the workbook.
 * @returns The actual display value.
 */
function extractCellValue(cellValue: any): any {
  if (cellValue === null || cellValue === undefined) {
    return null;
  }

  // Handle string representations of JSON objects (formulas, shared formulas, etc.)
  if (typeof cellValue === 'string' && cellValue.startsWith('{')) {
    try {
      const parsed = JSON.parse(cellValue);
      
      // Handle shared formulas
      if (parsed.sharedFormula !== undefined) {
        // For shared formulas, return the result if available
        if (parsed.result !== undefined && parsed.result !== null) {
          return parsed.result;
        }
        // If no result, return null rather than the formula reference
        return null;
      }
      
      // Handle regular formulas
      if (parsed.formula !== undefined) {
        // Return the calculated result if available
        return parsed.result !== undefined ? parsed.result : null;
      }
      
      // Handle other objects
      return cellValue; // Return original if not a formula object
    } catch {
      return cellValue; // If parsing fails, return the original string
    }
  }

  // Handle object values (formulas, shared formulas as objects)
  if (typeof cellValue === 'object') {
    // Handle shared formulas
    if ('sharedFormula' in cellValue) {
      // For shared formulas, return the result if available
      if ('result' in cellValue && cellValue.result !== undefined && cellValue.result !== null) {
        return cellValue.result;
      }
      // If no result available, return null rather than the formula reference
      return null;
    }
    
    // Handle regular formulas
    if ('formula' in cellValue) {
      // Return the calculated result, or null if not available
      return cellValue.result !== undefined ? cellValue.result : null;
    }
    
    // Handle result-only objects
    if ('result' in cellValue && !('formula' in cellValue) && !('sharedFormula' in cellValue)) {
      return cellValue.result !== undefined ? cellValue.result : null;
    }
    
    // Handle rich text cells
    if ('richText' in cellValue) {
      if (Array.isArray(cellValue.richText)) {
        return cellValue.richText
          .map((rt: { text: any; }) => (rt && typeof rt === 'object' && 'text' in rt) ? rt.text : '')
          .join('');
      }
      return cellValue.richText;
    }
    
    // Handle hyperlinks
    if ('text' in cellValue && 'hyperlink' in cellValue) {
      return cellValue.text;
    }
    
    // Handle shared strings
    if ('sharedString' in cellValue) {
      return cellValue.sharedString;
    }
    
    // Handle error values
    if ('error' in cellValue) {
      return `#ERROR: ${cellValue.error}`;
    }
    
    // For other objects, try to stringify or return null
    try {
      return JSON.stringify(cellValue);
    } catch (error) {
      return String(cellValue);
    }
  }

  // Return plain values as-is
  return cellValue;
}

/**
 * Parses an Excel cell address (e.g., "A1", "AA10") into column and row numbers.
 * @param address The cell address.
 * @returns Object with col (1-based) and row (1-based) numbers.
 */
function parseCellAddress(address: string): { col: number; row: number } {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell address: ${address}`);
  }
  
  const colStr = match[1];
  const rowStr = match[2];
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  
  return { col, row: parseInt(rowStr, 10) };
}

/**
 * Converts a 1-based column number to an Excel column name (A, B, ..., Z, AA, etc.).
 * @param colNumber The 1-based column number.
 * @returns The Excel column name.
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
 * @description Executes an LLM-generated plan to deterministically extract project metadata
 * and a table of parts from the full JSON representation of a workbook.
 */
export const handler = async (event: { stepInput: StepInput }): Promise<ExtractedBomOutput> => {
  const { workbookData, extractionPlan, correlationId } = event.stepInput;
  const plan = extractionPlan.analysis;
  log_info('Executing BOM extraction plan', { correlationId, plan });

  try {
    const sheet = workbookData.sheets.find(s => s.sheetName === plan.primarySheetName);
    if (!sheet) {
      throw new Error(`Primary sheet "${plan.primarySheetName}" not found in workbook.`);
    }

    // Create a flat map of all cells by address for easy lookup
    const cellMap = new Map<string, any>();
    sheet.data.flat().forEach(cell => {
      cellMap.set(cell.address, cell);
    });

    // 1. Extract Project Metadata from the LLM plan
    const project: ProjectData = {};
    for (const meta of plan.projectMetadata) {
        // The LLM now extracts the value directly. This is faster and centralizes the extraction logic.
        // The valueCellAddress is kept in the plan for traceability and debugging.
        if (meta.key && meta.value !== undefined && meta.value !== null) {
            project[meta.key] = meta.value;
        } else {
            log_info(`Metadata item from plan is missing a key or value`, { correlationId, meta });
        }
    }

    // 2. Extract Data Table (Parts)
    const headerRow = plan.dataTable.headerRow;
    
    // Find all cells in the header row and sort by column
    const headerCells = Array.from(cellMap.values())
      .filter(cell => {
        const { row } = parseCellAddress(cell.address);
        return row === headerRow;
      })
      .sort((a, b) => {
        const aCol = parseCellAddress(a.address).col;
        const bCol = parseCellAddress(b.address).col;
        return aCol - bCol;
      });

    if (headerCells.length === 0) {
      throw new Error(`No header cells found in row ${headerRow}`);
    }

    // Build header mapping: column number -> header name
    const headerMap = new Map<number, string>();
    const headers: string[] = [];
    
    headerCells.forEach(cell => {
      const { col } = parseCellAddress(cell.address);
      const cellValue = extractCellValue(cell.value);
      const headerValue = cellValue ? String(cellValue).trim() : '';
      if (headerValue) {
        headerMap.set(col, headerValue);
        headers.push(headerValue);
      }
    });

    log_info('Extracted headers', { 
      correlationId, 
      headerCount: headers.length,
      headers: Array.from(headerMap.entries()).map(([col, name]) => `${toColumnName(col)}:${name}`)
    });

    // 3. Extract data rows
    const parts: Record<string, any>[] = [];
    const endRow = plan.dataTable.dataEndRow || sheet.data.length;
    const startRow = plan.dataTable.dataStartRow;

    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const part: Record<string, any> = {};
      let hasData = false;

      // For each header column, find the corresponding cell in this row
      headerMap.forEach((headerName, colNum) => {
        const cellAddress = `${toColumnName(colNum)}${rowNum}`;
        const cell = cellMap.get(cellAddress);
        const value = extractCellValue(cell ? cell.value : null);
        
        part[headerName] = value;
        
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          hasData = true;
        }
      });

      // Check for images in this row
      const image = sheet.images?.find(img => {
        const [startCell] = img.range.split(':');
        const { row: imgRow } = parseCellAddress(startCell);
        return imgRow === rowNum;
      });

      if (image) {
        part._imageS3Key = image.s3Key;
      }

      // Only include rows with actual data
      if (hasData) {
        parts.push(part);
      }
    }

    log_info('Successfully extracted data based on plan', { 
      correlationId, 
      projectDataCount: Object.keys(project).length, 
      partCount: parts.length,
      samplePart: parts[0]
    });

    return { project, parts, headers };

  } catch (error) {
    log_error('Failed to execute BOM extraction plan', { correlationId, error });
    throw error;
  }
};