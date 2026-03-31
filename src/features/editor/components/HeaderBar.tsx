import { AudioLines, Clapperboard, Download, Loader2, RotateCcw, Upload } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { formatFileSize, formatTime } from '../../../shared/lib/formatTime';
import type { JobStatusResponse } from '../api/types';
import type { UploadState, VideoAsset } from '../model/types';

interface HeaderBarProps {
  video: VideoAsset | null;
  segmentCount: number;
  uploadState: UploadState;
  uploadMessage: string | null;
  uploadProgress: number;
  uploadError: string | null;
  isTusEnabled: boolean;
  activeJob: JobStatusResponse | null;
  exporting: boolean;
  extractingAudio: boolean;
  onOpenUploader: () => void;
  onExport: () => void;
  onExtractAudio: () => void;
  onResetProject: () => void;
}

function getUploadTone(uploadState: UploadState): 'neutral' | 'success' | 'warning' | 'danger' {
  if (uploadState === 'uploaded') {
    return 'success';
  }

  if (uploadState === 'uploading') {
    return 'warning';
  }

  if (uploadState === 'error') {
    return 'danger';
  }

  return 'neutral';
}

function getProcessingTone(status: JobStatusResponse['status']): 'info' | 'warning' | 'success' | 'danger' {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'failed') {
    return 'danger';
  }

  if (status === 'queued') {
    return 'info';
  }

  return 'warning';
}

export function HeaderBar({
  video,
  segmentCount,
  uploadState,
  uploadMessage,
  uploadProgress,
  uploadError,
  isTusEnabled,
  activeJob,
  exporting,
  extractingAudio,
  onOpenUploader,
  onExport,
  onExtractAudio,
  onResetProject,
}: HeaderBarProps) {
  return (
    <header className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/90 dark:shadow-[0_20px_60px_-35px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
            <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" />
            Editor de video
          </div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">VideoCut Studio</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Edicion no destructiva con timeline, historial y acciones preparadas para backend.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Button variant="secondary" onClick={onOpenUploader}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Cargar video
          </Button>
          <Button onClick={onExport} loading={exporting} disabled={!video || extractingAudio}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Exportar
          </Button>
          <Button variant="secondary" onClick={onExtractAudio} loading={extractingAudio} disabled={!video || exporting}>
            <AudioLines className="h-4 w-4" aria-hidden="true" />
            Extraer audio
          </Button>
          <Button variant="ghost" onClick={onResetProject} disabled={!video}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Resetear
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700/50 dark:bg-slate-800/70">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Archivo activo</h2>
            <StatusBadge tone={video ? 'success' : 'neutral'}>{video ? 'Cargado' : 'Sin archivo'}</StatusBadge>
          </div>
          {video ? (
            <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100" title={video.fileName}>
                {video.fileName}
              </p>
              <p>
                {formatFileSize(video.size)} · {video.mimeType}
              </p>
              <p>
                Duracion: {formatTime(video.duration)} · Segmentos: {segmentCount}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Arrastra un video para comenzar la edicion.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700/50 dark:bg-slate-800/70">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Upload</h2>
            <StatusBadge tone={getUploadTone(uploadState)}>
              {uploadState === 'uploading' ? `${uploadProgress}%` : uploadState}
            </StatusBadge>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {uploadError ?? uploadMessage ?? (isTusEnabled ? 'Tus activo para subida reanudable.' : 'Modo local activo.')}
          </p>
          {!isTusEnabled ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Define VITE_TUS_ENDPOINT para activar envio resumable.</p> : null}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700/50 dark:bg-slate-800/70">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Procesamiento backend</h2>
            {activeJob ? (
              <StatusBadge tone={getProcessingTone(activeJob.status)}>{activeJob.status}</StatusBadge>
            ) : (
              <StatusBadge>Sin tarea</StatusBadge>
            )}
          </div>
          {activeJob ? (
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              <p>ID: {activeJob.jobId}</p>
              {typeof activeJob.progress === 'number' ? <p>Progreso: {Math.round(activeJob.progress)}%</p> : null}
              {activeJob.message ? <p>{activeJob.message}</p> : null}
              {activeJob.status === 'queued' || activeJob.status === 'processing' ? (
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Polling activo
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Lanza exportacion o extraccion para iniciar una tarea.</p>
          )}
        </section>
      </div>
    </header>
  );
}
