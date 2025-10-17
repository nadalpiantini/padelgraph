# Supabase Storage Configuration

## 📦 Bucket Setup

### 1. Create Bucket in Supabase Dashboard

1. Go to: https://app.supabase.com/project/[your-project-id]/storage/buckets
2. Click "New Bucket"
3. Settings:
   - **Name**: `post-media`
   - **Public**: ✅ Yes (for public URLs)
   - **File size limit**: 10 MB
   - **Allowed MIME types**:
     - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
     - Videos: `video/mp4`, `video/webm`, `video/quicktime`

### 2. Configure Storage Policies

Run these SQL policies in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'post-media');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Test Storage Setup

```bash
# From project root
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test post with image",
    "media_urls": ["https://[project].supabase.co/storage/v1/object/public/post-media/test.jpg"]
  }'
```

## 🔧 Usage in Code

### Upload Flow (Client-side)

```typescript
import { getUploadSignedUrl, getPublicUrl } from '@/lib/storage';

// 1. Get signed upload URL
const { uploadUrl, filePath } = await getUploadSignedUrl('photo.jpg');

// 2. Upload file directly to Supabase Storage
const response = await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
});

// 3. Get public URL
const publicUrl = await getPublicUrl(filePath);

// 4. Create post with media URL
await fetch('/api/posts', {
  method: 'POST',
  body: JSON.stringify({
    content: 'Check out this photo!',
    media_urls: [publicUrl],
  }),
});
```

### Helper Functions Available

- `getUploadSignedUrl(fileName)` - Get signed URL for direct upload
- `getPublicUrl(filePath)` - Get public URL for uploaded file
- `deleteFile(filePath)` - Delete file from storage
- `getSignedUrls(filePaths[])` - Get signed URLs for multiple files
- `isValidFileType(mimeType)` - Validate file type

## 📋 File Restrictions

- **Max file size**: 10 MB
- **Allowed images**: JPEG, PNG, GIF, WebP
- **Allowed videos**: MP4, WebM, QuickTime
- **Max media per post**: 10 files

## 🔒 Security

- Files are organized by user ID: `{user_id}/{timestamp}-{filename}`
- Users can only delete their own files
- All uploads require authentication
- File type validation on client and server

## ✅ Verification Checklist

- [ ] Bucket `post-media` created and public
- [ ] Storage policies applied (insert, select, delete)
- [ ] File size limit set to 10MB
- [ ] MIME types configured
- [ ] Test upload successful

## 🚀 Next Steps

Storage is now configured! The feed APIs (`/api/posts`, `/api/feed`) are ready to handle media URLs.

For actual file upload endpoint (optional):
- Create `/api/upload` endpoint using `getUploadSignedUrl()`
- Or use Supabase client directly from frontend for uploads
