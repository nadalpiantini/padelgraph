'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import PostCard from './PostCard';
import CreatePost from './CreatePost';
import type { Post } from '@/lib/types/post';
import { Activity } from 'lucide-react';

interface SocialFeedProps {
  currentUser: {
    id: string;
    name?: string | null;
    username: string;
    avatar_url?: string | null;
  };
  initialPosts?: Post[];
  showCreatePost?: boolean;
}

export default function SocialFeed({
  currentUser,
  initialPosts = [],
  showCreatePost = true,
}: SocialFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Load initial feed on mount
  useEffect(() => {
    if (initialPosts.length === 0) {
      loadFeed(true);
    }
  }, []);

  // Load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !isLoading && posts.length > 0) {
      loadFeed(false);
    }
  }, [inView, hasMore, isLoading, posts.length]);

  const loadFeed = async (reset = false) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        limit: '10',
        ...(cursor && !reset && { cursor }),
      });

      const response = await fetch(`/api/feed?${params}`);

      if (response.ok) {
        const data = await response.json();

        const newPosts = Array.isArray(data.posts) ? data.posts : [];
        setPosts((prev) => reset ? newPosts : [...prev, ...newPosts]);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      } else {
        console.error('Error loading feed:', await response.text());
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostCreated = useCallback(() => {
    // Reload feed from start
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    loadFeed(true);
  }, []);

  const handleLike = useCallback((postId: string) => {
    // Optimistic update handled in PostCard
    console.log('Post liked:', postId);
  }, []);

  const handleComment = useCallback((postId: string) => {
    // TODO: Open comment modal or navigate to post detail
    console.log('Comment on post:', postId);
  }, []);

  const handleShare = useCallback((postId: string) => {
    // TODO: Open share modal
    console.log('Share post:', postId);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Create Post */}
      {showCreatePost && (
        <CreatePost user={currentUser} onPostCreated={handlePostCreated} />
      )}

      {/* Loading State (Initial) */}
      {isLoading && posts.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading your feed...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && posts.length === 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-12 text-center">
          <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No posts yet
          </h3>
          <p className="text-slate-400 mb-6">
            Be the first to share something with the community!
          </p>
        </div>
      )}

      {/* Posts Feed */}
      {posts.length > 0 && (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
              />
            ))}
          </div>

          {/* Load More Indicator */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Loading more posts...</p>
            </div>
          )}

          {/* End of Feed */}
          {!hasMore && posts.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-slate-500 text-sm">
                You&apos;re all caught up! 🎉
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
