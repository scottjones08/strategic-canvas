/**
 * Integration Hub Component
 * 
 * Central settings page for connecting external tools and services.
 * Supports Notion, Slack, Linear/Jira, Google Calendar, and Email (SMTP).
 * Each integration has connect/disconnect toggle, config fields, and test connection.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Link,
  Unlink,
  Zap,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  GitBranch,
  Shield,
  Search,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type IntegrationId = 'notion' | 'slack' | 'linear' | 'google-calendar' | 'email';

interface IntegrationConfig {
  [key: string]: string;
}

interface IntegrationState {
  id: IntegrationId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  connected: boolean;
  lastSync?: string;
  config: IntegrationConfig;
  configFields: ConfigField[];
  features: string[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'select';
  placeholder: string;
  required: boolean;
  options?: { value: string; label: string }[];
  helpText?: string;
}

interface IntegrationHubProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Default Integration Definitions ──────────────────────────────────────────

const defaultIntegrations: IntegrationState[] = [
  {
    id: 'notion',
    name: 'Notion',
    description: 'Push canvas decisions, tasks, and meeting notes to Notion databases.',
    icon: <FileText className="w-5 h-5" />,
    color: 'text-gray-900',
    bgColor: 'bg-white border border-gray-200',
    connected: false,
    config: {},
    configFields: [
      { key: 'apiKey', label: 'Integration Token', type: 'password', placeholder: 'secret_...', required: true, helpText: 'Create an internal integration at notion.so/my-integrations' },
      { key: 'databaseId', label: 'Database ID', type: 'text', placeholder: 'e.g. abc123def456', required: true, helpText: 'The ID of the Notion database to sync with' },
      { key: 'workspace', label: 'Workspace Name', type: 'text', placeholder: 'My Workspace', required: false },
    ],
    features: ['Push decisions to database', 'Sync action items', 'Export meeting notes', 'Auto-create pages from templates'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post meeting summaries, action items, and alerts to Slack channels.',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    connected: false,
    config: {},
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/...', required: true, helpText: 'Create an incoming webhook in your Slack workspace settings' },
      { key: 'defaultChannel', label: 'Default Channel', type: 'text', placeholder: '#strategy-updates', required: false },
      { key: 'botName', label: 'Bot Display Name', type: 'text', placeholder: 'Strategic Canvas', required: false },
    ],
    features: ['Post meeting summaries', 'Share action items', 'Send deadline reminders', 'Team activity notifications'],
  },
  {
    id: 'linear',
    name: 'Linear / Jira',
    description: 'Create and sync issues from canvas action items and decisions.',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    connected: false,
    config: {},
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', placeholder: 'Select provider', required: true, options: [{ value: 'linear', label: 'Linear' }, { value: 'jira', label: 'Jira' }] },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'lin_api_...', required: true },
      { key: 'teamId', label: 'Team / Project ID', type: 'text', placeholder: 'e.g. TEAM-123', required: true },
      { key: 'defaultLabel', label: 'Default Label', type: 'text', placeholder: 'strategy', required: false },
    ],
    features: ['Create issues from action items', 'Sync status updates', 'Link decisions to issues', 'Auto-assign based on roles'],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Auto-create follow-up meetings and sync deadlines to your calendar.',
    icon: <Calendar className="w-5 h-5" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    connected: false,
    config: {},
    configFields: [
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', placeholder: 'xxxx.apps.googleusercontent.com', required: true, helpText: 'From Google Cloud Console → APIs & Services → Credentials' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-...', required: true },
      { key: 'calendarId', label: 'Calendar ID', type: 'text', placeholder: 'primary', required: false, helpText: 'Leave as "primary" for your default calendar' },
    ],
    features: ['Create follow-up meetings', 'Add deadline reminders', 'Sync meeting schedules', 'Auto-invite attendees'],
  },
  {
    id: 'email',
    name: 'Email (SMTP)',
    description: 'Send stakeholder updates, meeting summaries, and reports directly via email.',
    icon: <Mail className="w-5 h-5" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    connected: false,
    config: {},
    configFields: [
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com', required: true },
      { key: 'smtpPort', label: 'SMTP Port', type: 'text', placeholder: '587', required: true },
      { key: 'username', label: 'Username / Email', type: 'email', placeholder: 'you@company.com', required: true },
      { key: 'password', label: 'App Password', type: 'password', placeholder: '••••••••', required: true },
      { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'Strategic Canvas', required: false },
    ],
    features: ['Send meeting summaries', 'Email stakeholder updates', 'Share board snapshots', 'Scheduled report delivery'],
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ connected: boolean }> = ({ connected }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
    connected 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
    {connected ? 'Connected' : 'Not connected'}
  </span>
);

const IntegrationCard: React.FC<{
  integration: IntegrationState;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onUpdateConfig: (key: string, value: string) => void;
  onTestConnection: () => void;
  testStatus: 'idle' | 'testing' | 'success' | 'error';
}> = ({ integration, isExpanded, onToggleExpand, onConnect, onDisconnect, onUpdateConfig, onTestConnection, testStatus }) => {
  return (
    <motion.div
      layout
      className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${integration.bgColor} flex items-center justify-center ${integration.color}`}>
            {integration.icon}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{integration.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{integration.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge connected={integration.connected} />
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Config Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
              {/* Features List */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Features</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {integration.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <Zap className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Config Fields */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuration</h4>
                {integration.configFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={integration.config[field.key] || ''}
                        onChange={(e) => onUpdateConfig(field.key, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">{field.placeholder}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={integration.config[field.key] || ''}
                        onChange={(e) => onUpdateConfig(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    )}
                    {field.helpText && (
                      <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {integration.connected ? (
                  <>
                    <button
                      onClick={onDisconnect}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                    <button
                      onClick={onTestConnection}
                      disabled={testStatus === 'testing'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {testStatus === 'testing' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : testStatus === 'success' ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : testStatus === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Connection OK' : testStatus === 'error' ? 'Test Failed' : 'Test Connection'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onConnect}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                  >
                    <Link className="w-3.5 h-3.5" />
                    Connect
                  </button>
                )}

                {integration.lastSync && (
                  <span className="ml-auto text-xs text-gray-400">
                    Last synced: {integration.lastSync}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export const IntegrationHub: React.FC<IntegrationHubProps> = ({ isOpen, onClose }) => {
  const [integrations, setIntegrations] = useState<IntegrationState[]>(defaultIntegrations);
  const [expandedId, setExpandedId] = useState<IntegrationId | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<IntegrationId, 'idle' | 'testing' | 'success' | 'error'>>({
    notion: 'idle',
    slack: 'idle',
    linear: 'idle',
    'google-calendar': 'idle',
    email: 'idle',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleExpand = useCallback((id: IntegrationId) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleConnect = useCallback((id: IntegrationId) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, connected: true, lastSync: new Date().toLocaleString() }
          : i
      )
    );
  }, []);

  const handleDisconnect = useCallback((id: IntegrationId) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, connected: false, lastSync: undefined, config: {} }
          : i
      )
    );
    setTestStatuses((prev) => ({ ...prev, [id]: 'idle' }));
  }, []);

  const handleUpdateConfig = useCallback((id: IntegrationId, key: string, value: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, config: { ...i.config, [key]: value } }
          : i
      )
    );
  }, []);

  const handleTestConnection = useCallback((id: IntegrationId) => {
    setTestStatuses((prev) => ({ ...prev, [id]: 'testing' }));
    // Simulate test connection
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success for demo
      setTestStatuses((prev) => ({ ...prev, [id]: success ? 'success' : 'error' }));
      // Reset after 3 seconds
      setTimeout(() => {
        setTestStatuses((prev) => ({ ...prev, [id]: 'idle' }));
      }, 3000);
    }, 1500);
  }, []);

  const connectedCount = integrations.filter((i) => i.connected).length;

  const filteredIntegrations = integrations.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Integration Hub</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {connectedCount} of {integrations.length} integrations connected
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Connection Overview Bar */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-600 dark:text-gray-300">All connections are encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                {integrations.map((i) => (
                  <div
                    key={i.id}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    title={`${i.name}: ${i.connected ? 'Connected' : 'Not connected'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Integration List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                isExpanded={expandedId === integration.id}
                onToggleExpand={() => handleToggleExpand(integration.id)}
                onConnect={() => handleConnect(integration.id)}
                onDisconnect={() => handleDisconnect(integration.id)}
                onUpdateConfig={(key, value) => handleUpdateConfig(integration.id, key, value)}
                onTestConnection={() => handleTestConnection(integration.id)}
                testStatus={testStatuses[integration.id]}
              />
            ))}

            {filteredIntegrations.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No integrations match "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Need a custom integration?{' '}
              <button className="text-blue-500 hover:text-blue-600 font-medium">Contact us</button>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IntegrationHub;
