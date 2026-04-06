import { useEffect, useMemo, useRef } from 'react';

import { Activity, Film, Layers, Music2, Scissors, Volume2, VolumeX } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { formatTime } from '../../../shared/lib/formatTime';
import type { MediaTrack, TimelineSegment } from '../model/types';
import { AudioWaveformTrack } from './AudioWaveformTrack';
import { VideoThumbnailStrip } from './VideoThumbnailStrip';

interface TimelinePanelProps {
  mediaElement: HTMLVideoElement | null;
  tracks: MediaTrack[];
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  duration: number;
  playheadTime: number;
  trimStart: number | null;
  trimEnd: number | null;
  onSeek: (time: number) => void;
  onCutAtPlayhead: () => void;
  onSelectSegment: (segmentId: string) => void;
  onSetTrimStart: (time: number) => void;
  onSetTrimEnd: (time: number) => void;
}

/**
 * Converts a segment disposition + selected state to a color for the region overlay.
 */
function getSegmentColor(segment: TimelineSegment, selectedSegmentId: string | null): string {
  const isSelected = segment.id === selectedSegmentId;

  if (segment.disposition === 'remove') {
    return isSelected ? 'rgba(251, 113, 133, 0.55)' : 'rgba(251, 113, 133, 0.28)';
  }

  return isSelected ? 'rgba(16, 185, 129, 0.55)' : 'rgba(16, 185, 129, 0.22)';
}

/**
 * Renders segment markers over a track row.
 * Uses absolute positioning relative to the container width.
 */
function SegmentOverlay({
  segments,
  selectedSegmentId,
  duration,
  onSelectSegment,
  onSeek,
}: {
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  duration: number;
  onSelectSegment: (id: string) => void;
  onSeek: (time: number) => void;
}) {
  if (duration <= 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {segments.map((segment) => {
        const left = (segment.start / duration) * 100;
        const width = ((segment.end - segment.start) / duration) * 100;

        return (
          <div
            key={segment.id}
            className="absolute top-0 bottom-0 pointer-events-auto cursor-pointer border-l border-r transition-colors"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              backgroundColor: getSegmentColor(segment, selectedSegmentId),
              borderColor: segment.id === selectedSegmentId
                ? (segment.disposition === 'remove' ? 'rgba(251,113,133,0.9)' : 'rgba(16,185,129,0.9)')
                : 'transparent',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSegment(segment.id);
              onSeek(segment.start);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSegment(segment.id);
                onSeek(segment.start);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Segmento ${formatTime(segment.start)} - ${formatTime(segment.end)}, ${segment.disposition}`}
          />
        );
      })}
    </div>
  );
}

/**
 * Renders a playhead cursor over a track row.
 */
function PlayheadCursor({
  playheadTime,
  duration,
}: {
  playheadTime: number;
  duration: number;
}) {
  if (duration <= 0) return null;

  const left = (playheadTime / duration) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
      style={{ left: `${left}%` }}
      aria-hidden="true"
    >
      {/* Top triangle handle */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-red-500" />
    </div>
  );
}

/**
 * Trim range overlay.
 */
function TrimOverlay({
  trimStart,
  trimEnd,
  duration,
}: {
  trimStart: number | null;
  trimEnd: number | null;
  duration: number;
}) {
  if (trimStart === null || trimEnd === null || duration <= 0) return null;

  const left = (trimStart / duration) * 100;
  const width = ((trimEnd - trimStart) / duration) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-5"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: 'rgba(59, 130, 246, 0.22)',
        borderLeft: '2px solid rgba(59,130,246,0.8)',
        borderRight: '2px solid rgba(59,130,246,0.8)',
      }}
      aria-hidden="true"
    >
      <div className="absolute top-1 left-1 text-[9px] font-bold text-blue-300 pointer-events-none select-none">
        TRIM
      </div>
    </div>
  );
}

/**
 * A single track row in the timeline.
 */
function TrackRow({
  track,
  segments,
  selectedSegmentId,
  duration,
  playheadTime,
  trimStart,
  trimEnd,
  onSeek,
  onSelectSegment,
}: {
  track: MediaTrack;
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  duration: number;
  playheadTime: number;
  trimStart: number | null;
  trimEnd: number | null;
  onSeek: (time: number) => void;
  onSelectSegment: (id: string) => void;
}) {
  const isVideo = track.kind === 'video';

  return (
    <div className="flex items-stretch gap-3">
      {/* Track label column */}
      <div className="flex w-32 flex-shrink-0 flex-col items-start justify-center gap-1 rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-slate-700/50">
        <div className="flex items-center gap-1.5">
          {isVideo ? (
            <Film className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
          ) : (
            <Music2 className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
          )}
          <span className={`text-xs font-semibold uppercase tracking-wide ${isVideo ? 'text-brand-400' : 'text-purple-400'}`}>
            {isVideo ? 'Video' : 'Audio'}
          </span>
        </div>
        <span className="max-w-full truncate text-[10px] text-slate-400" title={track.label}>
          {track.label}
        </span>
        <div className="mt-1 flex items-center gap-1">
          {track.muted ? (
            <span className="inline-flex items-center gap-1 rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
              <VolumeX className="h-2.5 w-2.5" />
              Muted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-slate-700/50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
              <Volume2 className="h-2.5 w-2.5" />
              Audio on
            </span>
          )}
        </div>
      </div>

      {/* Track content area */}
      <div className="relative flex-1 min-w-0">
        {isVideo ? (
          <VideoThumbnailStrip
            sourceUrl={track.sourceUrl}
            duration={track.duration}
            height={72}
          />
        ) : (
          <AudioWaveformTrack
            sourceUrl={track.sourceUrl}
            duration={track.duration}
            playheadTime={playheadTime}
            height={72}
            onSeek={onSeek}
          />
        )}

        {/* Segment overlay on top of the visual */}
        <div className="absolute inset-0">
          <SegmentOverlay
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            duration={duration}
            onSelectSegment={onSelectSegment}
            onSeek={onSeek}
          />
          <TrimOverlay
            trimStart={trimStart}
            trimEnd={trimEnd}
            duration={duration}
          />
          <PlayheadCursor
            playheadTime={playheadTime}
            duration={duration}
          />
        </div>
      </div>
    </div>
  );
}

export function TimelinePanel({
  mediaElement,
  tracks,
  segments,
  selectedSegmentId,
  duration,
  playheadTime,
  trimStart,
  trimEnd,
  onSeek,
  onCutAtPlayhead,
  onSelectSegment,
  onSetTrimStart: _onSetTrimStart,
  onSetTrimEnd: _onSetTrimEnd,
}: TimelinePanelProps) {
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const keepCount = useMemo(() => segments.filter((s) => s.disposition === 'keep').length, [segments]);
  const removeCount = useMemo(() => segments.filter((s) => s.disposition === 'remove').length, [segments]);
  const hasTracks = tracks.length > 0;

  // Timecode ruler click -> seek
  function handleRulerClick(event: React.MouseEvent<HTMLDivElement>) {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  }

  // Sync mediaElement muted state based on track model
  useEffect(() => {
    if (!mediaElement) return;
    const videoTrack = tracks.find((t) => t.kind === 'video');
    if (videoTrack) {
      mediaElement.muted = videoTrack.muted;
    }
  }, [mediaElement, tracks]);

  // Generate timecode ruler marks
  const rulerMarks = useMemo(() => {
    if (duration <= 0) return [];
    const step = duration <= 30 ? 5 : duration <= 120 ? 10 : duration <= 600 ? 30 : 60;
    const marks: number[] = [];
    for (let t = 0; t <= duration; t += step) {
      marks.push(t);
    }
    return marks;
  }, [duration]);

  // Sync WaveSurfer was here before - now removed. The VideoPlayer controls playback
  // and AudioWaveformTrack only visualizes. We keep the seek sync via onSeek prop.

  return (
    <section className="rounded-3xl border border-white/50 bg-gradient-to-br from-white/90 via-white/75 to-white/85 p-5 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-slate-700/50 dark:from-slate-800/95 dark:via-slate-800/80 dark:to-slate-800/90">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Layers className="h-5 w-5 text-brand-600 dark:text-brand-500" aria-hidden="true" />
            Linea de tiempo
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {hasTracks ? (
              <>
                Cabezal: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatTime(playheadTime)}</span> /{' '}
                {formatTime(duration)}
                {' · '}
                <span className="text-slate-500 dark:text-slate-500">{tracks.length} {tracks.length === 1 ? 'pista' : 'pistas'}</span>
              </>
            ) : (
              'Esperando video para generar timeline'
            )}
          </p>
        </div>
        <Button onClick={onCutAtPlayhead} disabled={duration <= 0} size="sm">
          <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
          Cortar en cabezal
        </Button>
      </div>

      {hasTracks ? (
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 shadow-inner dark:border-slate-700/50 dark:from-slate-900 dark:to-slate-900/80">
          {/* Timecode ruler */}
          <div
            ref={scrubberRef}
            className="ml-[140px] cursor-pointer relative h-5 select-none"
            onClick={handleRulerClick}
            role="slider"
            aria-label="Timecode ruler - click to seek"
            aria-valuenow={playheadTime}
            aria-valuemin={0}
            aria-valuemax={duration}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') onSeek(Math.max(0, playheadTime - 1));
              if (e.key === 'ArrowRight') onSeek(Math.min(duration, playheadTime + 1));
            }}
          >
            <div className="absolute inset-0 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            {rulerMarks.map((t) => (
              <div
                key={`mark-${t}`}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${(t / duration) * 100}%` }}
              >
                <div className="h-2.5 w-px bg-slate-400 dark:bg-slate-600" />
                <span className="text-[9px] text-slate-500 dark:text-slate-500 -translate-x-1/2 mt-px">{formatTime(t)}</span>
              </div>
            ))}
            {/* Playhead indicator on ruler */}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: `${(playheadTime / duration) * 100}%` }}
              />
            )}
          </div>

          {/* Track rows */}
          <div className="space-y-2">
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                segments={segments}
                selectedSegmentId={selectedSegmentId}
                duration={duration}
                playheadTime={playheadTime}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onSeek={onSeek}
                onSelectSegment={onSelectSegment}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-300/70 bg-slate-50/50 p-8 text-center backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/30">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50">
            <Activity className="h-12 w-12 text-slate-400 dark:text-slate-600" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-slate-700 dark:text-slate-300">
              Timeline no disponible
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Carga un video para generar las pistas de video y audio en el timeline
            </p>
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200/50 dark:bg-emerald-950/30 dark:ring-emerald-900/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{keepCount}</span>
          </div>
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Segmentos a conservar</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200/50 dark:bg-rose-950/30 dark:ring-rose-900/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
            <span className="text-sm font-bold text-rose-700 dark:text-rose-400">{removeCount}</span>
          </div>
          <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Segmentos a eliminar</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 ring-1 ring-slate-200/50 dark:bg-slate-800/50 dark:ring-slate-700/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700/50">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{segments.length}</span>
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total de segmentos</span>
        </div>
      </div>
    </section>
  );
}
