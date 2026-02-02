import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Link2,
  Plus,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  createCaptureJob,
  detectMeetingProvider,
  getUpcomingCaptureJobs,
  MeetingCaptureJob,
  removeCaptureJob,
  updateCaptureJob,
} from '../lib/meeting-capture';

interface MeetingCapturePanelProps {
  onStartLocalCapture?: () => void;
}

const providerLabels: Record<string, string> = {
  zoom: 'Zoom RTMS',
  teams: 'Teams Bot',
  meet: 'Google Meet Joiner',
  unknown: 'Unknown Provider',
};

const providerBadge: Record<string, string> = {
  zoom: 'bg-blue-50 text-blue-700 border-blue-200',
  teams: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  meet: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unknown: 'bg-gray-50 text-gray-600 border-gray-200',
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return date.toLocaleString();
};

export default function MeetingCapturePanel({ onStartLocalCapture }: MeetingCapturePanelProps) {
  const captureApiUrl = import.meta.env.VITE_MEETING_CAPTURE_API_URL as string | undefined;
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [autoJoin, setAutoJoin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<MeetingCaptureJob[]>(() => getUpcomingCaptureJobs());

  const provider = useMemo(() => detectMeetingProvider(meetingUrl), [meetingUrl]);
  const isConfigured = Boolean(captureApiUrl);

  const refreshJobs = () => setJobs(getUpcomingCaptureJobs());

  const handleSchedule = async () => {
    setError(null);
    if (!meetingUrl.trim()) {
      setError('Add a meeting URL to schedule capture.');
      return;
    }

    const detected = detectMeetingProvider(meetingUrl);
    if (detected === 'unknown') {
      setError('We could not detect the meeting provider.');
      return;
    }

    const job = createCaptureJob({
      meetingUrl: meetingUrl.trim(),
      scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
      autoJoin,
    });

    refreshJobs();
    setMeetingUrl('');
    setScheduledStart('');

    if (isConfigured) {
      try {
        await fetch(`${captureApiUrl}/capture/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: job.id,
            meetingUrl: job.meetingUrl,
            provider: job.provider,
            scheduledStart: job.scheduledStart,
            autoJoin: job.autoJoin,
          }),
        });
      } catch {
        updateCaptureJob(job.id, { status: 'queued' });
      }
    }
  };

  return (
    <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Auto-Capture</p>
            <p className="text-xs text-gray-500">Zoom RTMS, Teams bot, Google Meet joiner</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${isConfigured ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
          {isConfigured ? 'Configured' : 'Needs setup'}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {(['zoom', 'teams', 'meet'] as const).map((key) => (
            <div key={key} className={`rounded-xl border px-4 py-3 ${providerBadge[key]}`}>
              <p className="text-xs uppercase tracking-wide font-semibold">{providerLabels[key]}</p>
              <p className="text-sm mt-1">{isConfigured ? 'Ready to capture' : 'Awaiting setup'}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Link2 className="w-4 h-4" />
            Schedule a capture
          </div>
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="Paste Zoom / Teams / Meet URL"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-gray-500">
              Start time (optional)
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 mt-6">
              <input
                type="checkbox"
                checked={autoJoin}
                onChange={(e) => setAutoJoin(e.target.checked)}
                className="rounded border-gray-300"
              />
              Auto-join when meeting starts
            </label>
          </div>
          {provider !== 'unknown' && meetingUrl && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${providerBadge[provider]}`}>
              <CheckCircle className="w-3 h-3" />
              {providerLabels[provider]}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <ShieldAlert className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSchedule}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 text-white text-sm font-semibold rounded-lg hover:bg-navy-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Schedule capture
            </button>
            {onStartLocalCapture && (
              <button
                onClick={onStartLocalCapture}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Start local capture
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Clock className="w-4 h-4" />
            Upcoming capture jobs
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">No capture jobs scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div>
                    <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${providerBadge[job.provider]}`}>
                      {providerLabels[job.provider]}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{formatDateTime(job.scheduledStart)}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[280px]">{job.meetingUrl}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        updateCaptureJob(job.id, { status: 'canceled' });
                        removeCaptureJob(job.id);
                        refreshJobs();
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                      title="Cancel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
