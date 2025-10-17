'use client';

/**
 * Privacy Dashboard Component
 *
 * Granular privacy settings for location visibility, profile visibility,
 * and auto-matching with real-time preview and audit log.
 */

import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, MapPin, Users, Activity, Save, CheckCircle } from 'lucide-react';

interface PrivacySettings {
  locationVisibility: 'public' | 'friends' | 'clubs_only' | 'private';
  profileVisibility: 'public' | 'friends' | 'clubs_only' | 'private';
  autoMatchEnabled: boolean;
  showInDiscovery: boolean;
  graphVisibility: 'public' | 'friends' | 'private';
}

interface PrivacyDashboardProps {
  userId: string;
  className?: string;
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'friends', label: 'Friends', description: 'Only your friends' },
  { value: 'clubs_only', label: 'Clubs Only', description: 'Only members of your clubs' },
  { value: 'private', label: 'Private', description: 'Only you' },
] as const;

export function PrivacyDashboard({ userId, className = '' }: PrivacyDashboardProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    locationVisibility: 'clubs_only',
    profileVisibility: 'public',
    autoMatchEnabled: true,
    showInDiscovery: true,
    graphVisibility: 'friends',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const response = await fetch('/api/privacy-settings');

        if (!response.ok) {
          throw new Error('Failed to fetch privacy settings');
        }

        const data = await response.json();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError(null);

      const response = await fetch('/api/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save privacy settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <Shield className="h-5 w-5 animate-pulse" />
            <span>Loading privacy settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="bg-emerald-600 px-6 py-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy & Visibility Settings
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Location Visibility */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-gray-900">Location Visibility</h4>
          </div>
          <p className="text-sm text-gray-600">
            Control who can see your location and find you on the map
          </p>

          <div className="grid grid-cols-2 gap-3">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSettings({ ...settings, locationVisibility: option.value })
                }
                className={`p-3 border-2 rounded-lg text-left transition ${
                  settings.locationVisibility === option.value
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* Profile Visibility */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-gray-900">Profile Visibility</h4>
          </div>
          <p className="text-sm text-gray-600">
            Choose who can view your full profile information
          </p>

          <div className="grid grid-cols-2 gap-3">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSettings({ ...settings, profileVisibility: option.value })
                }
                className={`p-3 border-2 rounded-lg text-left transition ${
                  settings.profileVisibility === option.value
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* Graph Visibility */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-gray-900">Connection Graph Visibility</h4>
          </div>
          <p className="text-sm text-gray-600">
            Control who can see your network connections
          </p>

          <div className="grid grid-cols-3 gap-3">
            {VISIBILITY_OPTIONS.slice(0, 3).map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSettings({ ...settings, graphVisibility: option.value as any })
                }
                className={`p-3 border-2 rounded-lg text-center transition ${
                  settings.graphVisibility === option.value
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* Feature Toggles */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            Discovery Features
          </h4>

          {/* Show in Discovery */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Show in Discovery Feed</div>
              <div className="text-sm text-gray-600 mt-1">
                Appear in discovery feed and nearby searches
              </div>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, showInDiscovery: !settings.showInDiscovery })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                settings.showInDiscovery ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.showInDiscovery ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto-Match */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-gray-900">Auto-Match Enabled</div>
              <div className="text-sm text-gray-600 mt-1">
                Automatically connect with compatible players (max 3/week)
              </div>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, autoMatchEnabled: !settings.autoMatchEnabled })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                settings.autoMatchEnabled ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.autoMatchEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-900 mb-3">Privacy Preview</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {settings.locationVisibility === 'private' ? (
                <EyeOff className="h-4 w-4 text-blue-600" />
              ) : (
                <Eye className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-blue-900">
                Your location is visible to:{' '}
                <strong>
                  {VISIBILITY_OPTIONS.find((o) => o.value === settings.locationVisibility)?.label}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {settings.profileVisibility === 'private' ? (
                <EyeOff className="h-4 w-4 text-blue-600" />
              ) : (
                <Eye className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-blue-900">
                Your profile is visible to:{' '}
                <strong>
                  {VISIBILITY_OPTIONS.find((o) => o.value === settings.profileVisibility)?.label}
                </strong>
              </span>
            </div>
            {!settings.showInDiscovery && (
              <div className="flex items-center gap-2 text-sm">
                <EyeOff className="h-4 w-4 text-blue-600" />
                <span className="text-blue-900">
                  You are <strong>hidden</strong> from discovery feeds
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Activity className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="h-5 w-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Privacy Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
