import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Dashboard from '@uppy/react/dashboard';
import { AlertCircle, Archive, Download, FileVideo, MousePointerClick, Sparkles, Upload as UploadIcon } from 'lucide-react';

import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { createId } from '../../../shared/lib/id';
import { useProcessingJob, useStartExportJob, useStartExtractAudioJob } from '../api/hooks';
import { downloadSegmentsZip, downloadZipFile } from '../api/client';
import type { SegmentZipEntry } from '../api/client';
import { HeaderBar } from '../components/HeaderBar';
import { CustomExtractionPanel, type CustomRange } from '../components/CustomExtractionPanel';
import { SidebarPanel } from '../components/SidebarPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import { TrimControls } from '../components/TrimControls';
import { VideoPlayer } from '../components/VideoPlayer';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { buildEditorJobPayload } from '../model/projectPayload';
import type { EditorJobPayload } from '../model/projectPayload';
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
  // Custom extraction — state lifted here so timeline can show overlays
  const [customExtractionMode, setCustomExtractionMode] = useState(false);
  const [customRanges, setCustomRanges] = useState<CustomRange[]>([
    { id: createId('range'), start: '', end: '' },
  ]);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const previousObjectUrlRef = useRef<string | null>(null);
  const lastHandledJobStatusRef = useRef<string | null>(null);
  const hiddenAudioRef = useRef<HTMLAudioElement | null>(null);

  const video = useEditorStore((state) => state.video);
  const tracks = useEditorStore((state) => state.tracks);
  const segments = useEditorStore((state) => state.segments);
  const selectedSegmentId = useEditorStore((state) => state.selectedSegmentId);
  const selectedTrackIds = useEditorStore((state) => state.selectedTrackIds);
  const playheadTime = useEditorStore((state) => state.playheadTime);
  const trimStart = useEditorStore((state) => state.trimStart);
  const trimEnd = useEditorStore((state) => state.trimEnd);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const uploadState = useEditorStore((state) => state.uploadState);
  const uploadMessage = useEditorStore((state) => state.uploadMessage);
  const audioExtracted = useEditorStore((state) => state.audioExtracted);

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
  const extractAudioLocally = useEditorStore((state) => state.extractAudioLocally);
  const toggleTrackMute = useEditorStore((state) => state.toggleTrackMute);
  const selectTrack = useEditorStore((state) => state.selectTrack);
  const addCaptureToSegment = useEditorStore((state) => state.addCaptureToSegment);
  const removeCaptureFromSegment = useEditorStore((state) => state.removeCaptureFromSegment);

  const historyPast = useMemo(() => past.map((record) => record.history), [past]);
  const historyFuture = useMemo(() => future.map((record) => record.history), [future]);

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  const exportMutation = useStartExportJob();
  const extractAudioMutation = useStartExtractAudioJob();
  const jobStatusQuery = useProcessingJob(activeJobContext?.jobId ?? null);

  const setMediaElement = useCallback((element: HTMLVideoElement | null) => {
    setMediaElementState(element);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setPlayheadTime(time);
  }, [setPlayheadTime]);

  const handleDurationChange = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, [setVideoDuration]);

  // Mute/unmute the video element based on the video track's muted state
  useEffect(() => {
    if (!mediaElement) return;
    const videoTrack = tracks.find((t) => t.kind === 'video');
    if (videoTrack) {
      mediaElement.muted = videoTrack.muted;
    }
  }, [mediaElement, tracks]);

  // Manage hidden <audio> element for extracted audio track playback
  useEffect(() => {
    const audioTrack = tracks.find((t) => t.kind === 'audio');

    if (!audioTrack || !mediaElement) {
      // No audio track or no video element - destroy hidden audio if it exists
      if (hiddenAudioRef.current) {
        hiddenAudioRef.current.pause();
        hiddenAudioRef.current.src = '';
        hiddenAudioRef.current = null;
      }
      return;
    }

    // Create or reuse hidden audio element
    if (!hiddenAudioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.style.display = 'none';
      document.body.appendChild(audio);
      hiddenAudioRef.current = audio;
    }

    const audio = hiddenAudioRef.current;

    // Update src if changed
    if (audio.src !== audioTrack.sourceUrl) {
      const wasPaused = mediaElement.paused;
      audio.src = audioTrack.sourceUrl;
      audio.load();
      if (!wasPaused) {
        void audio.play().catch(() => undefined);
      }
    }

    // Sync muted state
    audio.muted = audioTrack.muted;

    // Sync current time to video element
    function syncTime() {
      if (!audio || !mediaElement) return;
      const diff = Math.abs(audio.currentTime - mediaElement.currentTime);
      if (diff > 0.3) {
        audio.currentTime = mediaElement.currentTime;
      }
    }

    function onVideoPlay() {
      if (!audio || !mediaElement) return;
      audio.currentTime = mediaElement.currentTime;
      void audio.play().catch(() => undefined);
    }

    function onVideoPause() {
      if (!audio) return;
      audio.pause();
    }

    function onVideoSeeked() {
      if (!audio || !mediaElement) return;
      audio.currentTime = mediaElement.currentTime;
    }

    function onVideoTimeUpdate() {
      syncTime();
    }

    mediaElement.addEventListener('play', onVideoPlay);
    mediaElement.addEventListener('pause', onVideoPause);
    mediaElement.addEventListener('seeked', onVideoSeeked);
    mediaElement.addEventListener('timeupdate', onVideoTimeUpdate);

    // Initial state sync
    audio.muted = audioTrack.muted;
    if (!mediaElement.paused) {
      audio.currentTime = mediaElement.currentTime;
      void audio.play().catch(() => undefined);
    }

    return () => {
      mediaElement.removeEventListener('play', onVideoPlay);
      mediaElement.removeEventListener('pause', onVideoPause);
      mediaElement.removeEventListener('seeked', onVideoSeeked);
      mediaElement.removeEventListener('timeupdate', onVideoTimeUpdate);
    };
  }, [mediaElement, tracks]);

  // Sync audio track muted state to hidden audio element
  useEffect(() => {
    const audioTrack = tracks.find((t) => t.kind === 'audio');
    if (hiddenAudioRef.current && audioTrack) {
      hiddenAudioRef.current.muted = audioTrack.muted;
    }
  }, [tracks]);

  // Cleanup hidden audio on unmount
  useEffect(() => {
    return () => {
      if (hiddenAudioRef.current) {
        hiddenAudioRef.current.pause();
        hiddenAudioRef.current.src = '';
        if (hiddenAudioRef.current.parentNode) {
          hiddenAudioRef.current.parentNode.removeChild(hiddenAudioRef.current);
        }
        hiddenAudioRef.current = null;
      }
    };
  }, []);

  const { uppy, isDashboardOpen, setDashboardOpen, isTusEnabled, uploadProgress, uploadError } = useVideoUpload({
    onVideoSelected: (file: File) => {
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
      setUiMessage('Video cargado. El timeline se esta generando automaticamente.');

      setTimeout(() => setDashboardOpen(false), 300);
    },
    onUploadIdReceived: setVideoUploadId,
    onUploadStateChange: setUploadState,
  });

  useEffect(() => {
    console.log('[EditorPage] mediaElement:', mediaElement ? 'disponible' : 'null');
    console.log('[EditorPage] Video en store:', video ? `${video.fileName} (${video.duration}s)` : 'null');
    console.log('[EditorPage] Pistas:', tracks.map((t) => `${t.kind}:${t.muted ? 'muted' : 'audio-on'}`).join(', '));
  }, [mediaElement, video, tracks]);

  useEffect(() => {
    return () => {
      if (previousObjectUrlRef.current) {
        URL.revokeObjectURL(previousObjectUrlRef.current);
        previousObjectUrlRef.current = null;
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

  // ── Custom ranges CRUD ────────────────────────────────────────────

  /** Parsed ranges usable by the timeline overlay (only valid ones). */
  const validCustomRanges = useMemo(() => {
    if (!customExtractionMode) return [];
    return customRanges
      .map((r) => ({ id: r.id, start: parseFloat(r.start), end: parseFloat(r.end) }))
      .filter((r) => !isNaN(r.start) && !isNaN(r.end) && r.end > r.start && r.start >= 0);
  }, [customExtractionMode, customRanges]);

  const handleAddCustomRange = useCallback(() => {
    setCustomRanges((prev) => [...prev, { id: createId('range'), start: '', end: '' }]);
  }, []);

  const handleUpdateCustomRange = useCallback(
    (id: string, field: 'start' | 'end', value: string) => {
      setCustomRanges((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const handleRemoveCustomRange = useCallback((id: string) => {
    setCustomRanges((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  /** Called by TimelinePanel when the user finishes a right-click drag. */
  const handleCustomRangeCreate = useCallback(
    (range: { start: number; end: number }) => {
      setCustomRanges((prev) => [
        ...prev.filter((r) => r.start.trim() !== '' || r.end.trim() !== ''), // remove empty placeholders
        {
          id: createId('range'),
          start: String(range.start),
          end: String(range.end),
        },
      ]);
    },
    [],
  );

  function handleCapture(): void {
    if (!mediaElement || !selectedSegmentId) return;

    const canvas = document.createElement('canvas');
    canvas.width = mediaElement.videoWidth || 640;
    canvas.height = mediaElement.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(mediaElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    addCaptureToSegment(selectedSegmentId, dataUrl, playheadTime);
  }

  function buildPayloadOrFail() {
    if (!video) {
      setUiError('Carga un video para lanzar operaciones de backend.');
      return null;
    }

    if (isTusEnabled && !video.uploadId) {
      if (uploadState === 'uploading') {
        setUiError('La subida aun esta en progreso. Espera a que llegue al 100% antes de exportar.');
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

  /**
   * "Extract Audio" has two modes:
   * 1. LOCAL (no backend required): Always runs first. Creates a visual audio track in the
   *    timeline from the same source file. Video track gets muted. No backend call needed.
   * 2. BACKEND: If a backend API is configured, also sends to backend for server-side extraction.
   *
   * This ensures the feature always works even without a backend.
   */
  function runExtractAudio(): void {
    if (!video) {
      setUiError('Carga un video primero para extraer su audio.');
      return;
    }

    if (video.duration <= 0) {
      setUiError('Esperando metadata del video. Intenta nuevamente en unos segundos.');
      return;
    }

    if (audioExtracted) {
      setUiError('El audio ya fue extraido. Resetea el proyecto para volver al estado original.');
      return;
    }

    // Check that the video likely has audio (heuristic: assume it does unless it's muted-only format)
    // We cannot truly check without decoding, so we proceed optimistically.
    const success = extractAudioLocally();
    if (success) {
      setUiError(null);
      setUiMessage('Audio extraido localmente. El timeline ahora muestra la pista de video (miniaturas) y la pista de audio (forma de onda) por separado. El video esta silenciado y el audio suena desde la pista de audio.');

      // If backend is configured AND we have a valid uploadId, also send to backend.
      // We build the payload manually here (without calling buildPayloadOrFail which shows errors)
      // so that a missing uploadId never interrupts a successful local extraction.
      const canCallBackend =
        Boolean(import.meta.env.VITE_API_BASE_URL) &&
        Boolean(video.uploadId) &&
        video.duration > 0;

      if (canCallBackend) {
        try {
          const payload = buildEditorJobPayload(video, segments, trimStart, trimEnd);
          extractAudioMutation.mutate(payload, {
            onSuccess: (response) => {
              setActiveJobContext({ action: 'extract-audio', jobId: response.jobId });
              setUiMessage('Audio extraido localmente + tarea backend iniciada. Seguimiento activo por polling.');
            },
            onError: () => {
              // Backend failed but local extraction succeeded - don't show error
              setUiMessage('Audio extraido localmente. Backend no disponible para procesamiento servidor.');
            },
          });
        } catch {
          // Ignore payload build errors - local extraction already succeeded
        }
      }
    } else {
      setUiError('No se pudo extraer el audio. Asegurate de tener un video cargado.');
    }
  }

  /**
   * Recibe rangos ya validados desde el inline panel y los envía al backend.
   * El panel valida antes de llamar aquí, así que los rangos son siempre correctos.
   */
  function runCustomExtractionJob(ranges: Array<{ start: number; end: number }>): void {

    if (!video) {
      setUiError('Carga un video primero.');
      return;
    }

    if (video.duration <= 0) {
      setUiError('Esperando metadata del video. Intenta nuevamente en unos segundos.');
      return;
    }

    if (!import.meta.env.VITE_API_BASE_URL) {
      setUiError('La extraccion personalizada requiere que VITE_API_BASE_URL este configurado en el entorno.');
      return;
    }

    if (!video.uploadId) {
      setUiError('La extraccion personalizada requiere que el video este subido al servidor (Tus). Configura VITE_TUS_ENDPOINT y vuelve a cargar el video.');
      return;
    }

    const customTimeline = ranges.map((range, i) => ({
      id: `custom-${i}`,
      start: Number(range.start.toFixed(3)),
      end: Number(range.end.toFixed(3)),
      disposition: 'keep' as const,
    }));

    const payload: EditorJobPayload = {
      source: {
        fileName: video.fileName,
        mimeType: video.mimeType,
        size: video.size,
        uploadId: video.uploadId,
      },
      timeline: customTimeline,
      trimRange: { start: null, end: null },
      meta: {
        duration: Number(video.duration.toFixed(3)),
        keepSegmentCount: customTimeline.length,
        removeSegmentCount: 0,
        hasTrimRange: false,
        trimDuration: null,
      },
    };

    setUiError(null);
    setUiMessage(`Enviando extraccion personalizada: ${ranges.length} rango(s) al backend...`);

    extractAudioMutation.mutate(payload, {
      onSuccess: (response) => {
        setActiveJobContext({ action: 'extract-audio', jobId: response.jobId });
        setUiMessage(
          `Extraccion personalizada enviada (${ranges.length} segmento(s)). Seguimiento activo por polling.`
        );
      },
      onError: (error) => {
        setUiError(error.message);
      },
    });
  }

  /**
   * Descarga todos los archivos del job actual empaquetados en un ZIP.
   * Organiza por carpetas: una por segmento (keep), con audio + capturas asociadas.
   * Si no hay audio del backend pero hay capturas, genera un ZIP solo con capturas.
   */
  async function handleDownloadZip(): Promise<void> {
    const resultUrls =
      activeJobData?.resultUrls ?? (activeJobData?.resultUrl ? [activeJobData.resultUrl] : []);

    const keepSegments = [...segments]
      .filter((s) => s.disposition === 'keep')
      .sort((a, b) => a.start - b.start);

    // Determine if we should use the segment-organized endpoint
    const hasAudio = resultUrls.length > 0;
    const hasAnyCaptures = keepSegments.some((s) => s.captures.length > 0);

    if (!hasAudio && !hasAnyCaptures) {
      setUiError('No hay archivos ni capturas disponibles para descargar.');
      return;
    }

    setIsDownloadingZip(true);
    setUiError(null);

    try {
      const ORDINALS = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto',
                        'Sexto', 'Septimo', 'Octavo', 'Noveno', 'Decimo'];

      const count = Math.max(resultUrls.length, keepSegments.length);
      const segmentEntries: SegmentZipEntry[] = Array.from({ length: count }, (_, i) => {
        const seg = keepSegments[i] ?? null;
        const audioUrl = resultUrls[i] ?? null;
        const audioFilename = audioUrl ? (audioUrl.split('/').pop() ?? undefined) : undefined;
        const ordinal = ORDINALS[i] ?? `${i + 1}`;
        const folderName = `${String(i + 1).padStart(2, '0')} - ${ordinal} corte y capturas`;

        const captures = (seg?.captures ?? []).map((c, ci) => ({
          name: `captura_${String(ci + 1).padStart(2, '0')}.png`,
          data: c.dataUrl,
        }));

        return { folderName, audioFilename, captures };
      });

      const blob = await downloadSegmentsZip(segmentEntries);
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'cortes_y_capturas.zip';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fall back to simple ZIP if the segment endpoint is unavailable (no backend configured)
      if (resultUrls.length === 0) {
        setUiError('Configura VITE_API_BASE_URL para descargar el ZIP de capturas.');
        return;
      }
      const filenames = resultUrls.map((url) => url.split('/').pop() ?? '').filter(Boolean);
      try {
        const blob = await downloadZipFile(filenames);
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = 'audios.zip';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);
      } catch (fallbackErr) {
        setUiError(fallbackErr instanceof Error ? fallbackErr.message : 'Error al descargar ZIP');
      }
    } finally {
      setIsDownloadingZip(false);
    }
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
          onOpenUploader={() => setDashboardOpen(true)}
          onExport={runExportJob}
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

              <div className="border-b border-slate-200 bg-gradient-to-br from-brand-50/50 to-cyan-50/30 p-6 dark:border-slate-700 dark:from-brand-950/20 dark:to-cyan-950/10">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-brand-100 p-3 dark:bg-brand-900/40">
                    <FileVideo className="h-8 w-8 text-brand-700 dark:text-brand-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Arrastra tu video aqui o haz click abajo
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <MousePointerClick className="h-4 w-4" aria-hidden="true" />
                      <span>Haz <strong>click en el area gris de abajo</strong> o arrastra un archivo</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        Maximo 2 GB
                      </span>
                      <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        MP4, WebM, MOV
                      </span>
                    </div>
                  </div>
                  <UploadIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
              </div>

              <div className="p-5">
                <Dashboard
                  uppy={uppy}
                  proudlyDisplayPoweredByUppy={false}
                  hideProgressDetails={false}
                  hideUploadButton={!isTusEnabled}
                  height={350}
                  note="Haz click en esta area o arrastra tu video aqui"
                  locale={{
                    strings: {
                      dropPasteBoth: 'Suelta tu video aqui o %{browseFiles}',
                      dropPasteFiles: 'Suelta tu video aqui o %{browseFiles}',
                      browseFiles: 'haz click para seleccionar',
                      dropHint: 'Arrastra tu video aqui',
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

        {/* Captures-only ZIP: visible when there are captures but no completed backend job */}
        {segments.some((s) => s.captures.length > 0) && activeJobData?.status !== 'completed' && import.meta.env.VITE_API_BASE_URL ? (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-400">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">
                Capturas disponibles: {segments.reduce((sum, s) => sum + s.captures.length, 0)} en total
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleDownloadZip()}
                loading={isDownloadingZip}
                disabled={isDownloadingZip}
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                Descargar capturas ZIP
              </Button>
            </div>
          </div>
        ) : null}

        {activeJobData?.status === 'completed' && (activeJobData.resultUrls ?? (activeJobData.resultUrl ? [activeJobData.resultUrl] : [])).length > 0 ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
            {(activeJobData.resultUrls ?? [activeJobData.resultUrl!]).length === 1 ? (
              <div className="flex flex-wrap items-center gap-3">
                <a
                  className="inline-flex items-center gap-2 font-semibold underline decoration-emerald-400 underline-offset-2 dark:decoration-emerald-600"
                  href={(activeJobData.resultUrls ?? [activeJobData.resultUrl!])[0]}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Abrir resultado procesado
                </a>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleDownloadZip()}
                  loading={isDownloadingZip}
                  disabled={isDownloadingZip}
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  Descargar ZIP
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">
                    {(activeJobData.resultUrls ?? []).length} segmentos de audio listos para descargar:
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleDownloadZip()}
                    loading={isDownloadingZip}
                    disabled={isDownloadingZip}
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Descargar ZIP
                  </Button>
                </div>
                <ul className="space-y-1">
                  {(activeJobData.resultUrls ?? []).map((url, idx) => {
                    const filename = url.split('/').pop() ?? `segmento_${idx + 1}`;
                    return (
                      <li key={url}>
                        <a
                          className="inline-flex items-center gap-2 underline decoration-emerald-400 underline-offset-2 dark:decoration-emerald-600"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          download={filename}
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          {filename}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
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
              tracks={tracks}
              segments={segments}
              selectedSegmentId={selectedSegmentId}
              selectedTrackIds={selectedTrackIds}
              duration={video?.duration ?? 0}
              playheadTime={playheadTime}
              trimStart={trimStart}
              trimEnd={trimEnd}
              onSeek={setPlayheadTime}
              onCutAtPlayhead={addCutAtPlayhead}
              onSelectSegment={selectSegment}
              onSetTrimStart={setTrimStart}
              onSetTrimEnd={setTrimEnd}
              onToggleTrackMute={toggleTrackMute}
              onSelectTrack={selectTrack}
              customExtractionActive={customExtractionMode}
              validCustomRanges={validCustomRanges}
              onCustomRangeCreate={handleCustomRangeCreate}
              extractingAudio={extractAudioMutation.isPending}
              audioExtracted={audioExtracted}
              onExtractAudio={runExtractAudio}
              onCustomExtraction={() => {
                setCustomExtractionMode((prev) => {
                  if (!prev) {
                    setCustomRanges([{ id: createId('range'), start: '', end: '' }]);
                  }
                  return !prev;
                });
              }}
              onCapture={handleCapture}
            />

            {/* Inline custom extraction panel — aparece debajo del timeline */}
            {customExtractionMode ? (
              <CustomExtractionPanel
                videoDuration={video?.duration ?? 0}
                ranges={customRanges}
                disabled={extractAudioMutation.isPending}
                onAddRange={handleAddCustomRange}
                onUpdateRange={handleUpdateCustomRange}
                onRemoveRange={handleRemoveCustomRange}
                onExtract={runCustomExtractionJob}
                onClose={() => setCustomExtractionMode(false)}
              />
            ) : null}
          </div>

          <div className="space-y-5">
            <SidebarPanel
              segments={segments}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={selectSegment}
              onSeek={setPlayheadTime}
              onSetSelectedDisposition={setSelectedSegmentDisposition}
              onToggleSegmentDisposition={toggleSegmentDisposition}
              onRemoveCaptureFromSegment={removeCaptureFromSegment}
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
            Editor de video no destructivo: visualiza cortes, gestiona segmentos y prepara operaciones para procesamiento.
          </p>
          <p className="mt-1">
            Job activo: {activeJobContext ? `${activeJobContext.action} (${activeJobContext.jobId})` : 'ninguno'}
            {' · '}
            Estado query: {jobStatusQuery.isFetching ? 'consultando' : 'estable'}
            {' · '}
            Media: {mediaElement ? 'conectado' : 'desconectado'}
            {' · '}
            Pistas: {tracks.length}
            {audioExtracted ? ' · Audio extraido' : ''}
          </p>
          {!isTusEnabled ? <StatusBadge className="mt-2">Tus pendiente de configurar en entorno</StatusBadge> : null}
        </footer>
      </div>
    </div>
  );
}
