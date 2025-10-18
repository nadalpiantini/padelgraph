'use client';

import { useState } from 'react';
import { CommentThread } from '@/components/comments/CommentThread';
import { MediaCarousel } from '@/components/social/MediaCarousel';
import { Heart, MessageCircle, Share2, MoreHorizontal, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '@/lib/types/post';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

export default function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.has_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showAllContent, setShowAllContent] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    try {
      const response = await fetch('/api/feed/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
        onLike?.(post.id);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const contentPreview = post.content.length > 300 && !showAllContent
    ? post.content.substring(0, 300) + '...'
    : post.content;

  const shouldShowReadMore = post.content.length > 300;

  return (
    <article className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-colors">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar */}
          <Link href={`/players/${post.author?.username || post.user_id}`}>
            {post.author?.avatar_url ? (
              <Image
                src={post.author.avatar_url}
                alt={post.author.name || post.author.username}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
          </Link>

          {/* Author Info */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/players/${post.author?.username || post.user_id}`}
              className="font-semibold text-white hover:text-indigo-400 transition-colors"
            >
              {post.author?.name || post.author?.username || 'Unknown User'}
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{formatTimeAgo(post.created_at)}</span>
              {post.author?.level && (
                <>
                  <span>•</span>
                  <span className="text-indigo-400">{post.author.level}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu Button */}
        <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
          <MoreHorizontal className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-slate-200 whitespace-pre-wrap break-words">
          {contentPreview}
        </p>
        {shouldShowReadMore && (
          <button
            onClick={() => setShowAllContent(!showAllContent)}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-1"
          >
            {showAllContent ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <MediaCarousel
          mediaUrls={post.media_urls}
          alt={`Post by ${post.author?.name || post.author?.username}`}
        />
      )}

      {/* Engagement Stats */}
      <div className="px-4 py-3 flex items-center justify-between text-sm text-slate-400 border-t border-slate-700/50">
        <button className="hover:text-slate-300 transition-colors">
          {likesCount} {likesCount === 1 ? 'like' : 'likes'}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onComment?.(post.id)}
            className="hover:text-slate-300 transition-colors"
          >
            {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-1 border-t border-slate-700/50">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors ${
            isLiked
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span className="font-medium">Like</span>
        </button>

        <button
          onClick={() => {
            setShowComments(!showComments);
            onComment?.(post.id);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-slate-400 hover:bg-slate-700/50 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Comment</span>
        </button>

        <button
          onClick={() => onShare?.(post.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-slate-400 hover:bg-slate-700/50 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-medium">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="mt-4">
            <CommentThread postId={post.id} />
          </div>
        </div>
      )}
    </article>
  );
}
