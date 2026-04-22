import { Scissors, Trash2, Play } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { formatTime } from '../../../shared/lib/formatTime';

interface TrimControlsProps {
  trimStart: number | null;
  trimEnd: number | null;
  playheadTime: number;
  duration: number;
  onSetTrimStart: () => void;
  onSetTrimEnd: () => void;
  onClearTrimRange: () => void;
  onPlayTrimRange?: () => void;
}

export function TrimControls({
  trimStart,
  trimEnd,
  playheadTime,
  duration,
  onSetTrimStart,
  onSetTrimEnd,
  onClearTrimRange,
  onPlayTrimRange,
}: TrimControlsProps) {
  const hasTrimRange = trimStart !== null && trimEnd !== null;
  const trimDuration = hasTrimRange ? trimEnd - trimStart : 0;

  return (
    <section className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.8)] dark:border-slate-700/50 dark:bg-slate-800/80">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
        <Scissors className="h-5 w-5 text-blue-600 dark:text-blue-500" aria-hidden="true" />
        Recorte de Video
      </h2>

      <div className="space-y-3">
        {/* Información del rango */}
        <div className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <p>
            Inicio: <strong>{trimStart !== null ? formatTime(trimStart) : '--:--'}</strong>
          </p>
          <p>
            Fin: <strong>{trimEnd !== null ? formatTime(trimEnd) : '--:--'}</strong>
          </p>
          <p>
            Duración: <strong>{hasTrimRange ? formatTime(trimDuration) : '--:--'}</strong>
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Cabezal actual: {formatTime(playheadTime)}
          </p>
        </div>

        {/* Botones de control */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onSetTrimStart} disabled={duration <= 0}>
            Marcar Inicio
          </Button>
          <Button size="sm" onClick={onSetTrimEnd} disabled={duration <= 0}>
            Marcar Fin
          </Button>
          {hasTrimRange && (
            <>
              <Button size="sm" variant="secondary" onClick={onClearTrimRange}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Limpiar
              </Button>
              {onPlayTrimRange && (
                <Button size="sm" variant="secondary" onClick={onPlayTrimRange}>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Reproducir
                </Button>
              )}
            </>
          )}
        </div>

        {/* Ayuda */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          💡 Tip: Mueve el cabezal y marca inicio/fin, o arrastra los bordes del rango azul en el timeline.
        </p>
      </div>
    </section>
  );
}
