'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  Bell,
  Globe,
  Shield,
  Save,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  location: string | null;
  is_admin?: boolean;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    bio: '',
    location: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    matchReminders: true,
    tournamentUpdates: true,
    socialActivity: false,
    rankings: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showStats: true,
    showLocation: true,
    allowMessages: true,
  });

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth');
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          username: profileData.username || '',
          name: profileData.name || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
        });
      }

      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profile')
        .update({
          username: formData.username,
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Show success toast (you can add a toast library later)
      alert(t('toasts.settingsSaved.message'));
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(t('toasts.saveFailed.message'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <DashboardNavigation user={user} profile={profile} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-slate-400">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-indigo-500" />
              <div>
                <h2 className="text-2xl font-bold">{t('account.title')}</h2>
                <p className="text-sm text-slate-400">{t('account.description')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('account.email')}
                </label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('account.username')}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('account.name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('account.bio')}
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('account.location')}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                <Save className="w-5 h-5" />
                {saving ? t('account.saving') : t('account.saveChanges')}
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold">{t('notifications.title')}</h2>
                <p className="text-sm text-slate-400">{t('notifications.description')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">
                    {t(`notifications.${key as keyof typeof notifications}`)}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setNotifications({ ...notifications, [key]: e.target.checked })
                    }
                    className="w-5 h-5 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-2xl font-bold">{t('preferences.title')}</h2>
                <p className="text-sm text-slate-400">{t('preferences.description')}</p>
              </div>
            </div>

            <div className="text-center py-8 text-slate-400">
              <p>Preferences section coming soon</p>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="text-2xl font-bold">{t('privacy.title')}</h2>
                <p className="text-sm text-slate-400">{t('privacy.description')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{t('privacy.showStats')}</span>
                <input
                  type="checkbox"
                  checked={privacy.showStats}
                  onChange={(e) => setPrivacy({ ...privacy, showStats: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{t('privacy.showLocation')}</span>
                <input
                  type="checkbox"
                  checked={privacy.showLocation}
                  onChange={(e) =>
                    setPrivacy({ ...privacy, showLocation: e.target.checked })
                  }
                  className="w-5 h-5 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{t('privacy.allowMessages')}</span>
                <input
                  type="checkbox"
                  checked={privacy.allowMessages}
                  onChange={(e) =>
                    setPrivacy({ ...privacy, allowMessages: e.target.checked })
                  }
                  className="w-5 h-5 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
