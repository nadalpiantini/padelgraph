'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  MapPin,
  User,
  Users,
  Radar,
  MessageCircle,
  Download,
  History,
  Info,
  Check,
} from 'lucide-react';
import type {
  PrivacySettings,
  VisibilityLevel,
  PrivacyPreview,
  PrivacyAuditLog,
} from '@/lib/privacy/types';

interface PrivacyDashboardProps {
  userId: string;
  t: {
    title: string;
    subtitle: string;
    loading: string;
    save: string;
    saved: string;
    locationVisibility: string;
    profileVisibility: string;
    graphVisibility: string;
    autoMatch: string;
    showInDiscovery: string;
    visibilityLevels: {
      public: string;
      friends: string;
      clubs_only: string;
      private: string;
    };
    preview: {
      title: string;
      description: string;
      visible: string;
      hidden: string;
    };
    auditLog: {
      title: string;
      noLogs: string;
      viewAll: string;
    };
    dataDownload: {
      title: string;
      description: string;
      download: string;
    };
  };
}

export default function PrivacyDashboard({ userId, t }: PrivacyDashboardProps) {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [preview, setPreview] = useState<PrivacyPreview | null>(null);
  const [auditLogs, setAuditLogs] = useState<PrivacyAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAuditLogs();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/privacy-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        loadPreview(data);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreview = async (currentSettings: PrivacySettings) => {
    try {
      const response = await fetch('/api/privacy-settings/preview');
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await fetch('/api/privacy-settings/audit?limit=5');
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_visibility: settings.location_visibility,
          profile_visibility: settings.profile_visibility,
          graph_visibility: settings.graph_visibility,
          auto_match_enabled: settings.auto_match_enabled,
          show_in_discovery: settings.show_in_discovery,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        loadAuditLogs();
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      const response = await fetch('/api/privacy-settings/data-export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `privacy-data-${userId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading data:', error);
    }
  };

  const visibilityLevels: VisibilityLevel[] = ['public', 'friends', 'clubs_only', 'private'];

  const VisibilityToggle = ({
    label,
    value,
    icon: Icon,
    onChange,
  }: {
    label: string;
    value: VisibilityLevel;
    icon: React.ElementType;
    onChange: (value: VisibilityLevel) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-300">
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {visibilityLevels.map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
              value === level
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {t.visibilityLevels[level]}
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading || !settings) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-slate-800 border border-slate-700 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold text-white">{t.title}</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-slate-400">{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-indigo-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">{t.title}</h2>
          <p className="text-sm text-slate-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Main Settings */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
        <VisibilityToggle
          label={t.locationVisibility}
          value={settings.location_visibility}
          icon={MapPin}
          onChange={(value) =>
            setSettings({ ...settings, location_visibility: value })
          }
        />

        <VisibilityToggle
          label={t.profileVisibility}
          value={settings.profile_visibility}
          icon={User}
          onChange={(value) =>
            setSettings({ ...settings, profile_visibility: value })
          }
        />

        <VisibilityToggle
          label={t.graphVisibility}
          value={settings.graph_visibility}
          icon={Users}
          onChange={(value) =>
            setSettings({ ...settings, graph_visibility: value })
          }
        />

        {/* Boolean Toggles */}
        <div className="pt-4 border-t border-slate-700 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-slate-400" />
              <span className="text-slate-300">{t.autoMatch}</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.auto_match_enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_match_enabled: e.target.checked,
                  })
                }
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors ${
                  settings.auto_match_enabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.auto_match_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-slate-400" />
              <span className="text-slate-300">{t.showInDiscovery}</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.show_in_discovery}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    show_in_discovery: e.target.checked,
                  })
                }
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors ${
                  settings.show_in_discovery ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.show_in_discovery ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </label>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            isSaved
              ? 'bg-green-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5" />
              {t.saved}
            </>
          ) : (
            <>{isSaving ? t.loading : t.save}</>
          )}
        </button>
      </div>

      {/* Preview */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-indigo-400" />
            <div className="text-left">
              <h3 className="font-semibold text-white">{t.preview.title}</h3>
              <p className="text-sm text-slate-400">{t.preview.description}</p>
            </div>
          </div>
          {showPreview ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
        </button>

        {showPreview && preview && (
          <div className="p-6 pt-0 space-y-3">
            <PreviewItem label={t.profileVisibility} visible={preview.profile_visible} />
            <PreviewItem label={t.locationVisibility} visible={preview.location_visible} />
            <PreviewItem label={t.graphVisibility} visible={preview.graph_visible} />
            <PreviewItem label={t.showInDiscovery} visible={preview.discovery_visible} />
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">{t.auditLog.title}</h3>
          </div>
          <span className="text-sm text-slate-400">{auditLogs.length} recent</span>
        </button>

        {showAudit && (
          <div className="p-6 pt-0">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">{t.auditLog.noLogs}</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-900 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{log.action}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Download */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <Download className="w-5 h-5 text-indigo-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white mb-1">{t.dataDownload.title}</h3>
            <p className="text-sm text-slate-400">{t.dataDownload.description}</p>
          </div>
        </div>
        <button
          onClick={handleDownloadData}
          className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {t.dataDownload.download}
        </button>
      </div>
    </div>
  );
}

function PreviewItem({ label, visible }: { label: string; visible: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
      <span className="text-sm text-slate-300">{label}</span>
      <div className={`flex items-center gap-1 text-sm ${visible ? 'text-green-400' : 'text-slate-500'}`}>
        {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        <span>{visible ? 'Visible' : 'Hidden'}</span>
      </div>
    </div>
  );
}
