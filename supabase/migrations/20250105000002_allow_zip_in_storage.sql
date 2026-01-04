-- Update submission-documents bucket to allow ZIP files
UPDATE storage.buckets
SET allowed_mime_types = array_append(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  'application/zip'
)
WHERE id = 'submission-documents';

-- If the bucket doesn't exist yet, this will fail gracefully
-- The bucket should already exist from previous migrations

