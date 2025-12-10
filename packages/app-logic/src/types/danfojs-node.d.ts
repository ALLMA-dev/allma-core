declare module 'danfojs-node' {
  export class DataFrame {
    constructor(data: any, options?: any);
    get columns(): string[];
    get shape(): [number, number];
    loc(options: { columns: string[] }): DataFrame;
    print(): void;
  }

  export function readCSV(source: Buffer | string, options?: any): Promise<DataFrame>;
  export function merge(options: {
    left: DataFrame;
    right: DataFrame;
    on: string[];
    how: 'inner' | 'left' | 'right' | 'outer';
    suffixes?: [string, string];
  }): DataFrame;
  export function toCSV(df: DataFrame, options?: { header?: boolean; index?: boolean }): string;
  export function toJSON(df: DataFrame, options?: { format?: 'row' | 'column' }): Array<any>;
}