'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { socialAPI } from '@/lib/api/social-api';

const supabase = createClient();

export function FollowButton({ userId }: { userId: string }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Check if following
  useEffect(() => {
    if (!currentUserId) return;

    supabase
      .from('follow')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', userId)
      .single()
      .then(({ data }) => {
        setIsFollowing(!!data);
      });
  }, [currentUserId, userId]);

  const handleToggleFollow = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await socialAPI.follow.unfollow(userId);
        setIsFollowing(false);
      } else {
        await socialAPI.follow.follow(userId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`px-6 py-2 rounded-full font-medium transition-colors ${
        isFollowing
          ? 'bg-slate-700 text-white hover:bg-slate-600'
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
