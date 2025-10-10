import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads files to the submission-documents bucket with secure random naming
 * Uses UUIDs instead of predictable user_id paths to prevent enumeration attacks
 * @param files - Array of files to upload
 * @returns Array of file paths in storage
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    // Use crypto.randomUUID for secure random filenames instead of predictable user_id paths
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('submission-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    
    uploadedUrls.push(fileName);
  }
  
  return uploadedUrls;
}

/**
 * Generates a signed URL for secure file access with time-limited expiration
 * @param filePath - Path to the file in storage
 * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL for file access
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 900): Promise<string> {
  const { data, error } = await supabase.storage
    .from('submission-documents')
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Generates signed URLs for multiple files
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
 * @returns Array of signed URLs
 */
export async function getSignedUrls(filePaths: string[], expiresIn: number = 900): Promise<string[]> {
  const signedUrls = await Promise.all(
    filePaths.map(path => getSignedUrl(path, expiresIn))
  );
  return signedUrls;
}
