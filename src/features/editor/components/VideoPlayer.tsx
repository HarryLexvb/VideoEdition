import { useEffect, useRef } from 'react';

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
        options: [0.5, 1, 1.25, 1.5, 2],
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
    <section className="rounded-3xl border border-white/40 bg-slate-950 p-4 shadow-[0_24px_55px_-30px_rgba(2,6,23,0.8)]">
      <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900">
        <video ref={videoRef} className="h-full w-full" playsInline controls preload="metadata" aria-label="Vista previa del video" />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <span>{video ? `Timeline sincronizado en ${formatTime(requestedTime)}` : 'Carga un video para activar el editor.'}</span>
        <span>{video ? 'Controles Plyr activos' : 'Sin archivo'}</span>
      </div>
    </section>
  );
}
