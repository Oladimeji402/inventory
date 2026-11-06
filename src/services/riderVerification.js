import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { validateDocumentFile } from '../lib/riderDocuments';

export const RIDER_DOCUMENT_BUCKET = 'rider-documents';

function requireBackend() {
  if (!isSupabaseConfigured) throw new Error('Rider verification is not available right now.');
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

/** The rider's own verification state: required documents, uploads, review notes. */
export async function fetchMyVerification() {
  requireBackend();
  return rpc('get_my_rider_verification');
}

/**
 * Uploads one document to the private bucket (path: <user id>/<doc type>, replacing any
 * earlier upload) and records it. The server re-checks that the file really exists.
 */
export async function uploadRiderDocument(userId, docType, file) {
  requireBackend();
  const problem = validateDocumentFile(file);
  if (problem) throw new Error(problem);

  const path = `${userId}/${docType}`;
  const { error: uploadError } = await supabase.storage
    .from(RIDER_DOCUMENT_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '0' });
  if (uploadError) throw new Error(uploadError.message);

  return rpc('submit_rider_document', {
    p_doc_type: docType,
    p_file_name: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size
  });
}

export async function submitVerification() {
  requireBackend();
  return rpc('submit_rider_verification');
}
