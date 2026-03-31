import { useEffect, useMemo, useRef } from 'react';

import { Layers, Scissors, Activity } from 'lucide-react';
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
    return isSelected ? 'rgba(251, 113, 133, 0.5)' : 'rgba(251, 113, 133, 0.3)';
  }

  return isSelected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.28)';
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
      console.log('[TimelinePanel] Esperando containerRef y mediaElement');
      console.log('[TimelinePanel] containerRef:', !!containerRef.current, 'mediaElement:', !!mediaElement);
      return;
    }

    console.log('[TimelinePanel] ✓ Inicializando WaveSurfer');
    console.log('[TimelinePanel] MediaElement readyState:', mediaElement.readyState);
    console.log('[TimelinePanel] MediaElement duration:', mediaElement.duration);

    const regionsPlugin = RegionsPlugin.create();
    const waveSurfer = WaveSurfer.create({
      container: containerRef.current,
      media: mediaElement,
      height: 140,
      waveColor: 'rgba(148, 163, 184, 0.8)',
      progressColor: 'rgba(14, 165, 233, 0.9)',
      cursorColor: '#ef4444',
      cursorWidth: 2,
      barWidth: 2,
      barRadius: 3,
      barGap: 1.5,
      minPxPerSec: 80,
      normalize: true,
      dragToSeek: true,
      plugins: [regionsPlugin],
    });

    waveSurferRef.current = waveSurfer;
    regionsPluginRef.current = regionsPlugin;

    console.log('[TimelinePanel] ✓ WaveSurfer creado exitosamente');

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
    <section className="rounded-3xl border border-white/50 bg-gradient-to-br from-white/90 via-white/75 to-white/85 p-5 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-slate-700/50 dark:from-slate-800/95 dark:via-slate-800/80 dark:to-slate-800/90">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Layers className="h-5 w-5 text-brand-600 dark:text-brand-500" aria-hidden="true" />
            Linea de tiempo
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {mediaElement ? (
              <>
                Cabezal: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatTime(playheadTime)}</span> /{' '}
                {formatTime(duration)}
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

      {mediaElement ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 shadow-inner dark:border-slate-700/50 dark:from-slate-900 dark:to-slate-900/80">
          <div ref={containerRef} className="rounded-lg" />
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
              Carga un video para generar waveform y editar segmentos con precision temporal
            </p>
          </div>
        </div>
      )}

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
