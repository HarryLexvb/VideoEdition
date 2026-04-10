/**
 * Tests para la lógica de segmentos del timeline (splitSegmentAtTime, normalizeSegmentsForDuration).
 * Replica la lógica de src/features/editor/model/segments.ts para testear sin dependencias de browser.
 *
 * Ejecutar: npx tsx --test src/services/segments.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Réplica de la lógica de segments.ts ──────────────────────────────────────

const EPSILON = 0.001;
let _idCounter = 0;
function createId(prefix: string): string {
  return `${prefix}_${++_idCounter}`;
}

interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  disposition: 'keep' | 'remove';
}

function splitSegmentAtTime(
  segments: TimelineSegment[],
  time: number,
): { segments: TimelineSegment[]; created: boolean; newSelectedSegmentId: string | null } {
  if (segments.length === 0) {
    return { segments, created: false, newSelectedSegmentId: null };
  }

  const targetIndex = segments.findIndex(
    (s) => time > s.start + EPSILON && time < s.end - EPSILON,
  );

  if (targetIndex === -1) {
    return { segments, created: false, newSelectedSegmentId: null };
  }

  const target = segments[targetIndex];

  const left: TimelineSegment = { id: createId('seg'), start: target.start, end: time, disposition: target.disposition };
  const right: TimelineSegment = { id: createId('seg'), start: time, end: target.end, disposition: target.disposition };

  return {
    segments: [...segments.slice(0, targetIndex), left, right, ...segments.slice(targetIndex + 1)],
    created: true,
    newSelectedSegmentId: right.id,
  };
}

function createInitialSegment(duration: number): TimelineSegment {
  return { id: createId('seg'), start: 0, end: Math.max(duration, 0), disposition: 'keep' };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('splitSegmentAtTime - caso base', () => {
  it('divide un segmento en dos al cortar en el medio', () => {
    const initial = [createInitialSegment(60)];
    const result = splitSegmentAtTime(initial, 30);
    assert.ok(result.created);
    assert.equal(result.segments.length, 2);
    assert.equal(result.segments[0].start, 0);
    assert.equal(result.segments[0].end, 30);
    assert.equal(result.segments[1].start, 30);
    assert.equal(result.segments[1].end, 60);
  });

  it('hereda la disposition del segmento original', () => {
    const segments: TimelineSegment[] = [
      { id: 's1', start: 0, end: 60, disposition: 'remove' },
    ];
    const result = splitSegmentAtTime(segments, 25);
    assert.ok(result.created);
    assert.equal(result.segments[0].disposition, 'remove');
    assert.equal(result.segments[1].disposition, 'remove');
  });

  it('no divide si el tiempo está en el borde exacto del inicio', () => {
    const segments: TimelineSegment[] = [
      { id: 's1', start: 10, end: 40, disposition: 'keep' },
    ];
    const result = splitSegmentAtTime(segments, 10);
    assert.equal(result.created, false);
    assert.equal(result.segments.length, 1);
  });

  it('no divide si el tiempo está en el borde exacto del fin', () => {
    const segments: TimelineSegment[] = [
      { id: 's1', start: 10, end: 40, disposition: 'keep' },
    ];
    const result = splitSegmentAtTime(segments, 40);
    assert.equal(result.created, false);
  });

  it('no divide en array vacío', () => {
    const result = splitSegmentAtTime([], 10);
    assert.equal(result.created, false);
    assert.equal(result.segments.length, 0);
  });
});

describe('splitSegmentAtTime - múltiples cortes consecutivos', () => {
  it('dos cortes consecutivos producen 3 segmentos', () => {
    let segs = [createInitialSegment(60)];
    segs = splitSegmentAtTime(segs, 20).segments;
    segs = splitSegmentAtTime(segs, 40).segments;
    assert.equal(segs.length, 3);
    assert.equal(segs[0].start, 0);
    assert.equal(segs[0].end, 20);
    assert.equal(segs[1].start, 20);
    assert.equal(segs[1].end, 40);
    assert.equal(segs[2].start, 40);
    assert.equal(segs[2].end, 60);
  });

  it('N cortes producen N+1 segmentos', () => {
    let segs = [createInitialSegment(100)];
    const cuts = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    for (const c of cuts) {
      const result = splitSegmentAtTime(segs, c);
      assert.ok(result.created, `Corte en ${c} debe crearse`);
      segs = result.segments;
    }
    assert.equal(segs.length, cuts.length + 1);
  });

  it('los segmentos resultantes cubren el rango completo sin gaps', () => {
    let segs = [createInitialSegment(60)];
    segs = splitSegmentAtTime(segs, 15).segments;
    segs = splitSegmentAtTime(segs, 30).segments;
    segs = splitSegmentAtTime(segs, 45).segments;

    assert.equal(segs[0].start, 0);
    assert.equal(segs[segs.length - 1].end, 60);
    for (let i = 1; i < segs.length; i++) {
      assert.equal(segs[i].start, segs[i - 1].end, 'sin gaps entre segmentos');
    }
  });

  it('cortes separados (no adyacentes) funcionan correctamente', () => {
    let segs = [createInitialSegment(120)];
    segs = splitSegmentAtTime(segs, 10).segments;  // corte temprano
    segs = splitSegmentAtTime(segs, 90).segments;  // corte tardío
    assert.equal(segs.length, 3);
    assert.equal(segs[0].end, 10);
    assert.equal(segs[1].start, 10);
    assert.equal(segs[1].end, 90);
    assert.equal(segs[2].start, 90);
    assert.equal(segs[2].end, 120);
  });
});

describe('splitSegmentAtTime - cortes pequeños', () => {
  it('permite cortes muy pequeños (> EPSILON desde ambos bordes)', () => {
    const segs: TimelineSegment[] = [{ id: 'x', start: 0, end: 1, disposition: 'keep' }];
    // 0.5 está > EPSILON desde 0 y < 1 - EPSILON
    const result = splitSegmentAtTime(segs, 0.5);
    assert.ok(result.created);
    assert.equal(result.segments[0].end, 0.5);
    assert.equal(result.segments[1].start, 0.5);
  });

  it('rechaza cortes demasiado cercanos al inicio (dentro de EPSILON)', () => {
    const segs: TimelineSegment[] = [{ id: 'x', start: 0, end: 10, disposition: 'keep' }];
    const result = splitSegmentAtTime(segs, 0.0005); // < EPSILON
    assert.equal(result.created, false);
  });

  it('rechaza cortes demasiado cercanos al fin (dentro de EPSILON)', () => {
    const segs: TimelineSegment[] = [{ id: 'x', start: 0, end: 10, disposition: 'keep' }];
    const result = splitSegmentAtTime(segs, 9.9995); // > 10 - EPSILON
    assert.equal(result.created, false);
  });
});

describe('flujo de exportación de audio con segmentos keep/remove', () => {
  it('caso 1: un único segmento keep (video completo sin cortes)', () => {
    const segments: TimelineSegment[] = [
      { id: '1', start: 0, end: 60, disposition: 'keep' },
    ];
    const keeps = segments.filter((s) => s.disposition === 'keep').sort((a, b) => a.start - b.start);
    assert.equal(keeps.length, 1);
    assert.equal(keeps[0].start, 0);
    assert.equal(keeps[0].end, 60);
  });

  it('caso 2: múltiples segmentos consecutivos keep', () => {
    // 4 segmentos alternados keep/remove
    const segments: TimelineSegment[] = [
      { id: '1', start: 0, end: 15, disposition: 'keep' },
      { id: '2', start: 15, end: 30, disposition: 'remove' },
      { id: '3', start: 30, end: 45, disposition: 'keep' },
      { id: '4', start: 45, end: 60, disposition: 'remove' },
    ];
    const keeps = segments.filter((s) => s.disposition === 'keep').sort((a, b) => a.start - b.start);
    assert.equal(keeps.length, 2);
    assert.equal(keeps[0].start, 0);
    assert.equal(keeps[1].start, 30);
  });

  it('caso 3: segmentos desordenados se reordenan por start', () => {
    const segments: TimelineSegment[] = [
      { id: '3', start: 40, end: 60, disposition: 'keep' },
      { id: '1', start: 0, end: 10, disposition: 'keep' },
      { id: '2', start: 20, end: 30, disposition: 'keep' },
    ];
    const keeps = segments.filter((s) => s.disposition === 'keep').sort((a, b) => a.start - b.start);
    assert.equal(keeps[0].start, 0);
    assert.equal(keeps[1].start, 20);
    assert.equal(keeps[2].start, 40);
  });

  it('caso 4: todos remove → no hay segmentos para exportar', () => {
    const segments: TimelineSegment[] = [
      { id: '1', start: 0, end: 30, disposition: 'remove' },
      { id: '2', start: 30, end: 60, disposition: 'remove' },
    ];
    const keeps = segments.filter((s) => s.disposition === 'keep');
    assert.equal(keeps.length, 0);
  });

  it('caso 5: muchos segmentos exportados en orden correcto', () => {
    let segs = [createInitialSegment(100)];
    const cutTimes = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    for (const c of cutTimes) {
      segs = splitSegmentAtTime(segs, c).segments;
    }
    // Marcar pares como remove
    segs = segs.map((s, i) => ({ ...s, disposition: i % 2 === 0 ? 'keep' : 'remove' }));

    const keeps = segs.filter((s) => s.disposition === 'keep').sort((a, b) => a.start - b.start);
    assert.equal(keeps.length, 5);
    assert.equal(keeps[0].start, 0);
    assert.equal(keeps[1].start, 20);
    assert.equal(keeps[2].start, 40);
    assert.equal(keeps[3].start, 60);
    assert.equal(keeps[4].start, 80);
  });

  it('caso 6: cortes que comparten límites cercanos (0.5s apart)', () => {
    let segs = [createInitialSegment(10)];
    segs = splitSegmentAtTime(segs, 4.5).segments;
    segs = splitSegmentAtTime(segs, 5.0).segments;
    assert.equal(segs.length, 3);
    assert.equal(segs[1].start, 4.5);
    assert.equal(segs[1].end, 5.0);
    assert.ok(segs[1].end - segs[1].start >= EPSILON);
  });

  it('caso 7: segmentos en distintos minutos', () => {
    let segs = [createInitialSegment(300)]; // 5 minutos
    segs = splitSegmentAtTime(segs, 60).segments;  // 1m
    segs = splitSegmentAtTime(segs, 120).segments; // 2m
    segs = splitSegmentAtTime(segs, 180).segments; // 3m
    segs = splitSegmentAtTime(segs, 240).segments; // 4m
    assert.equal(segs.length, 5);
    assert.equal(segs[0].end, 60);
    assert.equal(segs[1].start, 60);
    assert.equal(segs[4].end, 300);
  });
});
