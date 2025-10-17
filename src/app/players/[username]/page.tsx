// Sprint 5: Public Player Profile (SSR for SEO)
// /players/[username]

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPlayerStats } from '@/lib/services/analytics';
import { getRecentlyUnlocked } from '@/lib/services/achievements';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('user_profile')
    .select('username, bio, avatar_url')
    .eq('username', username)
    .single();

  if (!profile) {
    return {
      title: 'Player Not Found | PadelGraph',
    };
  }

  return {
    title: `${profile.username} - Player Profile | PadelGraph`,
    description: profile.bio || `View ${profile.username}'s padel stats, achievements, and match history on PadelGraph.`,
    openGraph: {
      title: `${profile.username} on PadelGraph`,
      description: profile.bio || `Padel player profile for ${profile.username}`,
      images: profile.avatar_url ? [profile.avatar_url] : [],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${profile.username} on PadelGraph`,
      description: profile.bio || `Padel player profile`,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch player profile
  const { data: profile, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('username', username)
    .eq('is_public', true)
    .single();

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Player Not Found</h1>
          <p className="text-gray-600">This profile does not exist or is set to private.</p>
        </div>
      </div>
    );
  }

  // Fetch player stats
  const stats = await getPlayerStats(profile.user_id, 'all_time');

  // Fetch achievements
  const achievements = await getRecentlyUnlocked(profile.user_id, 10);

  // Schema.org structured data
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.username,
    description: profile.bio,
    image: profile.avatar_url,
    knowsAbout: ['Padel Tennis'],
    memberOf: {
      '@type': 'Organization',
      name: 'PadelGraph',
    },
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-32 h-32 rounded-full border-4 border-blue-500"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center border-4 border-blue-500">
                  <span className="text-4xl font-bold text-gray-600">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile.username}
              </h1>
              {profile.bio && (
                <p className="text-gray-600 mb-4">{profile.bio}</p>
              )}
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Skill Level: </span>
                  <span className="font-semibold">{profile.skill_level}</span>
                </div>
                <div>
                  <span className="text-gray-500">Play Style: </span>
                  <span className="font-semibold">{profile.play_style}</span>
                </div>
                {profile.city && (
                  <div>
                    <span className="text-gray-500">Location: </span>
                    <span className="font-semibold">{profile.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Level Badge */}
            <div className="flex-shrink-0 text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg p-4">
                <div className="text-3xl font-bold">
                  {profile.level || 1}
                </div>
                <div className="text-xs uppercase">Level</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Career Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard
                label="Total Matches"
                value={stats.total_matches}
                icon="🎾"
              />
              <StatCard
                label="Win Rate"
                value={`${stats.win_rate.toFixed(1)}%`}
                icon="📊"
              />
              <StatCard
                label="ELO Rating"
                value={stats.elo_rating}
                icon="⭐"
              />
              <StatCard
                label="Tournaments Won"
                value={stats.tournaments_won}
                icon="🏆"
              />
            </div>
          </div>
        )}

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Recent Achievements</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {achievements.map((ua) => (
                <div
                  key={ua.id}
                  className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg"
                >
                  <div className="text-4xl mb-2">
                    {ua.achievement?.badge_icon || '🏆'}
                  </div>
                  <div className="text-sm font-semibold">
                    {ua.achievement?.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {ua.achievement?.xp_points} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
