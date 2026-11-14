import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import type { ExtractedDocument } from '../../types/requirements.ts';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function extension(name: string): string {
  return name.toLowerCase().split('.').pop() || '';
}

function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
}

async function parsePdf(file: File): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? '\n' : ' ';
      }
      pages.push(normalize(pageText));
    }
  } finally {
    await (pdf as any).destroy?.();
  }
  return {
    text: pages.join('\n\n'),
    pages,
    pageCount: pages.length,
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
  };
}

async function parseDocx(file: File): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = normalize(result.value);
  return {
    text,
    pages: [text],
    pageCount: 1,
    fileName: file.name,
    mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

async function parsePlain(file: File): Promise<ExtractedDocument> {
  const text = normalize(await file.text());
  return {
    text,
    pages: [text],
    pageCount: 1,
    fileName: file.name,
    mimeType: file.type || (extension(file.name) === 'md' ? 'text/markdown' : 'text/plain'),
  };
}

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  if (!file || file.size === 0) throw new Error('The selected file is empty.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Document is too large. Maximum size is 25 MB.');

  const ext = extension(file.name);
  let extracted: ExtractedDocument;
  try {
    if (ext === 'pdf' || file.type === 'application/pdf') extracted = await parsePdf(file);
    else if (ext === 'docx' || file.type.includes('wordprocessingml')) extracted = await parseDocx(file);
    else if (['txt', 'md', 'markdown'].includes(ext) || file.type.startsWith('text/')) extracted = await parsePlain(file);
    else throw new Error('Unsupported format. Upload PDF, DOCX, TXT or Markdown.');
  } catch (error: any) {
    if (error?.message?.startsWith('Unsupported format')) throw error;
    throw new Error(`Could not read ${file.name}. The file may be malformed or password-protected.`);
  }

  if (!extracted.text.trim()) throw new Error('No readable text was found in the document.');
  return extracted;
}
