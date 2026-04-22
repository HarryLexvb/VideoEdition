import { useEffect, useRef, useState } from 'react';

interface VideoThumbnailStripProps {
  sourceUrl: string;
  duration: number;
  height?: number;
}

const THUMB_WIDTH = 80;
const THUMB_HEIGHT = 60;

/**
 * Generates a strip of video thumbnails using the Canvas API.
 * One thumbnail per THUMB_WIDTH pixels of available container width.
 */
export function VideoThumbnailStrip({ sourceUrl, duration, height = 72 }: VideoThumbnailStripProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sourceUrl || duration <= 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setThumbnails([]);

    const containerWidth = containerRef.current?.clientWidth ?? 640;
    const count = Math.max(1, Math.floor(containerWidth / THUMB_WIDTH));

    const video = document.createElement('video');
    video.src = sourceUrl;
    video.muted = true;
    video.preload = 'metadata';
    // Do NOT set crossOrigin for object URLs - it causes canvas taint errors

    const canvas = document.createElement('canvas');
    canvas.width = THUMB_WIDTH;
    canvas.height = THUMB_HEIGHT;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError(true);
      setLoading(false);
      return;
    }

    function captureFrame(timeSeconds: number): Promise<string> {
      return new Promise((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          ctx!.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };

        const onError = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          reject(new Error('seek error'));
        };

        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        video.currentTime = timeSeconds;
      });
    }

    async function generateThumbs() {
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }
        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        video.addEventListener('error', () => reject(new Error('load error')), { once: true });
      });

      const results: string[] = [];
      const step = duration / count;

      for (let i = 0; i < count; i += 1) {
        if (cancelled) break;
        try {
          const t = Math.min(step * i + step * 0.5, duration - 0.1);
          const dataUrl = await captureFrame(t);
          results.push(dataUrl);
          if (!cancelled) {
            setThumbnails([...results]);
          }
        } catch {
          results.push('');
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    generateThumbs().catch(() => {
      if (!cancelled) {
        setError(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      video.src = '';
    };
  }, [sourceUrl, duration]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg"
      style={{ height }}
      aria-label="Video thumbnail strip"
    >
      {/* Film strip background */}
      <div className="absolute inset-0 bg-slate-900 rounded-lg" />

      {/* Thumbnail images */}
      {thumbnails.length > 0 && (
        <div className="absolute inset-0 flex">
          {thumbnails.map((src, i) => (
            <div
              key={`thumb-${i}`}
              className="flex-1 overflow-hidden border-r border-slate-700/50 last:border-r-0"
              style={{ minWidth: 0 }}
            >
              {src ? (
                <img
                  src={src}
                  alt={`Frame ${i + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="h-full w-full bg-slate-800 flex items-center justify-center">
                  <span className="text-slate-600 text-xs">?</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && thumbnails.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-brand-400" />
          <span className="text-xs text-slate-400">Generando fotogramas...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-slate-500">No se pudieron generar miniaturas</span>
        </div>
      )}

      {/* Film perforations top */}
      <div className="absolute top-0 left-0 right-0 flex h-2 items-center gap-2 px-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`perf-top-${i}`} className="h-1.5 w-2.5 flex-shrink-0 rounded-sm bg-slate-900/70" />
        ))}
      </div>

      {/* Film perforations bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex h-2 items-center gap-2 px-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`perf-bot-${i}`} className="h-1.5 w-2.5 flex-shrink-0 rounded-sm bg-slate-900/70" />
        ))}
      </div>

      {/* Video label overlay */}
      <div className="absolute bottom-2 right-2 rounded bg-slate-900/80 px-1.5 py-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">VIDEO</span>
      </div>
    </div>
  );
}
