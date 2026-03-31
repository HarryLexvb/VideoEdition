import { useEffect, useMemo, useRef, useState } from 'react';

import Dashboard from '@uppy/react/dashboard';
import { AlertCircle, Download, Sparkles } from 'lucide-react';

import { StatusBadge } from '../../../shared/components/StatusBadge';
import { createId } from '../../../shared/lib/id';
import { useProcessingJob, useStartExportJob, useStartExtractAudioJob } from '../api/hooks';
import { HeaderBar } from '../components/HeaderBar';
import { SidebarPanel } from '../components/SidebarPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import { VideoPlayer } from '../components/VideoPlayer';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { buildEditorJobPayload } from '../model/projectPayload';
import { useEditorStore } from '../store/useEditorStore';

interface ActiveJobContext {
  action: 'export' | 'extract-audio';
  jobId: string;
}

export function EditorPage() {
  const [mediaElement, setMediaElement] = useState<HTMLVideoElement | null>(null);
  const [activeJobContext, setActiveJobContext] = useState<ActiveJobContext | null>(null);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  const previousObjectUrlRef = useRef<string | null>(null);
  const lastHandledJobStatusRef = useRef<string | null>(null);

  const video = useEditorStore((state) => state.video);
  const segments = useEditorStore((state) => state.segments);
  const selectedSegmentId = useEditorStore((state) => state.selectedSegmentId);
  const playheadTime = useEditorStore((state) => state.playheadTime);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const uploadState = useEditorStore((state) => state.uploadState);
  const uploadMessage = useEditorStore((state) => state.uploadMessage);

  const setVideo = useEditorStore((state) => state.setVideo);
  const setVideoDuration = useEditorStore((state) => state.setVideoDuration);
  const setVideoUploadId = useEditorStore((state) => state.setVideoUploadId);
  const setUploadState = useEditorStore((state) => state.setUploadState);
  const setPlayheadTime = useEditorStore((state) => state.setPlayheadTime);
  const addCutAtPlayhead = useEditorStore((state) => state.addCutAtPlayhead);
  const selectSegment = useEditorStore((state) => state.selectSegment);
  const setSelectedSegmentDisposition = useEditorStore((state) => state.setSelectedSegmentDisposition);
  const toggleSegmentDisposition = useEditorStore((state) => state.toggleSegmentDisposition);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const resetProject = useEditorStore((state) => state.resetProject);

  const historyPast = useMemo(() => past.map((record) => record.history), [past]);
  const historyFuture = useMemo(() => future.map((record) => record.history), [future]);

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  const exportMutation = useStartExportJob();
  const extractAudioMutation = useStartExtractAudioJob();
  const jobStatusQuery = useProcessingJob(activeJobContext?.jobId ?? null);

  const { uppy, isDashboardOpen, setDashboardOpen, isTusEnabled, uploadProgress, uploadError } = useVideoUpload({
    onVideoSelected: (file: File) => {
      if (previousObjectUrlRef.current) {
        URL.revokeObjectURL(previousObjectUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(file);
      previousObjectUrlRef.current = objectUrl;

      setVideo({
        id: createId('video'),
        fileName: file.name,
        mimeType: file.type || 'video/mp4',
        size: file.size,
        localUrl: objectUrl,
        duration: 0,
      });

      setUiError(null);
      setUiMessage('Video cargado correctamente. Define cortes en la linea de tiempo.');
      
      // Cerrar modal automáticamente después de la carga
      setTimeout(() => setDashboardOpen(false), 100);
    },
    onUploadIdReceived: setVideoUploadId,
    onUploadStateChange: setUploadState,
  });

  useEffect(() => {
    return () => {
      if (previousObjectUrlRef.current) {
        URL.revokeObjectURL(previousObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyboardShortcuts(event: KeyboardEvent): void {
      const isMetaOrControl = event.metaKey || event.ctrlKey;
      if (!isMetaOrControl || event.key.toLowerCase() !== 'z') {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts);

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [redo, undo]);

  useEffect(() => {
    const jobStatus = jobStatusQuery.data;
    if (!jobStatus) {
      return;
    }

    const statusKey = `${jobStatus.jobId}:${jobStatus.status}`;
    if (lastHandledJobStatusRef.current === statusKey) {
      return;
    }

    lastHandledJobStatusRef.current = statusKey;

    if (jobStatus.status === 'completed') {
      setUiMessage('Proceso completado en backend. Puedes abrir el resultado cuando este disponible.');
      setUiError(null);
    }

    if (jobStatus.status === 'failed') {
      setUiError(jobStatus.error ?? 'El backend reporto un fallo durante el procesamiento.');
    }
  }, [jobStatusQuery.data]);

  const activeJobData = useMemo(() => jobStatusQuery.data ?? null, [jobStatusQuery.data]);

  function buildPayloadOrFail() {
    if (!video) {
      setUiError('Carga un video para lanzar operaciones de backend.');
      return null;
    }

    if (video.duration <= 0) {
      setUiError('Esperando metadata del video. Intenta nuevamente en unos segundos.');
      return null;
    }

    return buildEditorJobPayload(video, segments);
  }

  function runExportJob(): void {
    const payload = buildPayloadOrFail();
    if (!payload) {
      return;
    }

    setUiError(null);
    setUiMessage('Enviando exportacion al backend...');

    exportMutation.mutate(payload, {
      onSuccess: (response) => {
        setActiveJobContext({ action: 'export', jobId: response.jobId });
        setUiMessage('Exportacion enviada. Seguimiento activo por polling.');
      },
      onError: (error) => {
        setUiError(error.message);
      },
    });
  }

  function runExtractAudioJob(): void {
    const payload = buildPayloadOrFail();
    if (!payload) {
      return;
    }

    setUiError(null);
    setUiMessage('Solicitando extraccion de audio al backend...');

    extractAudioMutation.mutate(payload, {
      onSuccess: (response) => {
        setActiveJobContext({ action: 'extract-audio', jobId: response.jobId });
        setUiMessage('Extraccion de audio enviada. Seguimiento activo por polling.');
      },
      onError: (error) => {
        setUiError(error.message);
      },
    });
  }

  return (
    <div className="min-h-screen bg-app pb-8 pt-5 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-8">
        <HeaderBar
          video={video}
          segmentCount={segments.length}
          uploadState={uploadState}
          uploadMessage={uploadMessage}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          isTusEnabled={isTusEnabled}
          activeJob={activeJobData}
          exporting={exportMutation.isPending}
          extractingAudio={extractAudioMutation.isPending}
          onOpenUploader={() => setDashboardOpen(true)}
          onExport={runExportJob}
          onExtractAudio={runExtractAudioJob}
          onResetProject={resetProject}
        />

        {isDashboardOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-5xl rounded-3xl border border-white/60 bg-white p-4 shadow-2xl dark:border-slate-700/60 dark:bg-slate-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Cargar video</h2>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                  onClick={() => setDashboardOpen(false)}
                >
                  Cerrar
                </button>
              </div>
              <Dashboard
                uppy={uppy}
                proudlyDisplayPoweredByUppy={false}
                hideUploadButton={!isTusEnabled}
                height={360}
                note="Arrastra tu video aquí o haz click para seleccionar. Máximo 2 GB."
                locale={{
                  strings: {
                    dropPasteBoth: 'Arrastra el video aquí, pega o %{browseFiles}',
                    dropPasteFiles: 'Arrastra el video aquí o %{browseFiles}',
                    browseFiles: 'haz click para seleccionar',
                  },
                }}
              />
            </div>
          </div>
        ) : null}

        {uiError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
            <p className="inline-flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {uiError}
            </p>
          </div>
        ) : null}

        {uiMessage ? (
          <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-400">
            <p className="inline-flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {uiMessage}
            </p>
          </div>
        ) : null}

        {activeJobData?.status === 'completed' && activeJobData.resultUrl ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
            <a
              className="inline-flex items-center gap-2 font-semibold underline decoration-emerald-400 underline-offset-2 dark:decoration-emerald-600"
              href={activeJobData.resultUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Abrir resultado procesado
            </a>
          </div>
        ) : null}

        <main className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <VideoPlayer
              video={video}
              requestedTime={playheadTime}
              onMediaReady={setMediaElement}
              onTimeUpdate={setPlayheadTime}
              onDurationChange={setVideoDuration}
            />

            <TimelinePanel
              mediaElement={mediaElement}
              segments={segments}
              selectedSegmentId={selectedSegmentId}
              duration={video?.duration ?? 0}
              playheadTime={playheadTime}
              onSeek={setPlayheadTime}
              onCutAtPlayhead={addCutAtPlayhead}
              onSelectSegment={selectSegment}
            />
          </div>

          <SidebarPanel
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={selectSegment}
            onSeek={setPlayheadTime}
            onSetSelectedDisposition={setSelectedSegmentDisposition}
            onToggleSegmentDisposition={toggleSegmentDisposition}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            historyPast={historyPast}
            historyFuture={historyFuture}
          />
        </main>

        <footer className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4 text-xs text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-400">
          <p>
            Pipeline frontend no destructivo: visualiza cortes, gestiona segmentos y envia operaciones para procesamiento en backend.
          </p>
          <p className="mt-1">
            Job activo: {activeJobContext ? `${activeJobContext.action} (${activeJobContext.jobId})` : 'ninguno'}
            {' · '}
            Estado query: {jobStatusQuery.isFetching ? 'consultando' : 'estable'}
          </p>
          {!isTusEnabled ? <StatusBadge className="mt-2">Tus pendiente de configurar en entorno</StatusBadge> : null}
        </footer>
      </div>
    </div>
  );
}
