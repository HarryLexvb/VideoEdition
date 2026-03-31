import { useEffect, useRef } from 'react';

import { FileVideo, Play } from 'lucide-react';
import Plyr from 'plyr';

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
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    const mediaElement = videoRef.current;
    if (!mediaElement) {
      return;
    }

    const player = new Plyr(mediaElement, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
      settings: ['speed'],
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      },
    });

    playerRef.current = player;
    onMediaReady(mediaElement);

    function handleTimeUpdate(): void {
      if (!videoRef.current) {
        return;
      }

      onTimeUpdate(videoRef.current.currentTime);
    }

    function handleDurationChange(): void {
      if (!videoRef.current) {
        return;
      }

      onDurationChange(videoRef.current.duration || 0);
    }

    mediaElement.addEventListener('timeupdate', handleTimeUpdate);
    mediaElement.addEventListener('loadedmetadata', handleDurationChange);
    mediaElement.addEventListener('durationchange', handleDurationChange);

    return () => {
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('loadedmetadata', handleDurationChange);
      mediaElement.removeEventListener('durationchange', handleDurationChange);
      onMediaReady(null);
      player.destroy();
      playerRef.current = null;
    };
  }, [onDurationChange, onMediaReady, onTimeUpdate]);

  useEffect(() => {
    const mediaElement = videoRef.current;
    if (!mediaElement) {
      return;
    }

    if (!video) {
      mediaElement.removeAttribute('src');
      mediaElement.load();
      return;
    }

    mediaElement.src = video.localUrl;
    mediaElement.load();
  }, [video]);

  useEffect(() => {
    const mediaElement = videoRef.current;
    if (!mediaElement || !video || !Number.isFinite(requestedTime)) {
      return;
    }

    if (Math.abs(mediaElement.currentTime - requestedTime) > 0.18) {
      mediaElement.currentTime = requestedTime;
    }
  }, [requestedTime, video]);

  return (
    <section className="group rounded-3xl border border-white/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 shadow-[0_24px_55px_-30px_rgba(2,6,23,0.9)] transition-all hover:shadow-[0_24px_65px_-25px_rgba(2,6,23,0.95)] dark:border-slate-800/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/5">
        {!video ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-slate-400">
            <div className="rounded-2xl bg-slate-800/50 p-6 ring-1 ring-white/5">
              <FileVideo className="h-16 w-16 text-slate-500" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-slate-300">Vista previa del video</p>
              <p className="mt-1 text-sm text-slate-500">Carga un archivo para comenzar la edicion</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full"
            playsInline
            controls
            preload="metadata"
            aria-label="Vista previa del video"
          />
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
