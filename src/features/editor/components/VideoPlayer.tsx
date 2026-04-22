import { useEffect, useRef } from 'react';

import { FileVideo, Play } from 'lucide-react';

import { SYNC_THRESHOLD } from '../../../shared/lib/constants';
import { formatTime } from '../../../shared/lib/formatTime';
import type { VideoAsset } from '../model/types';

interface VideoPlayerProps {
  video: VideoAsset | null;
  requestedTime: number;
  onMediaReady: (mediaElement: HTMLVideoElement | null) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export function VideoPlayer({
  video,
  requestedTime,
  onMediaReady,
  onTimeUpdate,
  onDurationChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentVideoUrlRef = useRef<string | null>(null);
  const metadataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Event listeners del video - configurar una sola vez
  useEffect(() => {
    const mediaElement = videoRef.current;
    if (!mediaElement) {
      return;
    }

    function handleTimeUpdate(): void {
      if (videoRef.current) {
        onTimeUpdate(videoRef.current.currentTime);
      }
    }

    function handleLoadedMetadata(): void {
      if (!videoRef.current) return;

      const duration = videoRef.current.duration;
      if (duration && isFinite(duration)) {
        console.log('[VideoPlayer] ✓ loadedmetadata - Duración:', duration, 'segundos');
        onDurationChange(duration);
        
        // Limpiar polling si existe
        if (metadataIntervalRef.current) {
          clearInterval(metadataIntervalRef.current);
          metadataIntervalRef.current = null;
        }
      }
    }

    function handleDurationChange(): void {
      if (!videoRef.current) return;

      const duration = videoRef.current.duration;
      if (duration && isFinite(duration)) {
        console.log('[VideoPlayer] ✓ durationchange - Duración:', duration, 'segundos');
        onDurationChange(duration);
      }
    }

    function handleLoadedData(): void {
      console.log('[VideoPlayer] ✓ loadeddata - Datos del video cargados');
    }

    function handleCanPlay(): void {
      console.log('[VideoPlayer] ✓ canplay - Video listo para reproducir');
    }

    function handleError(event: Event): void {
      const target = event.target as HTMLVideoElement;
      const error = target.error;
      
      if (error) {
        console.error('[VideoPlayer] ❌ Error cargando video:', {
          code: error.code,
          message: error.message,
        });
      }
    }

    mediaElement.addEventListener('timeupdate', handleTimeUpdate);
    mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    mediaElement.addEventListener('durationchange', handleDurationChange);
    mediaElement.addEventListener('loadeddata', handleLoadedData);
    mediaElement.addEventListener('canplay', handleCanPlay);
    mediaElement.addEventListener('error', handleError);

    return () => {
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.removeEventListener('durationchange', handleDurationChange);
      mediaElement.removeEventListener('loadeddata', handleLoadedData);
      mediaElement.removeEventListener('canplay', handleCanPlay);
      mediaElement.removeEventListener('error', handleError);
    };
  }, [onTimeUpdate, onDurationChange]);

  // 2. Cargar el video cuando cambia - ESTE ES EL EFECTO CRÍTICO
  useEffect(() => {
    const mediaElement = videoRef.current;
    if (!mediaElement) {
      return;
    }

    // Limpiar polling anterior si existe
    if (metadataIntervalRef.current) {
      clearInterval(metadataIntervalRef.current);
      metadataIntervalRef.current = null;
    }

    // Si no hay video, limpiar
    if (!video) {
      console.log('[VideoPlayer] Limpiando video anterior');
      mediaElement.pause();
      mediaElement.removeAttribute('src');
      mediaElement.load();
      currentVideoUrlRef.current = null;
      return;
    }

    // Si el video no ha cambiado, no hacer nada
    if (currentVideoUrlRef.current === video.localUrl) {
      console.log('[VideoPlayer] Video ya cargado, omitiendo recarga');
      return;
    }

    console.log('[VideoPlayer] 🎬 Cargando nuevo video:', video.fileName);
    console.log('[VideoPlayer] URL:', video.localUrl);
    
    // Asignar nuevo src y cargar
    currentVideoUrlRef.current = video.localUrl;
    mediaElement.src = video.localUrl;
    mediaElement.load();

    // Polling como fallback para detectar metadatos
    const checkMetadata = () => {
      if (!mediaElement || !videoRef.current) {
        if (metadataIntervalRef.current) {
          clearInterval(metadataIntervalRef.current);
          metadataIntervalRef.current = null;
        }
        return;
      }

      const readyState = mediaElement.readyState;
      const duration = mediaElement.duration;

      if (readyState >= 1) {
        const stateNames = [
          'HAVE_NOTHING',
          'HAVE_METADATA',
          'HAVE_CURRENT_DATA',
          'HAVE_FUTURE_DATA',
          'HAVE_ENOUGH_DATA',
        ];
        
        console.log(`[VideoPlayer] ReadyState: ${readyState} (${stateNames[readyState] || 'UNKNOWN'})`);
        
        if (duration && isFinite(duration)) {
          console.log('[VideoPlayer] ✓ Duración detectada via polling:', duration, 'segundos');
          onDurationChange(duration);
          
          // Limpiar interval
          if (metadataIntervalRef.current) {
            clearInterval(metadataIntervalRef.current);
            metadataIntervalRef.current = null;
          }
        }
      }
    };

    // Iniciar polling cada 100ms
    metadataIntervalRef.current = setInterval(checkMetadata, 100);

    // Timeout de seguridad: detener polling después de 8 segundos
    const timeoutId = setTimeout(() => {
      if (metadataIntervalRef.current) {
        console.log('[VideoPlayer] Timeout de polling alcanzado (8s)');
        clearInterval(metadataIntervalRef.current);
        metadataIntervalRef.current = null;
      }
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
      if (metadataIntervalRef.current) {
        clearInterval(metadataIntervalRef.current);
        metadataIntervalRef.current = null;
      }
    };
  }, [video]); // Solo depende de video, no de callbacks

  // 3. Exponer mediaElement al timeline solo cuando hay video activo
  useEffect(() => {
    const mediaElement = videoRef.current;

    if (!mediaElement || !video?.localUrl) {
      onMediaReady(null);
      return;
    }

    onMediaReady(mediaElement);

    return () => {
      onMediaReady(null);
    };
  }, [video?.localUrl, onMediaReady]);

  // 4. Sincronizar tiempo cuando se solicita seek externo
  useEffect(() => {
    const mediaElement = videoRef.current;
    if (!mediaElement || !video || !Number.isFinite(requestedTime)) {
      return;
    }

    // Solo actualizar si la diferencia es significativa
    const currentTime = mediaElement.currentTime;
    if (Math.abs(currentTime - requestedTime) > SYNC_THRESHOLD) {
      mediaElement.currentTime = requestedTime;
    }
  }, [requestedTime, video]);

  // 5. Cleanup general al desmontar
  useEffect(() => {
    return () => {
      if (metadataIntervalRef.current) {
        clearInterval(metadataIntervalRef.current);
        metadataIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <section className="group rounded-3xl border border-white/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 shadow-[0_24px_55px_-30px_rgba(2,6,23,0.9)] transition-all hover:shadow-[0_24px_65px_-25px_rgba(2,6,23,0.95)] dark:border-slate-800/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/5">
        {/* El <video> siempre está en el DOM para que Plyr se inicialice una sola vez al montar */}
        <video
          ref={videoRef}
          className="h-full w-full"
          playsInline
          controls
          preload="metadata"
          aria-label="Vista previa del video"
        />

        {/* Placeholder encima mientras no hay video cargado */}
        {!video && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400 bg-slate-950">
            <div className="rounded-2xl bg-slate-800/50 p-6 ring-1 ring-white/5">
              <FileVideo className="h-16 w-16 text-slate-500" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-slate-300">Vista previa del video</p>
              <p className="mt-1 text-sm text-slate-500">Carga un archivo para comenzar la edicion</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-800/40 px-4 py-2.5 ring-1 ring-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium">
            {video ? `Posicion: ${formatTime(requestedTime)}` : 'Esperando archivo'}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {video ? `Duracion: ${formatTime(video.duration)}` : 'Sin video cargado'}
        </span>
      </div>
    </section>
  );
}

