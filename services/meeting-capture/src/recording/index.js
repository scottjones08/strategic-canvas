import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const activeRecordings = new Map();

function buildArgs({ mode, source, outputPath }) {
  if (mode === 'pulse') {
    return ['-y', '-f', 'pulse', '-i', source || 'default', '-t', process.env.CAPTURE_MAX_SECONDS || '3600', outputPath];
  }
  if (mode === 'url') {
    return ['-y', '-i', source, '-t', process.env.CAPTURE_MAX_SECONDS || '3600', outputPath];
  }
  return null;
}

export async function startRecordingForJob(job) {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const mode = process.env.CAPTURE_AUDIO_MODE || 'pulse';
  const source = mode === 'url'
    ? (job.audioUrl || process.env.CAPTURE_AUDIO_URL)
    : (process.env.CAPTURE_AUDIO_SOURCE || 'default');

  if (!source) {
    throw new Error('No audio source configured');
  }

  const args = buildArgs({ mode, source, outputPath: '' });
  if (!args) {
    throw new Error('Unsupported audio capture mode');
  }

  const outputDir = process.env.CAPTURE_OUTPUT_DIR || os.tmpdir();
  const outputPath = path.join(outputDir, `capture-${job.id}.wav`);
  args[args.length - 1] = outputPath;

  const child = spawn(ffmpeg, args, { stdio: 'ignore' });
  activeRecordings.set(job.id, { process: child, outputPath });

  child.on('exit', () => {
    activeRecordings.delete(job.id);
  });

  return outputPath;
}

export async function stopRecording(jobId) {
  const recording = activeRecordings.get(jobId);
  if (!recording) return null;
  recording.process.kill('SIGINT');
  return recording.outputPath;
}

export async function readRecording(jobId) {
  const recording = activeRecordings.get(jobId);
  if (!recording) return null;
  const buffer = await fs.readFile(recording.outputPath);
  return { buffer, outputPath: recording.outputPath };
}

export function getRecording(jobId) {
  return activeRecordings.get(jobId) || null;
}
