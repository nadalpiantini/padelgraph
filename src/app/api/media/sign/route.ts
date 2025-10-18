/**
 * Media Upload Signed URL API endpoint
 * POST /api/media/sign - Get signed URL for uploading media to Supabase Storage
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const signMediaSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1),
  file_size: z.number().min(1).max(52428800), // 50MB max
});

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = signMediaSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { filename, content_type, file_size } = validation.data;

    // Validate content type
    if (!ALLOWED_TYPES.includes(content_type)) {
      return errorResponse(
        'Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP, HEIC) and videos (MP4, MPEG, QuickTime, WebM)',
        undefined,
        400
      );
    }

    // Validate file size based on type
    const isVideo = ALLOWED_VIDEO_TYPES.includes(content_type);
    const maxSize = isVideo ? 52428800 : 5242880; // 50MB for videos, 5MB for images

    if (file_size > maxSize) {
      return errorResponse(
        `File too large. Max size: ${isVideo ? '50MB' : '5MB'}`,
        undefined,
        400
      );
    }

    // Generate unique file path: {user_id}/{timestamp}_{uuid}.{ext}
    const fileExtension = filename.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().replace(/-/g, '');
    const filePath = `${user.id}/${timestamp}_${randomId}.${fileExtension}`;

    // Create signed URL for upload (valid for 5 minutes)
    const { data: signedData, error: signError } = await supabase.storage
      .from('media')
      .createSignedUploadUrl(filePath);

    if (signError || !signedData) {
      console.error('[Media Sign API] Error creating signed URL:', signError);
      return serverErrorResponse('Failed to create upload URL', signError);
    }

    // Get public URL (for reading after upload)
    const { data: publicData } = supabase.storage.from('media').getPublicUrl(filePath);

    return successResponse(
      {
        signed_url: signedData.signedUrl,
        path: filePath,
        token: signedData.token,
        public_url: publicData.publicUrl,
        expires_in: 300, // 5 minutes
      },
      'Signed URL created successfully',
      201
    );
  } catch (error) {
    console.error('[Media Sign API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
