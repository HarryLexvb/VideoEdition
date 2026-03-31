import { useEffect, useMemo, useRef } from 'react';

import { Scissors } from 'lucide-react';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import WaveSurfer from 'wavesurfer.js';

import { Button } from '../../../shared/components/Button';
import { formatTime } from '../../../shared/lib/formatTime';
import type { TimelineSegment } from '../model/types';

interface TimelinePanelProps {
  mediaElement: HTMLVideoElement | null;
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  duration: number;
  playheadTime: number;
  onSeek: (time: number) => void;
  onCutAtPlayhead: () => void;
  onSelectSegment: (segmentId: string) => void;
}

function getRegionColor(segment: TimelineSegment, selectedSegmentId: string | null): string {
  const isSelected = segment.id === selectedSegmentId;

  if (segment.disposition === 'remove') {
    return isSelected ? 'rgba(251, 113, 133, 0.45)' : 'rgba(251, 113, 133, 0.25)';
  }

  return isSelected ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.22)';
}

export function TimelinePanel({
  mediaElement,
  segments,
  selectedSegmentId,
  duration,
  playheadTime,
  onSeek,
  onCutAtPlayhead,
  onSelectSegment,
}: TimelinePanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);

  const keepCount = useMemo(() => segments.filter((segment) => segment.disposition === 'keep').length, [segments]);
  const removeCount = useMemo(() => segments.filter((segment) => segment.disposition === 'remove').length, [segments]);

  useEffect(() => {
    if (!containerRef.current || !mediaElement) {
      return;
    }

    const regionsPlugin = RegionsPlugin.create();
    const waveSurfer = WaveSurfer.create({
      container: containerRef.current,
      media: mediaElement,
      height: 132,
      waveColor: '#8fa2bf',
      progressColor: '#0f172a',
      cursorColor: '#ef4444',
      barWidth: 2,
      barRadius: 3,
      barGap: 1,
      minPxPerSec: 65,
      normalize: true,
      dragToSeek: true,
      plugins: [regionsPlugin],
    });

    waveSurferRef.current = waveSurfer;
    regionsPluginRef.current = regionsPlugin;

    waveSurfer.on('interaction', (newTime: number) => {
      onSeek(newTime);
    });

    regionsPlugin.on('region-clicked', (region: { id: string; start: number }, event: MouseEvent) => {
      event.stopPropagation();
      onSelectSegment(region.id);
      onSeek(region.start);
    });

    return () => {
      waveSurfer.destroy();
      waveSurferRef.current = null;
      regionsPluginRef.current = null;
    };
  }, [mediaElement, onSeek, onSelectSegment]);

  useEffect(() => {
    const regionsPlugin = regionsPluginRef.current;
    if (!regionsPlugin) {
      return;
    }

    for (const region of regionsPlugin.getRegions()) {
      region.remove();
    }

    for (const segment of segments) {
      regionsPlugin.addRegion({
        id: segment.id,
        start: segment.start,
        end: segment.end,
        color: getRegionColor(segment, selectedSegmentId),
        resize: false,
        drag: false,
      });
    }
  }, [segments, selectedSegmentId]);

  useEffect(() => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer || duration <= 0) {
      return;
    }

    if (Math.abs(waveSurfer.getCurrentTime() - playheadTime) > 0.18) {
      waveSurfer.setTime(playheadTime);
    }
  }, [duration, playheadTime]);

  return (
    <section className="rounded-3xl border border-white/50 bg-white/75 p-4 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">Linea de tiempo</h2>
          <p className="text-sm text-slate-600">
            Cabezal: {formatTime(playheadTime)} / {formatTime(duration)}
          </p>
        </div>
        <Button onClick={onCutAtPlayhead} disabled={duration <= 0}>
          <Scissors className="h-4 w-4" aria-hidden="true" />
          Cortar en cabezal
        </Button>
      </div>

      {mediaElement ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div ref={containerRef} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Carga un video para generar waveform y editar segmentos con precision temporal.
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Segmentos a conservar: {keepCount}</div>
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Segmentos a eliminar: {removeCount}</div>
        <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">Total de segmentos: {segments.length}</div>
      </div>
    </section>
  );
}
