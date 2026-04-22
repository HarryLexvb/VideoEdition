import { useEffect, useRef, useState } from 'react';

interface AudioWaveformTrackProps {
  sourceUrl: string;
  duration: number;
  playheadTime: number;
  height?: number;
  muted?: boolean;
  onSeek?: (time: number) => void;
}

/**
 * Renders an audio waveform using Web Audio API (OfflineAudioContext).
 * The waveform is drawn on a canvas. A playhead cursor tracks current time.
 */
export function AudioWaveformTrack({
  sourceUrl,
  duration,
  playheadTime,
  height = 72,
  muted = false,
  onSeek,
}: AudioWaveformTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Generate waveform peaks from the audio file
  useEffect(() => {
    if (!sourceUrl || duration <= 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    peaksRef.current = null;

    async function loadWaveform() {
      try {
        const response = await fetch(sourceUrl);
        const arrayBuffer = await response.arrayBuffer();

        if (cancelled) return;

        // Use OfflineAudioContext to decode the full audio without playback
        const offlineCtx = new OfflineAudioContext(1, 22050, 22050);
        const decoded = await offlineCtx.decodeAudioData(arrayBuffer);

        if (cancelled) return;

        const rawData = decoded.getChannelData(0);
        const canvasWidth = containerRef.current?.clientWidth ?? 800;
        const samples = canvasWidth * 2; // 2 samples per pixel for detail
        const blockSize = Math.floor(rawData.length / samples);
        const peaks = new Float32Array(samples);

        for (let i = 0; i < samples; i += 1) {
          const start = i * blockSize;
          let max = 0;
          for (let j = 0; j < blockSize; j += 1) {
            const abs = Math.abs(rawData[start + j] ?? 0);
            if (abs > max) max = abs;
          }
          peaks[i] = max;
        }

        if (!cancelled) {
          peaksRef.current = peaks;
          setLoading(false);
          drawWaveform(peaks, playheadTime);
        }
      } catch (e) {
        console.error('[AudioWaveformTrack] Failed to decode audio:', e);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void loadWaveform();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, duration]);

  // Redraw whenever playheadTime changes
  useEffect(() => {
    if (peaksRef.current && !loading) {
      drawWaveform(peaksRef.current, playheadTime);
    }
  }, [playheadTime, loading]);

  function drawWaveform(peaks: Float32Array, currentTime: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const playheadX = duration > 0 ? (currentTime / duration) * w : 0;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.0)';
    ctx.fillRect(0, 0, w, h);

    const mid = h / 2;
    const barWidth = w / peaks.length;

    for (let i = 0; i < peaks.length; i += 1) {
      const x = i * barWidth;
      const amplitude = peaks[i] * (h * 0.9);

      // Color: played portion is teal, unplayed is slate
      if (x < playheadX) {
        ctx.fillStyle = 'rgba(20, 184, 166, 0.85)'; // teal - played
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.65)'; // slate - unplayed
      }

      ctx.fillRect(x, mid - amplitude / 2, Math.max(barWidth - 0.5, 0.5), Math.max(amplitude, 1));
    }

    // Playhead cursor
    if (duration > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSeek || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg bg-slate-900"
      style={{ height }}
      aria-label="Audio waveform track"
    >
      <canvas
        ref={canvasRef}
        width={containerRef.current?.clientWidth ?? 800}
        height={height}
        className="h-full w-full cursor-pointer"
        onClick={handleClick}
        aria-label="Waveform - click to seek"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-brand-400" />
          <span className="text-xs text-slate-400">Decodificando audio...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-slate-500">No se pudo decodificar el audio de este archivo</span>
        </div>
      )}

      {/* Muted overlay */}
      {muted && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-lg pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none">SILENCIADO</span>
        </div>
      )}

      {/* Audio label overlay */}
      <div className="absolute bottom-2 right-2 rounded bg-slate-900/80 px-1.5 py-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">AUDIO</span>
      </div>
    </div>
  );
}
