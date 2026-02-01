/**
 * VotingSettingsModal Component
 *
 * Settings modal for facilitators to configure voting behavior.
 * Features:
 * - Enable/disable voting for the board
 * - Anonymous voting toggle
 * - Max votes per person configuration
 * - Reset all votes button
 * - Show/hide vote counts until reveal
 * - Lock/unlock voting
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Vote,
  Eye,
  EyeOff,
  Users,
  Lock,
  Unlock,
  RotateCcw,
  AlertTriangle,
  Check,
  Infinity
} from 'lucide-react';
import type { VotingSettings } from './VotingControls';

interface VotingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VotingSettings;
  onUpdateSettings: (settings: Partial<VotingSettings>) => void;
  onResetVotes: () => void;
  totalVotes: number;
  votersCount: number;
}

const MAX_VOTES_OPTIONS = [
  { value: 1, label: '1 vote' },
  { value: 3, label: '3 votes' },
  { value: 5, label: '5 votes' },
  { value: 10, label: '10 votes' },
  { value: 'unlimited', label: 'Unlimited' }
] as const;

export const VotingSettingsModal: React.FC<VotingSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetVotes,
  totalVotes,
  votersCount
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetConfirm = () => {
    onResetVotes();
    setShowResetConfirm(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center">
                  <Vote className="w-5 h-5 text-navy-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Voting Settings</h2>
                  <p className="text-sm text-gray-500">Configure voting for this board</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{totalVotes}</div>
                  <div className="text-xs text-gray-500">Total Votes</div>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{votersCount}</div>
                  <div className="text-xs text-gray-500">Voters</div>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center">
                  <div className={`text-2xl font-bold ${settings.isLocked ? 'text-amber-600' : 'text-green-600'}`}>
                    {settings.isLocked ? 'Closed' : 'Open'}
                  </div>
                  <div className="text-xs text-gray-500">Status</div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="px-6 py-4 space-y-4 max-h-[400px] overflow-y-auto">
              {/* Enable Voting */}
              <SettingToggle
                icon={<Vote className="w-4 h-4" />}
                label="Enable Voting"
                description="Allow participants to vote on sticky notes"
                checked={settings.enabled}
                onChange={(enabled) => onUpdateSettings({ enabled })}
              />

              {/* Anonymous Voting */}
              <SettingToggle
                icon={<Users className="w-4 h-4" />}
                label="Anonymous Voting"
                description="Hide who voted for what"
                checked={settings.anonymous}
                onChange={(anonymous) => onUpdateSettings({ anonymous })}
                disabled={!settings.enabled}
              />

              {/* Hide Counts Until Reveal */}
              <SettingToggle
                icon={settings.hideCountsUntilReveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                label="Hide Counts Until Reveal"
                description="Vote counts hidden until facilitator reveals"
                checked={settings.hideCountsUntilReveal}
                onChange={(hideCountsUntilReveal) => onUpdateSettings({ hideCountsUntilReveal })}
                disabled={!settings.enabled}
              />

              {/* Reveal Results Toggle - only shows when hideCountsUntilReveal is on */}
              {settings.hideCountsUntilReveal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-8"
                >
                  <button
                    onClick={() => onUpdateSettings({ isRevealed: !settings.isRevealed })}
                    disabled={!settings.enabled}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      settings.isRevealed
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                    } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {settings.isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      <span className="font-medium">
                        {settings.isRevealed ? 'Results Revealed' : 'Results Hidden'}
                      </span>
                    </div>
                    {settings.isRevealed && <Check className="w-4 h-4" />}
                  </button>
                </motion.div>
              )}

              {/* Max Votes Per Person */}
              <div className={`space-y-2 ${!settings.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Infinity className="w-4 h-4 text-gray-500" />
                  <span>Votes Per Person</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {MAX_VOTES_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => onUpdateSettings({ maxVotesPerPerson: value })}
                      disabled={!settings.enabled}
                      className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                        settings.maxVotesPerPerson === value
                          ? 'bg-navy-100 text-navy-800 ring-2 ring-navy-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${!settings.enabled ? 'cursor-not-allowed' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lock/Unlock Voting */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => onUpdateSettings({ isLocked: !settings.isLocked })}
                  disabled={!settings.enabled}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    settings.isLocked
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-green-50 border-green-300 text-green-700'
                  } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {settings.isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Unlock className="w-5 h-5" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold">
                        {settings.isLocked ? 'Voting is Locked' : 'Voting is Open'}
                      </div>
                      <div className="text-xs opacity-75">
                        {settings.isLocked
                          ? 'Participants cannot add or remove votes'
                          : 'Participants can vote on sticky notes'}
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    settings.isLocked ? 'bg-amber-200' : 'bg-green-200'
                  }`}>
                    {settings.isLocked ? 'Unlock' : 'Lock'}
                  </div>
                </button>
              </div>

              {/* Reset Votes */}
              <div className="pt-2">
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={totalVotes === 0}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition-all ${
                      totalVotes === 0
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="font-medium">Reset All Votes</span>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-red-800">Reset all votes?</div>
                        <div className="text-sm text-red-600 mt-1">
                          This will remove all {totalVotes} votes. This action cannot be undone.
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleResetConfirm}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                          >
                            Yes, Reset
                          </button>
                          <button
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-2 bg-white text-gray-700 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={onClose}
                className="w-full py-3 bg-navy-700 text-white rounded-xl font-semibold hover:bg-navy-800 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper component for toggle settings
interface SettingToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled = false
}) => (
  <div
    className={`flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors ${
      disabled ? 'opacity-50' : ''
    }`}
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </div>
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-navy-700' : 'bg-gray-200'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  </div>
);

export default VotingSettingsModal;
