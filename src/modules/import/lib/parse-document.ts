import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type ParsedImage = {
  data: Buffer;
  mimeType: string;
  description?: string;
};

export type ParsedDocument = {
  text: string;
  images: ParsedImage[];
};

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB

const SUPPORTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
];

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Maximum size is 24MB.";
  }
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return "Unsupported file type. Please upload a .docx or .pdf file.";
  }
  return null;
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    return parsePdf(buffer);
  }

  return parseDocx(buffer);
}

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    images: [], // Future: extract embedded images
  };
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return {
    text: result.text,
    images: [], // Future: render pages as images for vision API
  };
}
