import React, { useState } from 'react';
import {
  Settings,
  User,
  ShieldCheck,
  Save,
  Sliders,
  Trash2,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { StorageService, DEFAULT_QUALITY_SETTINGS } from '../services/storage';
import { AuditService } from '../services/auditService';
import { QualityConfigSettings } from '../types';

interface SettingsPageProps {
  navigate: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ navigate }) => {
  const { user, updateProfile } = useAuth();
  const { showToast, refreshDatasets } = useDataset();

  const [name, setName] = useState(user?.name || '');
  const [organization, setOrganization] = useState(user?.organization || '');

  const [qualitySettings, setQualitySettings] = useState<QualityConfigSettings>(() => {
    return user ? StorageService.getSettings(user.id) : DEFAULT_QUALITY_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateProfile({ name, organization });
    showToast('Profile information updated.', 'success');
  };

  const handleSaveQualitySettings = () => {
    if (!user) return;
    StorageService.saveSettings(user.id, qualitySettings);
    AuditService.log(
      user,
      'SETTINGS_UPDATED',
      'settings',
      `Updated quality thresholds: Completeness ${qualitySettings.completenessThreshold}%, IQR ${qualitySettings.outlierIqrMultiplier}x, Gap ${qualitySettings.maxGapSeconds}s`,
      { severity: 'info' }
    );
    setSavedSuccess(true);
    showToast('Quality thresholds saved. Future evaluations will apply these boundaries.', 'success');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetSettings = () => {
    if (!user) return;
    setQualitySettings(DEFAULT_QUALITY_SETTINGS);
    StorageService.saveSettings(user.id, DEFAULT_QUALITY_SETTINGS);
    AuditService.log(
      user,
      'SETTINGS_UPDATED',
      'settings',
      'Reset quality thresholds to system defaults',
      { severity: 'info' }
    );
    showToast('Quality configuration reset to system defaults.', 'info');
  };

  const handleClearAllUserDatasets = () => {
    if (!user) return;
    if (confirm('Are you sure you want to delete all your private datasets? This action cannot be undone.')) {
      StorageService.saveUserDatasets(user.id, []);
      AuditService.log(
        user,
        'DATASET_DELETED',
        'ingestion',
        'Purged all private datasets from local storage',
        { severity: 'warning' }
      );
      refreshDatasets();
      showToast('All private datasets removed.', 'info');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
          Account & Engine Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
          Manage your analyst profile, quality threshold parameters, and private dataset storage.
        </p>
      </div>

      {/* User Profile Form */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
          <User className="w-4 h-4 text-[#641B32]" />
          Analyst Profile Information
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#29212A] mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#29212A] mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-xl text-[#756772] cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#29212A] mb-1">Organization / Lab</label>
              <input
                type="text"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#29212A] mb-1">Authorization Role</label>
              <input
                type="text"
                disabled
                value={(user?.role || 'analyst').toUpperCase()}
                className="w-full px-3.5 py-2 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-xl text-[#641B32] font-mono font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Profile Updates</span>
            </button>
          </div>
        </form>
      </div>

      {/* Quality Engine Thresholds Configuration */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9A0AE]/30">
          <div>
            <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#641B32]" />
              Data Quality Engine Thresholds
            </h3>
            <p className="text-xs text-[#756772] mt-0.5">
              Tune parameters for the 6-dimension evaluation engine.
            </p>
          </div>

          <button
            onClick={handleResetSettings}
            className="text-xs text-[#756772] hover:text-[#641B32] underline"
          >
            Reset Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#29212A] mb-1">
              Completeness Threshold (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={qualitySettings.completenessThreshold}
              onChange={e =>
                setQualitySettings({
                  ...qualitySettings,
                  completenessThreshold: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] font-mono"
            />
            <span className="text-[10px] text-[#756772] mt-1 block">
              Flag columns with &gt; {100 - qualitySettings.completenessThreshold}% missing cells
            </span>
          </div>

          <div>
            <label className="block font-semibold text-[#29212A] mb-1">
              Outlier Envelope Multiplier (IQR)
            </label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="3.0"
              value={qualitySettings.outlierIqrMultiplier}
              onChange={e =>
                setQualitySettings({
                  ...qualitySettings,
                  outlierIqrMultiplier: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] font-mono"
            />
            <span className="text-[10px] text-[#756772] mt-1 block">
              Standard Tukey boxplot multiplier (1.5x)
            </span>
          </div>

          <div>
            <label className="block font-semibold text-[#29212A] mb-1">
              Expected Time Gap (Seconds)
            </label>
            <input
              type="number"
              step="30"
              min="30"
              max="3600"
              value={qualitySettings.maxGapSeconds}
              onChange={e =>
                setQualitySettings({
                  ...qualitySettings,
                  maxGapSeconds: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] font-mono"
            />
            <span className="text-[10px] text-[#756772] mt-1 block">
              Flags gaps greater than 4x interval ({qualitySettings.maxGapSeconds * 4}s)
            </span>
          </div>
        </div>

        {/* Custom Plausibility Bounds Rules */}
        <div>
          <h4 className="text-xs font-bold text-[#29212A] uppercase tracking-wider mb-2">
            Domain Plausibility Constraint Ranges
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {qualitySettings.customPlausibilityRules.map((r, i) => (
              <div
                key={r.column}
                className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 space-y-1.5"
              >
                <span className="font-bold font-mono text-[#641B32] capitalize block">
                  {r.column}
                </span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span>Min: {r.min ?? '-∞'}</span>
                  <span>•</span>
                  <span>Max: {r.max ?? '+∞'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveQualitySettings}
            className="px-5 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply Quality Settings</span>
          </button>
        </div>
      </div>

      {/* Storage and Danger Zone */}
      <div className="bg-[#FFF8EF] border border-[#B4233D]/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-base text-[#B4233D] flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Data Retention & Storage Management
        </h3>
        <p className="text-xs text-[#756772]">
          All datasets and lineage logs are cryptographically isolated under your user account in browser persistent storage.
        </p>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleClearAllUserDatasets}
            className="px-4 py-2 rounded-xl bg-[#B4233D]/10 text-[#B4233D] font-bold text-xs hover:bg-[#B4233D] hover:text-[#FFF8EF] transition-colors border border-[#B4233D]/30"
          >
            Purge All My Datasets & Lineage
          </button>
        </div>
      </div>
    </div>
  );
};
