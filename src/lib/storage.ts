import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads files to the submission-documents bucket with secure random naming.
 * Uses Promise.allSettled so partial failures don't lose already-uploaded paths.
 * @param files - Array of files to upload
 * @returns Array of successfully uploaded file paths in storage
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  if (!supabase) {
    throw new Error('[STORAGE] Supabase client is not initialised — check env vars');
  }

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('submission-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      return fileName;
    })
  );

  const uploadedPaths: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      uploadedPaths.push(result.value);
    } else {
      console.error('[STORAGE] File upload failed:', result.reason);
    }
  }

  if (uploadedPaths.length === 0 && files.length > 0) {
    throw new Error('[STORAGE] All file uploads failed');
  }

  return uploadedPaths;
}

/**
 * Generates a signed URL for secure file access with time-limited expiration
 * @param filePath - Path to the file in storage
 * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL for file access
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 900): Promise<string> {
  if (!supabase) {
    throw new Error('[STORAGE] Supabase client is not initialised — check env vars');
  }

  const { data, error } = await supabase.storage
    .from('submission-documents')
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Generates signed URLs for multiple files using Promise.allSettled.
 * Individual failures are logged but do not block other URLs from resolving.
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
 * @returns Array of signed URLs (may be shorter than filePaths if some failed)
 */
export async function getSignedUrls(filePaths: string[], expiresIn: number = 900): Promise<string[]> {
  const results = await Promise.allSettled(
    filePaths.map(path => getSignedUrl(path, expiresIn))
  );

  const signedUrls: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      signedUrls.push(result.value);
    } else {
      console.error('[STORAGE] Failed to get signed URL:', result.reason);
    }
  }
  return signedUrls;
}
