import mammoth from "mammoth";

export type ParsedImage = {
  data: Buffer;
  mimeType: string;
  description?: string;
};

export type ParsedDocument = {
  text: string;
  pdfBuffer?: Buffer;
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
    // PDFs are sent directly to Claude's API as document content
    return {
      text: "",
      pdfBuffer: buffer,
      images: [],
    };
  }

  return parseDocx(buffer);
}

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    images: [],
  };
}
