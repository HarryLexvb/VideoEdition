import { History, Redo2, Trash2, Undo2 } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { formatTime } from '../../../shared/lib/formatTime';
import { findSegmentById, getSegmentDuration } from '../model/segments';
import type { HistoryRecord, SegmentDisposition, TimelineSegment } from '../model/types';

interface SidebarPanelProps {
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
  onSeek: (time: number) => void;
  onSetSelectedDisposition: (disposition: SegmentDisposition) => void;
  onToggleSegmentDisposition: (segmentId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyPast: HistoryRecord[];
  historyFuture: HistoryRecord[];
}

export function SidebarPanel({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onSeek,
  onSetSelectedDisposition,
  onToggleSegmentDisposition,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  historyPast,
  historyFuture,
}: SidebarPanelProps) {
  const selectedSegment = findSegmentById(segments, selectedSegmentId);

  return (
    <aside className="space-y-5">
      <section className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.8)]">
        <h2 className="font-display text-lg font-semibold text-slate-900">Fragmento seleccionado</h2>
        {selectedSegment ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">
              <p>
                Inicio: <strong>{formatTime(selectedSegment.start)}</strong>
              </p>
              <p>
                Fin: <strong>{formatTime(selectedSegment.end)}</strong>
              </p>
              <p>
                Duracion: <strong>{formatTime(getSegmentDuration(selectedSegment))}</strong>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedSegment.disposition === 'keep' ? 'primary' : 'secondary'}
                onClick={() => onSetSelectedDisposition('keep')}
              >
                Conservar
              </Button>
              <Button
                size="sm"
                variant={selectedSegment.disposition === 'remove' ? 'danger' : 'secondary'}
                onClick={() => onSetSelectedDisposition('remove')}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Selecciona un fragmento desde timeline o lista lateral.</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.8)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">Segmentos</h2>
          <StatusBadge>{segments.length}</StatusBadge>
        </div>
        <div className="max-h-72 space-y-2 overflow-auto pr-1">
          {segments.map((segment, index) => {
            const isSelected = segment.id === selectedSegmentId;
            return (
              <div
                key={segment.id}
                onClick={() => {
                  onSelectSegment(segment.id);
                  onSeek(segment.start);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectSegment(segment.id);
                    onSeek(segment.start);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'border-brand-300 bg-brand-50 shadow-[0_10px_25px_-15px_rgba(5,120,112,0.7)]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">Fragmento {index + 1}</p>
                  <StatusBadge tone={segment.disposition === 'keep' ? 'success' : 'danger'}>
                    {segment.disposition === 'keep' ? 'Keep' : 'Remove'}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSegmentDisposition(segment.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Alternar keep/remove
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/50 bg-white/80 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.8)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">Historial</h2>
          <History className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </div>

        <div className="mb-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onUndo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Deshacer
          </Button>
          <Button size="sm" variant="secondary" onClick={onRedo} disabled={!canRedo}>
            <Redo2 className="h-4 w-4" aria-hidden="true" />
            Rehacer
          </Button>
        </div>

        <div className="max-h-52 space-y-2 overflow-auto pr-1 text-sm">
          {historyPast.length === 0 && historyFuture.length === 0 ? (
            <p className="text-slate-500">Aun no hay operaciones registradas.</p>
          ) : null}

          {[...historyPast]
            .reverse()
            .map((entry) => (
              <div key={`${entry.id}-past`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-medium text-slate-700">{entry.label}</p>
                <p className="text-xs text-slate-500">Aplicada</p>
              </div>
            ))}

          {historyFuture.map((entry) => (
            <div key={`${entry.id}-future`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="font-medium text-amber-700">{entry.label}</p>
              <p className="text-xs text-amber-600">Disponible en redo</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
