import Image from 'next/image';
import { Heart, MessageCircle } from 'lucide-react';

async function getTrendingData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const [hashtagsRes, postsRes, peopleRes] = await Promise.all([
      fetch(`${baseUrl}/api/discover/hashtags`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/discover/posts`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/discover/people`, {
        cache: 'no-store',
        headers: {
          Cookie: '', // Will be populated by middleware
        },
      }),
    ]);

    const hashtags = hashtagsRes.ok ? await hashtagsRes.json() : { data: [] };
    const posts = postsRes.ok ? await postsRes.json() : { data: [] };
    const people = peopleRes.ok ? await peopleRes.json() : { data: [] };

    return {
      hashtags: hashtags.data || [],
      posts: posts.data || [],
      people: people.data || [],
    };
  } catch (error) {
    console.error('Error fetching trending data:', error);
    return {
      hashtags: [],
      posts: [],
      people: [],
    };
  }
}

export default async function ExplorePage() {
  const { hashtags, posts, people } = await getTrendingData();

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid gap-6 md:grid-cols-12">
        {/* Main Content */}
        <section className="md:col-span-8 space-y-4">
          <h1 className="text-2xl font-bold text-white">Discover</h1>

          {/* Trending Posts */}
          <div className="space-y-4">
            {posts.length > 0 ? (
              posts.map((post: any) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-3">
                    <Image
                      src={post.author?.avatar_url || `https://i.pravatar.cc/64?u=${post.user_id}`}
                      alt={post.author?.name || 'Player'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-white">
                        {post.author?.name || 'Player'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
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

                  <div className="p-4">
                    <p className="text-slate-200">{post.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-slate-400 text-sm">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {post.comments_count || 0}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400">
                No trending posts at the moment
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="md:col-span-4 space-y-4">
          {/* Trending Hashtags */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4">
            <h3 className="font-semibold text-white mb-3">Trending</h3>
            <div className="flex flex-wrap gap-2">
              {hashtags.slice(0, 10).map((hashtag: any) => (
                <span
                  key={hashtag.tag}
                  className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-200 text-sm hover:bg-slate-700 cursor-pointer"
                >
                  #{hashtag.tag}
                </span>
              ))}
            </div>
          </div>

          {/* People to Play With */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4">
            <h3 className="font-semibold text-white mb-3">Who to play with?</h3>
            <div className="space-y-3">
              {people.slice(0, 5).map((person: any) => (
                <div key={person.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image
                      src={person.avatar_url || `https://i.pravatar.cc/36?u=${person.id}`}
                      alt={person.name}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <div>
                      <div className="font-medium text-white text-sm">{person.name}</div>
                      <div className="text-xs text-slate-400">
                        {person.level ? `N${person.level}` : ''} · {person.city || '—'}
                      </div>
                    </div>
                  </div>
                  <form action="/api/follow" method="post">
                    <input type="hidden" name="following" value={person.id} />
                    <button className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700">
                      Follow
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
