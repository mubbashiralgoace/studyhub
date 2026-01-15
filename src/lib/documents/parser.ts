import mammoth from 'mammoth';

export interface ParsedDocument {
  text: string;
  metadata: {
    filename: string;
    fileType: string;
    pageCount?: number;
    wordCount: number;
  };
}

export const parsePDF = async (buffer: Buffer, filename: string): Promise<ParsedDocument> => {
  try {
    // In Next.js API routes (server-side), we can use require directly
    // Using pdf-parse v1.1.1 which exports a function directly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    
    // pdf-parse v1.1.1 exports a function directly
    // Handle both function and default export cases
    const parseFunction = typeof pdfParse === 'function' 
      ? pdfParse 
      : (pdfParse.default || pdfParse);
    
    if (typeof parseFunction !== 'function') {
      throw new Error(`pdf-parse is not a function. Type: ${typeof pdfParse}`);
    }
    
    const data = await parseFunction(buffer);
    
    if (!data || typeof data.text !== 'string') {
      throw new Error('PDF parsed but no text content found. Data structure: ' + JSON.stringify(Object.keys(data || {})));
    }
    
    return {
      text: data.text,
      metadata: {
        filename,
        fileType: 'pdf',
        pageCount: data.numpages || 0,
        wordCount: data.text.split(/\s+/).filter((w: string) => w.length > 0).length,
      },
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse PDF file: ${errorMessage}`);
  }
};

export const parseDOCX = async (buffer: Buffer, filename: string): Promise<ParsedDocument> => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    return {
      text,
      metadata: {
        filename,
        fileType: 'docx',
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
};

export const parseTXT = async (buffer: Buffer, filename: string): Promise<ParsedDocument> => {
  try {
    const text = buffer.toString('utf-8');
    return {
      text,
      metadata: {
        filename,
        fileType: 'txt',
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error('Error parsing TXT:', error);
    throw new Error('Failed to parse TXT file');
  }
};

export const parseDocument = async (
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedDocument> => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return parsePDF(buffer, filename);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    return parseDOCX(buffer, filename);
  } else if (mimeType === 'text/plain' || extension === 'txt') {
    return parseTXT(buffer, filename);
  } else {
    throw new Error(`Unsupported file type: ${mimeType || extension}`);
  }
};
