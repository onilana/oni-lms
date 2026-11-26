declare module 'mammoth' {
  export interface Result {
    value: string;
    messages: any[];
  }

  export interface Options {
    styleMap?: string | string[];
    includeDefaultStyleMap?: boolean;
    convertImage?: any;
    ignoreEmptyParagraphs?: boolean;
  }

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { path: string } | { buffer: any },
    options?: Options
  ): Promise<Result>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { path: string } | { buffer: any }
  ): Promise<Result>;

  const mammoth: {
    convertToHtml: typeof convertToHtml;
    extractRawText: typeof extractRawText;
  };

  export default mammoth;
}
