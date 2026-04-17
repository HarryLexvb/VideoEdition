import { useEffect, useMemo, useRef, useState } from 'react';

import { Activity, AudioLines, Camera, Check, ChevronDown, Film, Layers, Music2, Scissors, Volume2, VolumeX } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { formatTime } from '../../../shared/lib/formatTime';
import type { MediaTrack, TimelineSegment } from '../model/types';
import { AudioWaveformTrack } from './AudioWaveformTrack';
import { VideoThumbnailStrip } from './VideoThumbnailStrip';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

interface TimelinePanelProps {
  mediaElement: HTMLVideoElement | null;
  tracks: MediaTrack[];
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  selectedTrackIds: string[];
  duration: number;
  playheadTime: number;
  trimStart: number | null;
  trimEnd: number | null;
  onSeek: (time: number) => void;
  onCutAtPlayhead: () => void;
  onSelectSegment: (segmentId: string) => void;
  onSetTrimStart: (time: number) => void;
  onSetTrimEnd: (time: number) => void;
  onToggleTrackMute: (trackId: string) => void;
  onSelectTrack: (trackId: string, multi: boolean) => void;
  // Custom extraction props
  customExtractionActive?: boolean;
  validCustomRanges?: Array<{ id: string; start: number; end: number }>;
  onCustomRangeCreate?: (range: { start: number; end: number }) => void;
  // Audio editing toolbar props
  extractingAudio?: boolean;
  audioExtracted?: boolean;
  onExtractAudio?: () => void;
  onCustomExtraction?: () => void;
  onCapture?: () => void;
}

/** Validated numeric range (for overlay rendering) */
interface NumericRange {
  id: string;
  start: number;
  end: number;
}

/** Draft range during mouse drag */
interface DraftRange {
  start: number;
  end: number;
}

// ────────────────────────────────────────────────────────────────────
// Segment disposition overlay
// ────────────────────────────────────────────────────────────────────

function getSegmentColor(segment: TimelineSegment, selectedSegmentId: string | null): string {
  const isSelected = segment.id === selectedSegmentId;
  if (segment.disposition === 'remove') {
    return isSelected ? 'rgba(251, 113, 133, 0.55)' : 'rgba(251, 113, 133, 0.28)';
  }
  return isSelected ? 'rgba(16, 185, 129, 0.55)' : 'rgba(16, 185, 129, 0.22)';
}

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
              borderColor:
                segment.id === selectedSegmentId
                  ? segment.disposition === 'remove'
                    ? 'rgba(251,113,133,0.9)'
                    : 'rgba(16,185,129,0.9)'
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

// ────────────────────────────────────────────────────────────────────
// Playhead cursor
// ────────────────────────────────────────────────────────────────────

function PlayheadCursor({ playheadTime, duration }: { playheadTime: number; duration: number }) {
  if (duration <= 0) return null;
  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
      style={{ left: `${(playheadTime / duration) * 100}%` }}
      aria-hidden="true"
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-red-500" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Trim range overlay
// ────────────────────────────────────────────────────────────────────

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
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-5"
      style={{
        left: `${(trimStart / duration) * 100}%`,
        width: `${((trimEnd - trimStart) / duration) * 100}%`,
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

// ────────────────────────────────────────────────────────────────────
// Custom extraction range overlay (amber / orange)
// ────────────────────────────────────────────────────────────────────

function CustomRangeOverlay({
  ranges,
  draftRange,
  duration,
}: {
  ranges: NumericRange[];
  draftRange: DraftRange | null;
  duration: number;
}) {
  if (duration <= 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 8 }}>
      {ranges.map((r) => (
        <div
          key={r.id}
          className="absolute top-0 bottom-0"
          style={{
            left: `${(r.start / duration) * 100}%`,
            width: `${((r.end - r.start) / duration) * 100}%`,
            backgroundColor: 'rgba(245, 158, 11, 0.32)',
            borderLeft: '2px solid rgba(245, 158, 11, 0.85)',
            borderRight: '2px solid rgba(245, 158, 11, 0.85)',
          }}
        >
          <div className="absolute top-1 left-1 text-[8px] font-bold text-amber-600 dark:text-amber-400 select-none">
            ▶
          </div>
        </div>
      ))}
      {draftRange && draftRange.end > draftRange.start && (
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${(draftRange.start / duration) * 100}%`,
            width: `${((draftRange.end - draftRange.start) / duration) * 100}%`,
            backgroundColor: 'rgba(245, 158, 11, 0.18)',
            borderLeft: '2px dashed rgba(245, 158, 11, 0.7)',
            borderRight: '2px dashed rgba(245, 158, 11, 0.7)',
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Track row
// ────────────────────────────────────────────────────────────────────

function TrackRow({
  track,
  isSelected,
  segments,
  selectedSegmentId,
  duration,
  playheadTime,
  trimStart,
  trimEnd,
  customRanges,
  draftRange,
  onSeek,
  onSelectSegment,
  onToggleMute,
  onSelectTrack,
}: {
  track: MediaTrack;
  isSelected: boolean;
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  duration: number;
  playheadTime: number;
  trimStart: number | null;
  trimEnd: number | null;
  customRanges: NumericRange[];
  draftRange: DraftRange | null;
  onSeek: (time: number) => void;
  onSelectSegment: (id: string) => void;
  onToggleMute: (trackId: string) => void;
  onSelectTrack: (trackId: string, multi: boolean) => void;
}) {
  const isVideo = track.kind === 'video';

  return (
    <div className="flex items-stretch gap-3">
      {/* Track label column */}
      <div
        className={`flex w-36 flex-shrink-0 flex-col items-start justify-center gap-1 rounded-lg px-3 py-2 ring-1 transition-all cursor-pointer select-none
          ${isSelected
            ? 'bg-slate-700/80 ring-brand-500/70 shadow-[0_0_0_2px_rgba(99,102,241,0.35)]'
            : 'bg-slate-800/60 ring-slate-700/50'
          }`}
        onClick={(e) => onSelectTrack(track.id, e.ctrlKey || e.metaKey)}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`Pista ${isVideo ? 'Video' : 'Audio'}: ${track.label}${isSelected ? ' (seleccionada)' : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTrack(track.id, e.ctrlKey || e.metaKey);
          }
        }}
      >
        <div className="flex w-full items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {isVideo ? (
              <Film className="h-3.5 w-3.5 flex-shrink-0 text-brand-400" aria-hidden="true" />
            ) : (
              <Music2 className="h-3.5 w-3.5 flex-shrink-0 text-purple-400" aria-hidden="true" />
            )}
            <span className={`text-xs font-semibold uppercase tracking-wide ${isVideo ? 'text-brand-400' : 'text-purple-400'}`}>
              {isVideo ? 'Video' : 'Audio'}
            </span>
          </div>
          <button
            type="button"
            className={`flex-shrink-0 rounded p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-400
              ${track.muted
                ? 'text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-600/40'
              }`}
            onClick={(e) => { e.stopPropagation(); onToggleMute(track.id); }}
            aria-label={track.muted ? 'Activar audio' : 'Silenciar'}
            title={track.muted ? 'Activar audio' : 'Silenciar'}
          >
            {track.muted ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
        <span className="max-w-full truncate text-[10px] text-slate-400" title={track.label}>
          {track.label}
        </span>
        {track.muted && (
          <span className="inline-flex items-center gap-1 rounded bg-rose-950/50 px-1.5 py-0.5 text-[9px] font-medium text-rose-400">
            <VolumeX className="h-2.5 w-2.5" />
            Silenciado
          </span>
        )}
      </div>

      {/* Track content area */}
      <div
        className="relative flex-1 min-w-0 cursor-pointer"
        onClick={(e) => onSelectTrack(track.id, e.ctrlKey || e.metaKey)}
        role="presentation"
      >
        {isVideo ? (
          <VideoThumbnailStrip sourceUrl={track.sourceUrl} duration={track.duration} height={72} />
        ) : (
          <AudioWaveformTrack
            sourceUrl={track.sourceUrl}
            duration={track.duration}
            playheadTime={playheadTime}
            height={72}
            muted={track.muted}
            onSeek={onSeek}
          />
        )}

        {isSelected && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-brand-500/60 pointer-events-none" aria-hidden="true" />
        )}

        {/* Overlays stacked in order: segments → trim → custom ranges → playhead */}
        <div className="absolute inset-0">
          <SegmentOverlay
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            duration={duration}
            onSelectSegment={onSelectSegment}
            onSeek={onSeek}
          />
          <TrimOverlay trimStart={trimStart} trimEnd={trimEnd} duration={duration} />
          <CustomRangeOverlay ranges={customRanges} draftRange={draftRange} duration={duration} />
          <PlayheadCursor playheadTime={playheadTime} duration={duration} />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Main TimelinePanel
// ────────────────────────────────────────────────────────────────────

/**
 * Width (px) of the track label column.
 * Must match `w-36` (9rem = 144px) + `gap-3` (0.75rem = 12px) = 156px.
 */
const LABEL_OFFSET_PX = 156;

/** Minimum drag distance (seconds) required to register a range */
const MIN_RANGE_DURATION_S = 0.4;

export function TimelinePanel({
  mediaElement,
  tracks,
  segments,
  selectedSegmentId,
  selectedTrackIds,
  duration,
  playheadTime,
  trimStart,
  trimEnd,
  onSeek,
  onCutAtPlayhead,
  onSelectSegment,
  onSetTrimStart: _onSetTrimStart,
  onSetTrimEnd: _onSetTrimEnd,
  onToggleTrackMute,
  onSelectTrack,
  customExtractionActive = false,
  validCustomRanges = [],
  onCustomRangeCreate,
  extractingAudio = false,
  audioExtracted = false,
  onExtractAudio,
  onCustomExtraction,
  onCapture,
}: TimelinePanelProps) {
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const tracksContainerRef = useRef<HTMLDivElement | null>(null);
  const cutMenuRef = useRef<HTMLDivElement | null>(null);
  // Local drag state (ref avoids re-renders during drag)
  const dragRef = useRef<{ startTime: number } | null>(null);
  // Draft range for live visual feedback during drag
  const [draftRange, setDraftRange] = useState<DraftRange | null>(null);
  // Unified cut mode menu
  const [cutMenuOpen, setCutMenuOpen] = useState(false);
  const [isPlayheadModeEnabled, setIsPlayheadModeEnabled] = useState(false);

  const keepCount = useMemo(() => segments.filter((s) => s.disposition === 'keep').length, [segments]);
  const removeCount = useMemo(() => segments.filter((s) => s.disposition === 'remove').length, [segments]);
  const hasTracks = tracks.length > 0;

  // ── Sync media element muted state ──────────────────────────────
  useEffect(() => {
    if (!mediaElement) return;
    const videoTrack = tracks.find((t) => t.kind === 'video');
    if (videoTrack) mediaElement.muted = videoTrack.muted;
  }, [mediaElement, tracks]);

  // ── Close cut dropdown on outside click ─────────────────────────
  useEffect(() => {
    if (!cutMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (cutMenuRef.current && !cutMenuRef.current.contains(e.target as Node)) {
        setCutMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [cutMenuOpen]);

  useEffect(() => {
    if (customExtractionActive) {
      setIsPlayheadModeEnabled(false);
    }
  }, [customExtractionActive]);

  // ── Cancel drag on global mouseup (e.g. mouse released outside) ─
  useEffect(() => {
    if (!customExtractionActive) return;

    function onWindowMouseUp(e: MouseEvent) {
      if (e.button !== 2 || !dragRef.current) return;
      dragRef.current = null;
      setDraftRange(null);
    }

    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [customExtractionActive]);

  // ── Ruler click → seek ──────────────────────────────────────────
  function handleRulerClick(event: React.MouseEvent<HTMLDivElement>) {
    if (duration <= 0 || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(ratio * duration, duration)));
  }

  // ── Compute time from a mouse event on the tracks container ─────
  function getTimeFromTracksEvent(e: React.MouseEvent<HTMLDivElement>): number | null {
    const container = tracksContainerRef.current;
    if (!container || duration <= 0) return null;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - LABEL_OFFSET_PX;
    const contentWidth = rect.width - LABEL_OFFSET_PX;
    if (contentWidth <= 0) return null;
    return Math.max(0, Math.min((x / contentWidth) * duration, duration));
  }

  // ── Drag handlers (right-click = button 2) ──────────────────────
  function handleTracksMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!customExtractionActive || e.button !== 2 || duration <= 0) return;
    e.preventDefault(); // suppress context menu
    const time = getTimeFromTracksEvent(e);
    if (time === null) return;
    dragRef.current = { startTime: time };
    setDraftRange({ start: time, end: time });
  }

  function handleTracksMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!customExtractionActive || !dragRef.current) return;
    const time = getTimeFromTracksEvent(e);
    if (time === null) return;
    const s = Math.min(dragRef.current.startTime, time);
    const en = Math.max(dragRef.current.startTime, time);
    setDraftRange({ start: s, end: en });
  }

  function handleTracksMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!customExtractionActive || e.button !== 2 || !dragRef.current) return;
    e.preventDefault();
    const time = getTimeFromTracksEvent(e) ?? dragRef.current.startTime;
    const start = Math.min(dragRef.current.startTime, time);
    const end = Math.max(dragRef.current.startTime, time);
    dragRef.current = null;
    setDraftRange(null);

    if (end - start >= MIN_RANGE_DURATION_S) {
      onCustomRangeCreate?.({
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
      });
    }
  }

  function handleTracksContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    if (customExtractionActive) e.preventDefault();
  }

  // ── Ruler marks ─────────────────────────────────────────────────
  const rulerMarks = useMemo(() => {
    if (duration <= 0) return [];
    const step = duration <= 30 ? 5 : duration <= 120 ? 10 : duration <= 600 ? 30 : 60;
    const marks: number[] = [];
    for (let t = 0; t <= duration; t += step) marks.push(t);
    return marks;
  }, [duration]);

  return (
    <section className="rounded-3xl border border-white/50 bg-gradient-to-br from-white/90 via-white/75 to-white/85 p-5 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-slate-700/50 dark:from-slate-800/95 dark:via-slate-800/80 dark:to-slate-800/90">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Layers className="h-5 w-5 text-brand-600 dark:text-brand-500" aria-hidden="true" />
            Linea de tiempo
            {customExtractionActive && (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Extraccion activa
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {hasTracks ? (
              <>
                Cabezal:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatTime(playheadTime)}</span>{' '}
                / {formatTime(duration)}
                {' · '}
                <span className="text-slate-500 dark:text-slate-500">
                  {tracks.length} {tracks.length === 1 ? 'pista' : 'pistas'}
                </span>
                {customExtractionActive && validCustomRanges.length > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {validCustomRanges.length} rango{validCustomRanges.length !== 1 ? 's' : ''} seleccionado{validCustomRanges.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </>
            ) : (
              'Esperando video para generar timeline'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 shadow-inner ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:ring-slate-700/50">
            {/* ── Unified cut mode selector ── */}
            <div className="relative" ref={cutMenuRef}>
              <Button
                size="sm"
                variant={customExtractionActive ? 'amber' : 'primary'}
                onClick={() => setCutMenuOpen((o) => !o)}
                disabled={duration <= 0 || extractingAudio}
                aria-haspopup="listbox"
                aria-expanded={cutMenuOpen}
              >
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                2. Cortar
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-150 ${cutMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </Button>

              {cutMenuOpen && (
                <div
                  role="listbox"
                  aria-label="Modo de corte"
                  className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/5"
                >
                  <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    Selecciona un modo
                  </p>

                  {/* Option 1 — Cortar en cabezal */}
                  <button
                    role="option"
                    aria-selected={isPlayheadModeEnabled && !customExtractionActive}
                    type="button"
                    className="group flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:hover:bg-brand-950/40"
                    onClick={() => {
                      if (customExtractionActive) onCustomExtraction?.();
                      setIsPlayheadModeEnabled(true);
                      setCutMenuOpen(false);
                    }}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${(isPlayheadModeEnabled && !customExtractionActive) ? 'border-brand-600 bg-brand-600 dark:border-brand-400 dark:bg-brand-400' : 'border-slate-300 bg-white group-hover:border-brand-400 dark:border-slate-600 dark:bg-slate-800'}`}>
                      {(isPlayheadModeEnabled && !customExtractionActive) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Cortar en cabezal
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        Divide el video en la posición exacta del cabezal de reproducción.
                      </span>
                    </div>
                  </button>

                  <div className="mx-4 border-t border-slate-100 dark:border-slate-700" />

                  {/* Option 2 — Extraccion personalizada */}
                  <button
                    role="option"
                    aria-selected={customExtractionActive}
                    type="button"
                    className="group flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 dark:hover:bg-amber-950/30"
                    onClick={() => {
                      if (!customExtractionActive) onCustomExtraction?.();
                      setIsPlayheadModeEnabled(false);
                      setCutMenuOpen(false);
                    }}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${customExtractionActive ? 'border-amber-500 bg-amber-500 dark:border-amber-400 dark:bg-amber-400' : 'border-slate-300 bg-white group-hover:border-amber-400 dark:border-slate-600 dark:bg-slate-800'}`}>
                      {customExtractionActive && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Extraccion personalizada
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        Define rangos de tiempo específicos arrastrando en el timeline o ingresándolos manualmente.
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {isPlayheadModeEnabled && !customExtractionActive && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onCutAtPlayhead}
                disabled={duration <= 0 || extractingAudio}
                title="Ejecutar corte en la posicion actual del cabezal"
              >
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                Cortar ahora
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={onCapture}
              disabled={duration <= 0 || !selectedSegmentId}
              title={!selectedSegmentId ? 'Selecciona un segmento para asociar la captura' : 'Capturar fotograma actual'}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              3. Captura
            </Button>
            <div className="mx-0.5 h-5 w-px bg-slate-300/70 dark:bg-slate-600/70" aria-hidden="true" />
            <Button
              size="sm"
              variant="secondary"
              onClick={onExtractAudio}
              loading={extractingAudio}
              disabled={duration <= 0 || extractingAudio || audioExtracted}
            >
              <AudioLines className="h-3.5 w-3.5" aria-hidden="true" />
              {audioExtracted ? '4. Audio extraido' : '4. Extraer audio'}
            </Button>
          </div>
        </div>

      </div>

      {/* ── Mode context card — full-width, outside header row ── */}
      {customExtractionActive ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3.5 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="mt-0.5 shrink-0 rounded-lg bg-amber-100 p-1.5 dark:bg-amber-900/40">
            <Scissors className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Extraccion personalizada activa</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-700/90 dark:text-amber-400">
              Arrastra con <strong>clic derecho</strong> en el timeline para marcar rangos, o ingrésalos manualmente en el panel inferior. Solo se extraeran los segmentos seleccionados.
            </p>
          </div>
        </div>
      ) : isPlayheadModeEnabled ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand-200/70 bg-brand-50/80 px-4 py-3.5 dark:border-brand-800/40 dark:bg-brand-950/20">
          <div className="mt-0.5 shrink-0 rounded-lg bg-brand-100 p-1.5 dark:bg-brand-900/40">
            <Scissors className="h-4 w-4 text-brand-700 dark:text-brand-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-300">Modo: Cortar en cabezal</p>
            <p className="mt-0.5 text-xs leading-relaxed text-brand-700/90 dark:text-brand-400">
              Posiciona el cabezal en el punto deseado y presiona <strong>Cortar ahora</strong> para dividir el video. Cada corte crea segmentos que puedes marcar como conservar o eliminar.
            </p>
          </div>
        </div>
      ) : null}

      {hasTracks ? (
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 shadow-inner dark:border-slate-700/50 dark:from-slate-900 dark:to-slate-900/80">
          {/* Timecode ruler */}
          <div
            ref={scrubberRef}
            className="ml-[140px] cursor-pointer relative h-5 select-none"
            onClick={handleRulerClick}
            role="slider"
            aria-label="Timecode ruler - click para buscar"
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
                <span className="text-[9px] text-slate-500 dark:text-slate-500 -translate-x-1/2 mt-px">
                  {formatTime(t)}
                </span>
              </div>
            ))}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: `${(playheadTime / duration) * 100}%` }}
              />
            )}
          </div>

          {/* Track rows — right-click drag handled here */}
          <div
            ref={tracksContainerRef}
            className="relative space-y-2"
            onMouseDown={handleTracksMouseDown}
            onMouseMove={handleTracksMouseMove}
            onMouseUp={handleTracksMouseUp}
            onContextMenu={handleTracksContextMenu}
          >
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                isSelected={selectedTrackIds.includes(track.id)}
                segments={segments}
                selectedSegmentId={selectedSegmentId}
                duration={duration}
                playheadTime={playheadTime}
                trimStart={trimStart}
                trimEnd={trimEnd}
                customRanges={validCustomRanges}
                draftRange={draftRange}
                onSeek={onSeek}
                onSelectSegment={onSelectSegment}
                onToggleMute={onToggleTrackMute}
                onSelectTrack={onSelectTrack}
              />
            ))}

            {/* Custom extraction drag hint overlay (visual only, non-blocking) */}
            {customExtractionActive && hasTracks && (
              <div
                className="pointer-events-none absolute inset-y-0 rounded-r-lg"
                style={{
                  left: LABEL_OFFSET_PX,
                  right: 0,
                  border: '1.5px dashed rgba(245,158,11,0.35)',
                  borderLeft: 'none',
                }}
                aria-hidden="true"
              />
            )}
          </div>

          {tracks.length > 1 && (
            <p className="ml-[152px] mt-1 text-[9px] text-slate-500 dark:text-slate-600 select-none">
              Ctrl+clic para seleccionar multiples pistas
            </p>
          )}
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
