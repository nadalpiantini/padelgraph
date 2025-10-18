/**
 * Image Loader helpers for Supabase Storage
 * Provides signed URLs and transformation endpoints
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Get public image URL with optional transformations
 * For public buckets, uses Supabase's render endpoint
 */
export async function getSignedImageUrl(
  path: string,
  opts?: ImageOptions
): Promise<string> {
  // Build transformation URL
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/media/${encodeURIComponent(path)}`;

  const params = new URLSearchParams();
  if (opts?.width) params.set('width', String(opts.width));
  if (opts?.height) params.set('height', String(opts.height));
  if (opts?.quality) params.set('quality', String(opts.quality));

  return params.toString() ? `${base}?${params.toString()}` : base;
}

/**
 * Get signed URL for private bucket files
 * Valid for specified duration (default 60 seconds)
 */
export async function getPrivateSignedUrl(
  path: string,
  expiresIn = 60
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUrl(path, expiresIn);

  if (error) throw error;

  return data.signedUrl;
}

/**
 * Get public URL for file in media bucket
 */
export function getPublicMediaUrl(path: string): string {
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
