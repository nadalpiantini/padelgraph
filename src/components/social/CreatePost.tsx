'use client';

import { useState } from 'react';
import { Image as ImageIcon, X, Globe, Users, Lock, User } from 'lucide-react';
import Image from 'next/image';

interface CreatePostProps {
  user: {
    id: string;
    name?: string | null;
    username: string;
    avatar_url?: string | null;
  };
  onPostCreated?: () => void;
}

type Visibility = 'public' | 'friends' | 'private';

export default function CreatePost({ user, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && mediaUrls.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          media_urls: mediaUrls,
          visibility,
        }),
      });

      if (response.ok) {
        setContent('');
        setMediaUrls([]);
        setVisibility('public');
        onPostCreated?.();
      } else {
        const error = await response.json();
        console.error('Error creating post:', error);
        alert('Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const visibilityOptions = [
    { value: 'public' as const, icon: Globe, label: 'Public', description: 'Anyone can see' },
    { value: 'friends' as const, icon: Users, label: 'Friends', description: 'Only friends' },
    { value: 'private' as const, icon: Lock, label: 'Private', description: 'Only you' },
  ];

  const selectedVisibility = visibilityOptions.find(opt => opt.value === visibility)!;
  const VisibilityIcon = selectedVisibility.icon;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
      <form onSubmit={handleSubmit}>
        {/* Header with Avatar */}
        <div className="flex items-start gap-3 mb-3">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name || user.username}
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
          )}

          {/* Text Input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${user.name || user.username}?`}
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors min-h-[100px]"
            disabled={isSubmitting}
          />
        </div>

        {/* Media Preview */}
        {mediaUrls.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {mediaUrls.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                <Image
                  src={url}
                  alt={`Upload ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            {/* Image Upload Button */}
            <button
              type="button"
              className="p-2 text-slate-400 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Add photos"
              disabled={isSubmitting}
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Visibility Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <VisibilityIcon className="w-4 h-4" />
                <span>{selectedVisibility.label}</span>
              </button>

              {showVisibilityMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowVisibilityMenu(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-20 min-w-[200px]">
                    {visibilityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setVisibility(option.value);
                          setShowVisibilityMenu(false);
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors ${
                          visibility === option.value ? 'bg-slate-700/30' : ''
                        }`}
                      >
                        <option.icon className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div className="flex-1 text-left">
                          <div className="text-white font-medium">{option.label}</div>
                          <div className="text-xs text-slate-400">{option.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && mediaUrls.length === 0)}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
