'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/app-store';
import { socialAPI } from '@/lib/api/social-api';
import { SmartMedia } from '@/components/media/SmartMedia';
import {
  Heart,
  MessageCircle,
  Share2,
  BadgeCheck,
  Search,
  Upload,
  Users2,
  MapPin,
  Bell,
  Home,
  Compass,
  Trophy,
  Building2,
  Mail,
} from 'lucide-react';

const supabase = createClient();

// ===== Stories Bar =====
function StoriesBar() {
  const [stories, setStories] = useState<any[]>([]);

  useEffect(() => {
    socialAPI.stories.list().then(({ data }) => {
      if (data) {
        const storiesData = (data as any).stories_by_user || data;
        setStories(Array.isArray(storiesData) ? storiesData : []);
      }
    });
  }, []);

  return (
    <div className="rounded-2xl border shadow p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Stories</h3>
        <button className="px-3 py-2 rounded-full border text-sm">Add Story</button>
      </div>
      <div className="flex items-center gap-4 overflow-x-auto">
        {stories.map((userStories: any) => (
          <div key={userStories.user.id} className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-indigo-500 to-purple-500">
              <img
                src={userStories.user.avatar_url || `https://i.pravatar.cc/120?u=${userStories.user.id}`}
                className="w-full h-full rounded-full object-cover border-2 border-white"
                alt={userStories.user.name}
              />
            </div>
            <span className="text-xs text-slate-600 line-clamp-1 max-w-[64px]">
              {userStories.user.name || userStories.user.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Composer =====
function Composer({ onPostCreated }: { onPostCreated: () => void }) {
  const { userId } = useAppStore();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePost = async () => {
    if (!content && !file) return;

    setUploading(true);
    try {
      let mediaUrl: string | undefined;

      // Upload media if present
      if (file) {
        const { data: signData } = await socialAPI.media.sign(
          file.name,
          file.type,
          file.size
        );

        if (signData) {
          // Upload to signed URL
          const uploadResponse = await fetch(signData.signed_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });

          if (uploadResponse.ok) {
            mediaUrl = signData.public_url;
          }
        }
      }

      // Create post
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          media_urls: mediaUrl ? [mediaUrl] : [],
          visibility: 'public',
        }),
      });

      if (response.ok) {
        setContent('');
        setFile(null);
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border shadow p-4 bg-white">
      <div className="flex items-start gap-3">
        <img
          src={`https://i.pravatar.cc/64?u=${userId || 'default'}`}
          className="w-10 h-10 rounded-full"
          alt="Your avatar"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your highlight or invite someone to play…"
            className="w-full resize-none outline-none placeholder:text-slate-400 min-h-[60px]"
          />
          {file && (
            <div className="mt-2 text-sm text-slate-600">
              📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-500">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full border cursor-pointer hover:bg-slate-50">
                <Upload className="w-4 h-4" /> Media
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept="image/*,video/*"
                />
              </label>
              <button className="px-3 py-2 rounded-full border hover:bg-slate-50">
                <MapPin className="w-4 h-4 mr-1 inline" />
                Club
              </button>
              <button className="px-3 py-2 rounded-full border hover:bg-slate-50">
                <Users2 className="w-4 h-4 mr-1 inline" />
                Invite
              </button>
            </div>
            <button
              onClick={handlePost}
              disabled={uploading || (!content && !file)}
              className="px-4 py-2 rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
            >
              {uploading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Post Card =====
function PostCard({ post, onChanged }: { post: any; onChanged: () => void }) {
  const [liking, setLiking] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleLike = async () => {
    setLiking(true);
    await socialAPI.feed.like(post.id);
    setLiking(false);
    onChanged();
  };

  const handleShare = async () => {
    setSharing(true);
    await socialAPI.feed.share(post.id);
    setSharing(false);
    onChanged();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border shadow overflow-hidden bg-white"
    >
      <div className="p-4 flex items-start gap-3">
        <img
          src={post.author?.avatar_url || `https://i.pravatar.cc/100?u=${post.user_id}`}
          className="w-10 h-10 rounded-full"
          alt={post.author?.name}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{post.author?.name || 'Player'}</span>
            {post.author?.verified && <BadgeCheck className="w-4 h-4 text-indigo-600" />}
            <span className="text-slate-500 text-sm">
              @{post.author?.username} · {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="text-slate-800 mt-1 whitespace-pre-wrap">{post.content}</div>
        </div>
      </div>

      {Array.isArray(post.media_urls) && post.media_urls.length > 0 && (
        <SmartMedia src={post.media_urls[0]} className="w-full" />
      )}

      <div className="p-4 flex items-center gap-4 text-slate-600">
        <button
          disabled={liking}
          onClick={handleLike}
          className="flex items-center gap-2 hover:text-red-500 transition-colors"
        >
          <Heart className={`w-5 h-5 ${post.has_liked ? 'fill-current text-red-500' : ''}`} />
          {post.likes_count || 0}
        </button>
        <button className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
          <MessageCircle className="w-5 h-5" />
          {post.comments_count || 0}
        </button>
        <button
          disabled={sharing}
          onClick={handleShare}
          className="flex items-center gap-2 hover:text-green-600 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>
    </motion.div>
  );
}

// ===== Main Component =====
export function SocialFeedEnterprise() {
  const { userId, setUserId } = useAppStore();
  const [feed, setFeed] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize user session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [setUserId]);

  // Load feed
  const loadFeed = useCallback(async () => {
    setLoading(true);
    const { data } = await socialAPI.feed.list();
    if (data && Array.isArray(data)) setFeed(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Real-time notifications
  useEffect(() => {
    if (!userId) return;

    // Load initial notifications
    socialAPI.notifications.list().then(({ data }) => {
      if (data && Array.isArray(data)) setNotifications(data);
    });

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
          <strong className="text-xl">PadelGraph</strong>

          <div className="ml-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              placeholder="Search players, clubs, tournaments…"
              className="bg-transparent outline-none w-full"
            />
          </div>

          <button className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700">
            Create Tournament
          </button>

          <div className="relative ml-2">
            <Bell className="w-5 h-5 text-slate-600" />
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 px-4 py-6">
        {/* Left Nav */}
        <aside className="hidden md:block md:col-span-2 space-y-2">
          {[
            { label: 'Home', icon: Home },
            { label: 'Discover', icon: Compass },
            { label: 'Tournaments', icon: Trophy },
            { label: 'Clubs', icon: Building2 },
            { label: 'Messages', icon: Mail },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white text-left"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Center Feed */}
        <section className="md:col-span-7 space-y-5">
          <StoriesBar />
          <Composer onPostCreated={loadFeed} />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            feed.map((post) => <PostCard key={post.id} post={post} onChanged={loadFeed} />)
          )}
        </section>

        {/* Right Rail */}
        <aside className="md:col-span-3 space-y-4">
          <div className="rounded-2xl border shadow p-4 bg-white">
            <h3 className="font-semibold mb-2">Trending</h3>
            <div className="flex flex-wrap gap-2">
              {['#SantoDomingo', '#N3', '#Americano', '#Pozos', '#Mixto'].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border shadow p-4 bg-white">
            <h3 className="font-semibold mb-2">Who to play with?</h3>
            <div className="space-y-3">
              {['Ana · N3', 'Bruno · N4', 'Carla · N3'].map((player) => (
                <div key={player} className="flex items-center justify-between">
                  <span className="text-slate-700">{player}</span>
                  <button className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700">
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
