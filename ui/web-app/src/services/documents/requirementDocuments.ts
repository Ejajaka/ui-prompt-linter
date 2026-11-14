import type {
  RequirementDocument,
  RequirementMetadata,
  RequirementRecord,
  RequirementRow,
} from '../../types/requirements.ts';
import { compileRequirements } from '../requirements/compiler.ts';
import { extractDocumentText } from '../documents/parseDocument.ts';
import { supabase } from '../supabase/client.ts';

const BUCKET = 'requirement-documents';

function requireClient() {
  if (!supabase) throw new Error('Connect Supabase to upload requirement documents.');
  return supabase;
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 160) || 'document';
}

function mapDocument(row: any): RequirementDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    extractedText: row.extracted_text,
    pageCount: row.page_count,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function mapRequirement(row: RequirementRow): RequirementRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    documentId: row.document_id,
    requirementCode: row.requirement_code,
    originalText: row.original_text,
    normalizedText: row.normalized_text,
    kind: row.kind,
    status: row.status,
    priority: row.priority,
    priorityReason: row.priority_reason,
    sourcePage: row.source_page,
    sourceParagraph: row.source_paragraph,
    sourceCharStart: row.source_char_start || 0,
    sourceCharEnd: row.source_char_end || 0,
    metadata: (row.metadata || { screens: [], components: [], roles: [], behaviours: [] }) as RequirementMetadata,
    createdAt: row.created_at,
  };
}

export async function listRequirementDocuments(projectId: string): Promise<RequirementDocument[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('requirement_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapDocument);
}

export async function listRequirements(projectId: string): Promise<RequirementRecord[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('requirements')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRequirement(row as RequirementRow));
}

export interface UploadResult {
  document: RequirementDocument;
  requirements: RequirementRecord[];
}

export async function uploadRequirementDocument(
  projectId: string,
  userId: string,
  file: File,
  onProgress?: (stage: 'uploading' | 'parsing' | 'saving', message?: string) => void,
): Promise<UploadResult> {
  const client = requireClient();
  const documentId = crypto.randomUUID();
  const storagePath = `${projectId}/${documentId}/${safeFileName(file.name)}`;

  onProgress?.('uploading', 'Uploading original document…');
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  onProgress?.('parsing', 'Reading the document…');
  const { data: inserted, error: insertError } = await client
    .from('requirement_documents')
    .insert({
      id: documentId,
      project_id: projectId,
      uploaded_by: userId,
      file_name: file.name,
      mime_type: file.type || null,
      storage_path: storagePath,
      status: 'processing',
    })
    .select('*')
    .single();
  if (insertError) throw new Error(insertError.message);

  let extracted;
  try {
    extracted = await extractDocumentText(file);
  } catch (error: any) {
    await client
      .from('requirement_documents')
      .update({ status: 'failed', error_message: error?.message || 'Could not parse document.' })
      .eq('id', documentId);
    throw error;
  }

  onProgress?.('parsing', 'Compiling requirements and source references…');
  const prefix = `REQ-${documentId.slice(0, 6).toUpperCase()}`;
  const drafts = compileRequirements(extracted, { codePrefix: prefix });
  if (!drafts.length) {
    await client
      .from('requirement_documents')
      .update({
        status: 'parsed',
        extracted_text: extracted.text,
        page_count: extracted.pageCount,
      })
      .eq('id', documentId);
    return { document: mapDocument({ ...inserted, extracted_text: extracted.text, page_count: extracted.pageCount, status: 'parsed' }), requirements: [] };
  }

  onProgress?.('saving', `Saving ${drafts.length} requirements…`);
  const requirementRows = drafts.map((draft) => ({
    project_id: projectId,
    document_id: documentId,
    requirement_code: draft.requirementCode,
    original_text: draft.originalText,
    normalized_text: draft.normalizedText,
    kind: draft.kind,
    source_page: draft.sourcePage,
    source_paragraph: draft.sourceParagraph,
    source_char_start: draft.sourceCharStart,
    source_char_end: draft.sourceCharEnd,
    metadata: draft.metadata,
  }));

  const { data: requirementData, error: requirementError } = await client
    .from('requirements')
    .insert(requirementRows)
    .select('*');
  if (requirementError) {
    await client
      .from('requirement_documents')
      .update({ status: 'failed', error_message: requirementError.message })
      .eq('id', documentId);
    throw new Error(requirementError.message);
  }

  const { data: documentData, error: documentError } = await client
    .from('requirement_documents')
    .update({
      status: 'parsed',
      extracted_text: extracted.text,
      page_count: extracted.pageCount,
    })
    .eq('id', documentId)
    .select('*')
    .single();
  if (documentError) throw new Error(documentError.message);

  return {
    document: mapDocument(documentData),
    requirements: (requirementData || []).map((row) => mapRequirement(row as RequirementRow)),
  };
}

export async function deleteRequirementDocument(document: RequirementDocument): Promise<void> {
  const client = requireClient();
  const { error: storageError } = await client.storage.from(BUCKET).remove([document.storagePath]);
  if (storageError && !/not found/i.test(storageError.message)) throw new Error(storageError.message);
  const { error } = await client.from('requirement_documents').delete().eq('id', document.id);
  if (error) throw new Error(error.message);
}
