'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Camera, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  username: string;
  onUploadSuccess?: () => void;
}

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  username,
  onUploadSuccess,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen debe ser menor a 2MB');
        return;
      }

      // Create a preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-images').getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Success - refresh the page or call callback
      if (onUploadSuccess) {
        onUploadSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
      setPreviewUrl(currentAvatarUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      {/* Avatar Display */}
      <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-[150px] md:h-[150px]">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={username}
            width={150}
            height={150}
            className="w-full h-full rounded-2xl object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <span className="text-4xl sm:text-5xl md:text-6xl font-bold">
              {username[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}

        {/* Upload Overlay */}
        <button
          onClick={handleClick}
          disabled={uploading}
          className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <span className="text-sm text-white">Subiendo...</span>
            </>
          ) : (
            <>
              <Camera className="w-8 h-8 text-white" />
              <span className="text-sm text-white">Cambiar foto</span>
            </>
          )}
        </button>

        {/* Upload Button (mobile) */}
        <button
          onClick={handleClick}
          disabled={uploading}
          className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-0 p-2 sm:p-3 bg-indigo-600 hover:bg-indigo-500 rounded-full sm:rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed md:hidden"
          aria-label="Subir foto"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Help Text */}
      <p className="text-xs text-slate-400 mt-2 text-center max-w-[150px]">
        Máx. 2MB • JPG, PNG, GIF
      </p>
    </div>
  );
}
