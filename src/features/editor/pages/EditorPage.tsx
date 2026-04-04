import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Dashboard from '@uppy/react/dashboard';
import { AlertCircle, Download, FileVideo, MousePointerClick, Sparkles, Upload as UploadIcon } from 'lucide-react';

import { StatusBadge } from '../../../shared/components/StatusBadge';
import { createId } from '../../../shared/lib/id';
import { useProcessingJob, useStartExportJob, useStartExtractAudioJob } from '../api/hooks';
import { HeaderBar } from '../components/HeaderBar';
import { SidebarPanel } from '../components/SidebarPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import { TrimControls } from '../components/TrimControls';
import { VideoPlayer } from '../components/VideoPlayer';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { buildEditorJobPayload } from '../model/projectPayload';
import { useEditorStore } from '../store/useEditorStore';

interface ActiveJobContext {
  action: 'export' | 'extract-audio';
  jobId: string;
}

export function EditorPage() {
  const [mediaElement, setMediaElementState] = useState<HTMLVideoElement | null>(null);
  const [activeJobContext, setActiveJobContext] = useState<ActiveJobContext | null>(null);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  const previousObjectUrlRef = useRef<string | null>(null);
  const lastHandledJobStatusRef = useRef<string | null>(null);

  const video = useEditorStore((state) => state.video);
  const segments = useEditorStore((state) => state.segments);
  const selectedSegmentId = useEditorStore((state) => state.selectedSegmentId);
  const playheadTime = useEditorStore((state) => state.playheadTime);
  const trimStart = useEditorStore((state) => state.trimStart);
  const trimEnd = useEditorStore((state) => state.trimEnd);
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
  const setTrimStart = useEditorStore((state) => state.setTrimStart);
  const setTrimEnd = useEditorStore((state) => state.setTrimEnd);
  const setTrimStartAtPlayhead = useEditorStore((state) => state.setTrimStartAtPlayhead);
  const setTrimEndAtPlayhead = useEditorStore((state) => state.setTrimEndAtPlayhead);
  const clearTrimRange = useEditorStore((state) => state.clearTrimRange);
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

  // Estabilizar callback de setMediaElement para evitar re-renders en VideoPlayer
  const setMediaElement = useCallback((element: HTMLVideoElement | null) => {
    setMediaElementState(element);
  }, []);

  // Estabilizar callback de onTimeUpdate
  const handleTimeUpdate = useCallback((time: number) => {
    setPlayheadTime(time);
  }, [setPlayheadTime]);

  // Estabilizar callback de onDurationChange
  const handleDurationChange = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, [setVideoDuration]);

  const { uppy, isDashboardOpen, setDashboardOpen, isTusEnabled, uploadProgress, uploadError } = useVideoUpload({
    onVideoSelected: (file: File) => {
      // Revocar URL anterior si existe
      if (previousObjectUrlRef.current) {
        URL.revokeObjectURL(previousObjectUrlRef.current);
        previousObjectUrlRef.current = null;
      }

      const objectUrl = URL.createObjectURL(file);
      previousObjectUrlRef.current = objectUrl;

      console.log('[EditorPage] Video seleccionado:', file.name, 'URL creada:', objectUrl);

      setVideo({
        id: createId('video'),
        fileName: file.name,
        mimeType: file.type || 'video/mp4',
        size: file.size,
        localUrl: objectUrl,
        duration: 0,
      });

      setUiError(null);
      setUiMessage('Video cargado correctamente. El timeline se está generando automáticamente.');
      
      setTimeout(() => setDashboardOpen(false), 300);
    },
    onUploadIdReceived: setVideoUploadId,
    onUploadStateChange: setUploadState,
  });

  useEffect(() => {
    console.log('[EditorPage] mediaElement actualizado:', mediaElement ? 'Video element disponible' : 'null');
    console.log('[EditorPage] Video en store:', video ? `${video.fileName} (${video.duration}s)` : 'null');
  }, [mediaElement, video]);

  // Cleanup de object URL al desmontar
  useEffect(() => {
    return () => {
      if (previousObjectUrlRef.current) {
        URL.revokeObjectURL(previousObjectUrlRef.current);
        previousObjectUrlRef.current = null;
      }
    };
  }, []);

  // Keyboard shortcuts para undo/redo
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

  // Job status polling
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

    if (isTusEnabled && !video.uploadId) {
      if (uploadState === 'uploading') {
        setUiError('La subida aun esta en progreso. Espera a que Upload llegue a 100% antes de exportar o extraer audio.');
      } else {
        setUiError('No se obtuvo uploadId del archivo. Vuelve a subir el video para continuar.');
      }

      return null;
    }

    if (video.duration <= 0) {
      setUiError('Esperando metadata del video. Intenta nuevamente en unos segundos.');
      return null;
    }

    return buildEditorJobPayload(video, segments, trimStart, trimEnd);
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
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-800">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
                <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">Cargar video</h2>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                  onClick={() => setDashboardOpen(false)}
                >
                  Cerrar
                </button>
              </div>

              {/* Instrucciones visuales mejoradas */}
              <div className="border-b border-slate-200 bg-gradient-to-br from-brand-50/50 to-cyan-50/30 p-6 dark:border-slate-700 dark:from-brand-950/20 dark:to-cyan-950/10">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-brand-100 p-3 dark:bg-brand-900/40">
                    <FileVideo className="h-8 w-8 text-brand-700 dark:text-brand-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Arrastra tu video aquí o haz click abajo
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <MousePointerClick className="h-4 w-4" aria-hidden="true" />
                      <span>Haz <strong>click en el área gris de abajo</strong> o arrastra un archivo</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        Máximo 2 GB
                      </span>
                      <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        MP4, WebM, MOV
                      </span>
                    </div>
                  </div>
                  <UploadIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
              </div>

              {/* Dashboard de Uppy - Configuración correcta */}
              <div className="p-5">
                <Dashboard
                  uppy={uppy}
                  proudlyDisplayPoweredByUppy={false}
                  hideProgressDetails={false}
                  hideUploadButton={!isTusEnabled}
                  height={350}
                  note="💡 Haz click en esta área o arrastra tu video aquí"
                  locale={{
                    strings: {
                      dropPasteBoth: 'Suelta tu video aquí o %{browseFiles}',
                      dropPasteFiles: 'Suelta tu video aquí o %{browseFiles}',
                      browseFiles: 'haz click para seleccionar',
                      dropHint: 'Arrastra tu video aquí',
                    },
                  }}
                />
              </div>
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
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
            />

            <TimelinePanel
              mediaElement={mediaElement}
              mediaSourceUrl={video?.localUrl ?? null}
              segments={segments}
              selectedSegmentId={selectedSegmentId}
              duration={video?.duration ?? 0}
              playheadTime={playheadTime}
              trimStart={trimStart}
              trimEnd={trimEnd}
              onSeek={setPlayheadTime}
              onCutAtPlayhead={addCutAtPlayhead}
              onSelectSegment={selectSegment}
              onSetTrimStart={setTrimStart}
              onSetTrimEnd={setTrimEnd}
            />
          </div>

          <div className="space-y-5">
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

            <TrimControls
              trimStart={trimStart}
              trimEnd={trimEnd}
              playheadTime={playheadTime}
              duration={video?.duration ?? 0}
              onSetTrimStart={setTrimStartAtPlayhead}
              onSetTrimEnd={setTrimEndAtPlayhead}
              onClearTrimRange={clearTrimRange}
            />
          </div>
        </main>

        <footer className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4 text-xs text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-400">
          <p>
            Editor de video no destructivo: visualiza cortes, gestiona segmentos y prepara operaciones para procesamiento futuro.
          </p>
          <p className="mt-1">
            Job activo: {activeJobContext ? `${activeJobContext.action} (${activeJobContext.jobId})` : 'ninguno'}
            {' · '}
            Estado query: {jobStatusQuery.isFetching ? 'consultando' : 'estable'}
            {' · '}
            Media: {mediaElement ? 'conectado' : 'desconectado'}
          </p>
          {!isTusEnabled ? <StatusBadge className="mt-2">Tus pendiente de configurar en entorno</StatusBadge> : null}
        </footer>
      </div>
    </div>
  );
}
