'use client';

// Sprint 5: Achievements Gallery Component (MVP)
// Displays achievements grid with locked/unlocked states

import { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  category: string;
  xp_points: number;
  badge_icon: string | null;
  badge_color: string | null;
  progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  requirement_value: number;
}

export function AchievementsGallery() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch('/api/achievements');
        const data = await res.json();
        setAchievements(data.achievements || []);
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const categories = ['all', 'participation', 'victory', 'tournament', 'social', 'travel', 'consistency', 'skill', 'community'];
  const filteredAchievements =
    filter === 'all'
      ? achievements
      : achievements.filter((a) => a.category === filter);

  const unlockedCount = achievements.filter((a) => a.is_unlocked).length;
  const totalXP = achievements
    .filter((a) => a.is_unlocked)
    .reduce((sum, a) => sum + a.xp_points, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Achievements</h2>
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold">{unlockedCount}</p>
            <p className="text-sm opacity-90">Unlocked</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{totalXP}</p>
            <p className="text-sm opacity-90">Total XP</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No achievements in this category</p>
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const isLocked = !achievement.is_unlocked;
  const progressPercent = (achievement.progress / achievement.requirement_value) * 100;

  return (
    <div
      className={`p-6 rounded-lg border-2 transition-all ${
        isLocked
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : 'bg-white border-blue-200 shadow-md hover:shadow-lg'
      }`}
    >
      {/* Badge Icon */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`text-4xl ${isLocked ? 'grayscale' : ''}`}
          style={{ filter: isLocked ? 'grayscale(100%)' : 'none' }}
        >
          {achievement.badge_icon || '🏆'}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{achievement.name}</h3>
          <p className="text-sm text-gray-600">{achievement.description}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {!achievement.is_unlocked && achievement.progress > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>
              {achievement.progress} / {achievement.requirement_value}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 uppercase">{achievement.category}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold">{achievement.xp_points}</span>
          <span className="text-xs text-gray-500">XP</span>
        </div>
      </div>

      {/* Unlocked Date */}
      {achievement.is_unlocked && achievement.unlocked_at && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Unlocked: {new Date(achievement.unlocked_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
