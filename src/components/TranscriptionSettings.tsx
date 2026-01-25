/**
 * Transcription Settings Modal Component
 * Configure API keys, language, and diarization options
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Languages,
  Users,
  Settings,
  Check,
  ExternalLink,
  AlertCircle,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  TranscriptionConfig,
  loadTranscriptionConfig,
  saveTranscriptionConfig,
} from '../lib/transcription';

interface TranscriptionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: (config: TranscriptionConfig) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'en_uk', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en_au', name: 'English (Australian)', flag: '🇦🇺' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

export default function TranscriptionSettings({
  isOpen,
  onClose,
  onConfigChange,
}: TranscriptionSettingsProps) {
  const [config, setConfig] = useState<Partial<TranscriptionConfig>>({
    apiKey: '',
    enableDiarization: true,
    languageCode: 'en',
    speakersExpected: undefined,
    punctuate: true,
    formatText: true,
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load config on mount
  useEffect(() => {
    const savedConfig = loadTranscriptionConfig();
    if (savedConfig) {
      setConfig({
        apiKey: savedConfig.apiKey || '',
        enableDiarization: savedConfig.enableDiarization ?? true,
        languageCode: savedConfig.languageCode || 'en',
        speakersExpected: savedConfig.speakersExpected,
        punctuate: savedConfig.punctuate ?? true,
        formatText: savedConfig.formatText ?? true,
      });
    }
  }, [isOpen]);

  const handleChange = (key: keyof TranscriptionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setConnectionStatus('idle');
  };

  const handleSave = () => {
    saveTranscriptionConfig(config);
    onConfigChange?.(config as TranscriptionConfig);
    onClose();
  };

  const handleTestConnection = async () => {
    if (!config.apiKey) {
      setConnectionStatus('error');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Test the API key by making a simple request
      const response = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'GET',
        headers: {
          'Authorization': config.apiKey,
        },
      });

      // A 401 means invalid key, 200 or 404 means valid key
      if (response.status === 401) {
        setConnectionStatus('error');
      } else {
        setConnectionStatus('success');
      }
    } catch (err) {
      setConnectionStatus('error');
    } finally {
      setTestingConnection(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Transcription Settings</h2>
                  <p className="text-sm text-white/80">Configure professional transcription</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* API Key Section */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Key className="w-4 h-4 text-indigo-500" />
                AssemblyAI API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey || ''}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder="Enter your AssemblyAI API key"
                  className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Connection test */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={!config.apiKey || testingConnection}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !config.apiKey
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
                {connectionStatus === 'success' && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    Connected
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Invalid key
                  </span>
                )}
              </div>

              <a
                href="https://www.assemblyai.com/app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700"
              >
                Get your free API key at AssemblyAI
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Language Selection */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Languages className="w-4 h-4 text-indigo-500" />
                Language
              </label>
              <select
                value={config.languageCode || 'en'}
                onChange={(e) => handleChange('languageCode', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Diarization */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Speaker Diarization
                </label>
                <button
                  onClick={() => handleChange('enableDiarization', !config.enableDiarization)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    config.enableDiarization ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <motion.span
                    layout
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                    style={{ left: config.enableDiarization ? 32 : 4 }}
                  />
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Automatically identify and label different speakers in the transcript
              </p>

              {config.enableDiarization && (
                <div className="pl-6 space-y-3">
                  <label className="text-sm font-medium text-gray-600">
                    Expected number of speakers (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    {[2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleChange('speakersExpected', config.speakersExpected === num ? undefined : num)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          config.speakersExpected === num
                            ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => handleChange('speakersExpected', undefined)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        config.speakersExpected === undefined
                          ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Auto
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Text Formatting Options */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Text Formatting
              </h3>

              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Auto-punctuation</span>
                  <button
                    onClick={() => handleChange('punctuate', !config.punctuate)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.punctuate ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <motion.span
                      layout
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      style={{ left: config.punctuate ? 28 : 4 }}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Format text (paragraphs, casing)</span>
                  <button
                    onClick={() => handleChange('formatText', !config.formatText)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.formatText ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <motion.span
                      layout
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      style={{ left: config.formatText ? 28 : 4 }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Shield className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Your data is secure</p>
                <p className="text-xs text-gray-500 mt-1">
                  API keys are stored locally in your browser. Audio is sent directly to AssemblyAI
                  for processing and is automatically deleted after transcription.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Save Settings
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
