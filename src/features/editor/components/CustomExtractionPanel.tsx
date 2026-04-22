import { AlertCircle, MousePointerClick, Plus, Scissors, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../../shared/components/Button';
import { formatTime } from '../../../shared/lib/formatTime';

/** Rango con valores como strings para permitir edicion parcial en el formulario */
export interface CustomRange {
  id: string;
  start: string;
  end: string;
}

interface Props {
  videoDuration: number;
  ranges: CustomRange[];
  disabled?: boolean;
  onAddRange: () => void;
  onUpdateRange: (id: string, field: 'start' | 'end', value: string) => void;
  onRemoveRange: (id: string) => void;
  onExtract: (ranges: Array<{ start: number; end: number }>) => void;
  onClose: () => void;
}

export function CustomExtractionPanel({
  videoDuration,
  ranges,
  disabled,
  onAddRange,
  onUpdateRange,
  onRemoveRange,
  onExtract,
  onClose,
}: Props) {
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleFieldChange(id: string, field: 'start' | 'end', value: string) {
    setValidationError(null);
    onUpdateRange(id, field, value);
  }

  function handleExtract() {
    if (ranges.length === 0) {
      setValidationError('Agrega al menos un rango de tiempo.');
      return;
    }

    const parsed: Array<{ start: number; end: number }> = [];

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const label = `Rango ${i + 1}`;

      if (r.start.trim() === '' || r.end.trim() === '') {
        setValidationError(`${label}: completa los campos de inicio y fin.`);
        return;
      }

      const start = parseFloat(r.start);
      const end = parseFloat(r.end);

      if (isNaN(start) || isNaN(end)) {
        setValidationError(`${label}: los valores deben ser numeros validos.`);
        return;
      }

      if (start < 0) {
        setValidationError(`${label}: el inicio no puede ser negativo.`);
        return;
      }

      if (end > videoDuration) {
        setValidationError(
          `${label}: el fin (${end}s) supera la duracion del video (${videoDuration.toFixed(1)}s).`,
        );
        return;
      }

      if (start >= end) {
        setValidationError(
          `${label}: el inicio (${start}s) debe ser menor al fin (${end}s).`,
        );
        return;
      }

      parsed.push({ start, end });
    }

    // Ordenar por inicio y detectar solapamientos
    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const nxt = sorted[i + 1];
      if (cur.end > nxt.start) {
        setValidationError(
          `Rangos superpuestos: [${cur.start}s - ${cur.end}s] y [${nxt.start}s - ${nxt.end}s]. Ajusta para que no se solapen.`,
        );
        return;
      }
    }

    setValidationError(null);
    onExtract(sorted);
  }

  const validCount = ranges.filter((r) => {
    const s = parseFloat(r.start);
    const e = parseFloat(r.end);
    return !isNaN(s) && !isNaN(e) && e > s && s >= 0 && e <= videoDuration;
  }).length;

  return (
    <section
      className="rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 shadow-[0_8px_30px_-12px_rgba(217,119,6,0.3)] dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/20"
      aria-label="Panel de extraccion personalizada"
    >
      {/* Cabecera */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2 dark:bg-amber-900/40">
            <Scissors className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Extraccion personalizada — activa
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Duracion:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {formatTime(videoDuration)} ({videoDuration.toFixed(1)}s)
              </strong>
              {' · '}
              <span className="text-amber-600 dark:text-amber-400">{validCount}/{ranges.length} rangos validos</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-amber-200 p-1.5 text-amber-600 transition hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
          aria-label="Desactivar extraccion personalizada"
          title="Desactivar modo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Hint para arrastre en timeline */}
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-white/60 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
        <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Clic derecho + arrastrar</strong> directamente sobre el timeline para marcar un rango
          (los rangos aparecen en naranja). Tambien puedes ingresarlos manualmente abajo.
          Solo se extraeran los segmentos seleccionados; todo lo demas se ignora.
        </p>
      </div>

      {/* Lista de rangos */}
      <div className="space-y-2">
        {ranges.map((range, idx) => {
          const s = parseFloat(range.start);
          const e = parseFloat(range.end);
          const dur = !isNaN(s) && !isNaN(e) && e > s ? (e - s).toFixed(1) : null;

          return (
            <div
              key={range.id}
              className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-white/80 px-3 py-2 dark:border-amber-800/40 dark:bg-slate-800/60"
            >
              <span className="w-12 shrink-0 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                #{idx + 1}
              </span>

              <input
                type="number"
                min={0}
                max={videoDuration}
                step={0.1}
                placeholder="Inicio (s)"
                value={range.start}
                onChange={(e) => handleFieldChange(range.id, 'start', e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                aria-label={`Inicio del rango ${idx + 1}`}
              />

              <span className="shrink-0 text-xs font-bold text-amber-500" aria-hidden="true">→</span>

              <input
                type="number"
                min={0}
                max={videoDuration}
                step={0.1}
                placeholder="Fin (s)"
                value={range.end}
                onChange={(e) => handleFieldChange(range.id, 'end', e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                aria-label={`Fin del rango ${idx + 1}`}
              />

              {/* Preview de duración */}
              <span
                className={`w-12 shrink-0 text-right text-[10px] font-medium ${
                  dur ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'
                }`}
              >
                {dur ? `${dur}s` : '—'}
              </span>

              <button
                type="button"
                onClick={() => onRemoveRange(range.id)}
                disabled={ranges.length === 1}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                title="Eliminar este rango"
                aria-label={`Eliminar rango ${idx + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Error de validacion */}
      {validationError ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      ) : null}

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/60 pt-4 dark:border-amber-800/30">
        <Button variant="ghost" size="sm" onClick={onAddRange} type="button">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar rango
        </Button>

        <Button
          size="sm"
          onClick={handleExtract}
          disabled={disabled || validCount === 0}
          loading={disabled}
          type="button"
        >
          <Scissors className="h-4 w-4" aria-hidden="true" />
          Extraer {validCount} segmento{validCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </section>
  );
}
