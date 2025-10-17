/**
 * Supabase Storage helpers for media uploads
 */
import { createClient } from '@/lib/supabase/server';

export const STORAGE_BUCKET = 'post-media';

export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file type
 */
export function isValidFileType(mimeType: string): boolean {
  const allAllowedTypes = [...ALLOWED_MIME_TYPES.image, ...ALLOWED_MIME_TYPES.video];
  return allAllowedTypes.includes(mimeType);
}

/**
 * Generate signed URL for file upload
 * @param fileName - Name of the file to upload
 */
export async function getUploadSignedUrl(fileName: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Create unique file path with user ID and timestamp
  const timestamp = Date.now();
  const filePath = `${user.id}/${timestamp}-${fileName}`;

  // Generate signed URL for upload
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(filePath);

  if (error) {
    console.error('[Storage] Error creating signed upload URL:', error);
    throw new Error('Failed to create upload URL');
  }

  return {
    uploadUrl: data.signedUrl,
    filePath: data.path,
    token: data.token,
  };
}

/**
 * Generate public URL for uploaded file
 */
export async function getPublicUrl(filePath: string): Promise<string> {
  const supabase = await createClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Delete file from storage
 */
export async function deleteFile(filePath: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

  if (error) {
    console.error('[Storage] Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Get signed URLs for multiple files
 */
export async function getSignedUrls(
  filePaths: string[],
  expiresIn = 3600
): Promise<Record<string, string>> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(filePaths, expiresIn);

  if (error) {
    console.error('[Storage] Error creating signed URLs:', error);
    throw new Error('Failed to create signed URLs');
  }

  const urlMap: Record<string, string> = {};
  data.forEach((item, index) => {
    if (item.signedUrl) {
      urlMap[filePaths[index]] = item.signedUrl;
    }
  });

  return urlMap;
}
