import Image from 'next/image';
import { Heart, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FollowButton } from '@/components/social/FollowButton';

async function getProfileData(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const [userRes, postsRes, statsRes] = await Promise.all([
      fetch(`${baseUrl}/api/users/${id}`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/users/${id}/posts?limit=20`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/users/${id}/follow-stats`, { cache: 'no-store' }),
    ]);

    const user = userRes.ok ? (await userRes.json()).data : null;
    const postsData = postsRes.ok ? await postsRes.json() : { data: { posts: [] } };
    const statsData = statsRes.ok ? await statsRes.json() : { data: { followers: 0, following: 0, posts: 0 } };

    return {
      user,
      posts: postsData.data?.posts || [],
      stats: statsData.data || { followers: 0, following: 0, posts: 0 },
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return {
      user: null,
      posts: [],
      stats: { followers: 0, following: 0, posts: 0 },
    };
  }
}

interface ProfilePageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const { user, posts, stats } = await getProfileData(id);

  if (!user) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <div className="text-center py-12 text-slate-400">
          Profile not found
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <header className="flex items-start gap-6">
        <Image
          src={user.avatar_url || `https://i.pravatar.cc/120?u=${user.id}`}
          alt={user.name}
          width={120}
          height={120}
          className="rounded-full"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{user.name}</h1>
          <p className="text-slate-400 text-lg">@{user.username}</p>
          <p className="text-slate-400 mt-2">
            Level {user.level || 'N3'} · {user.city || '—'}, {user.country || '—'}
          </p>
          {user.bio && <p className="text-slate-200 mt-3">{user.bio}</p>}

          <div className="flex items-center gap-6 mt-4 text-slate-400">
            <span>
              <strong className="text-white">{stats.followers}</strong> followers
            </span>
            <span>
              <strong className="text-white">{stats.following}</strong> following
            </span>
            <span>
              <strong className="text-white">{stats.posts}</strong> posts
            </span>
          </div>

          {!isOwnProfile && (
            <div className="mt-4">
              <FollowButton userId={user.id} />
            </div>
          )}
        </div>
      </header>

      {/* User Posts */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Posts</h2>
        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post: any) => (
              <article
                key={post.id}
                className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden"
              >
                <div className="p-4">
                  <p className="text-slate-200">{post.content}</p>
                </div>
                {post.media_urls && post.media_urls.length > 0 && (
                  <Image
                    src={post.media_urls[0]}
                    alt="Post media"
                    width={1600}
                    height={900}
                    style={{ width: '100%', height: 'auto' }}
                    className="object-cover"
                  />
                )}
                <div className="p-4 flex items-center gap-4 text-slate-400 text-sm">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" /> {post.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> {post.comments_count || 0}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">No posts yet</div>
        )}
      </section>
    </main>
  );
}
