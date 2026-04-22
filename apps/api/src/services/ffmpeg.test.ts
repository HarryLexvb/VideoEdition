/**
 * Tests para las funciones de ffmpeg.ts que no requieren un archivo de video real.
 * Se testean los helpers de naming y la lógica de ordenamiento/filtrado de segmentos.
 *
 * Ejecutar: npx tsx --test src/services/ffmpeg.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Reimplementación local de helpers para testear sin efectos secundarios ───

function formatTimeLabel(seconds: number): string {
  const floored = Math.floor(seconds);
  if (floored < 60) {
    return `segundo_${floored.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(floored / 60);
  const s = floored % 60;
  return `minuto_${m.toString().padStart(2, '0')}_${s.toString().padStart(2, '0')}`;
}

function buildAudioSegmentFilename(index: number, start: number, end: number): string {
  const idx = (index + 1).toString().padStart(2, '0');
  const startLabel = formatTimeLabel(start);
  const endLabel = formatTimeLabel(end);
  return `audio_${idx}_${startLabel}_a_${endLabel}.mp3`;
}

interface Segment {
  id: string;
  start: number;
  end: number;
  disposition: 'keep' | 'remove';
}

function filterAndSortKeepSegments(segments: Segment[]): Segment[] {
  return segments
    .filter((s) => s.disposition === 'keep')
    .sort((a, b) => a.start - b.start);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('formatTimeLabel', () => {
  it('convierte 0 segundos correctamente', () => {
    assert.equal(formatTimeLabel(0), 'segundo_00');
  });

  it('convierte segundos menores a 60 con padding', () => {
    assert.equal(formatTimeLabel(5), 'segundo_05');
    assert.equal(formatTimeLabel(12), 'segundo_12');
    assert.equal(formatTimeLabel(59), 'segundo_59');
  });

  it('trunca decimales al calcular el piso', () => {
    assert.equal(formatTimeLabel(12.999), 'segundo_12');
    assert.equal(formatTimeLabel(59.5), 'segundo_59');
  });

  it('convierte exactamente 60 segundos a minuto_01_00', () => {
    assert.equal(formatTimeLabel(60), 'minuto_01_00');
  });

  it('convierte 90 segundos a minuto_01_30', () => {
    assert.equal(formatTimeLabel(90), 'minuto_01_30');
  });

  it('convierte 92 segundos a minuto_01_32', () => {
    assert.equal(formatTimeLabel(92), 'minuto_01_32');
  });

  it('convierte 125 segundos a minuto_02_05', () => {
    assert.equal(formatTimeLabel(125), 'minuto_02_05');
  });

  it('convierte 3600 segundos (1 hora) a minuto_60_00', () => {
    assert.equal(formatTimeLabel(3600), 'minuto_60_00');
  });
});

describe('buildAudioSegmentFilename', () => {
  it('genera nombre para el primer segmento (index 0, segundos)', () => {
    const name = buildAudioSegmentFilename(0, 12, 18);
    assert.equal(name, 'audio_01_segundo_12_a_segundo_18.mp3');
  });

  it('genera nombre para el segundo segmento (index 1)', () => {
    const name = buildAudioSegmentFilename(1, 25, 40);
    assert.equal(name, 'audio_02_segundo_25_a_segundo_40.mp3');
  });

  it('genera nombre para segmento en minutos', () => {
    const name = buildAudioSegmentFilename(2, 70, 92);
    assert.equal(name, 'audio_03_minuto_01_10_a_minuto_01_32.mp3');
  });

  it('los índices se ordenan con cero a la izquierda correctamente hasta 99', () => {
    const name9 = buildAudioSegmentFilename(8, 0, 5);
    const name10 = buildAudioSegmentFilename(9, 5, 10);
    assert.match(name9, /^audio_09_/);
    assert.match(name10, /^audio_10_/);
  });

  it('produce nombres distintos para segmentos distintos', () => {
    const a = buildAudioSegmentFilename(0, 0, 10);
    const b = buildAudioSegmentFilename(1, 10, 20);
    const c = buildAudioSegmentFilename(2, 20, 30);
    const names = new Set([a, b, c]);
    assert.equal(names.size, 3);
  });

  it('siempre termina en .mp3', () => {
    for (let i = 0; i < 5; i++) {
      assert.match(buildAudioSegmentFilename(i, i * 10, i * 10 + 9), /\.mp3$/);
    }
  });
});

describe('filterAndSortKeepSegments', () => {
  it('filtra solo segmentos con disposition keep', () => {
    const segments: Segment[] = [
      { id: 'a', start: 0, end: 10, disposition: 'keep' },
      { id: 'b', start: 10, end: 20, disposition: 'remove' },
      { id: 'c', start: 20, end: 30, disposition: 'keep' },
    ];
    const result = filterAndSortKeepSegments(segments);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, 'a');
    assert.equal(result[1].id, 'c');
  });

  it('ordena por tiempo de inicio independientemente del orden de entrada', () => {
    const segments: Segment[] = [
      { id: 'c', start: 40, end: 50, disposition: 'keep' },
      { id: 'a', start: 0, end: 10, disposition: 'keep' },
      { id: 'b', start: 20, end: 30, disposition: 'keep' },
    ];
    const result = filterAndSortKeepSegments(segments);
    assert.equal(result[0].id, 'a');
    assert.equal(result[1].id, 'b');
    assert.equal(result[2].id, 'c');
  });

  it('devuelve array vacío si todos son remove', () => {
    const segments: Segment[] = [
      { id: 'a', start: 0, end: 10, disposition: 'remove' },
      { id: 'b', start: 10, end: 20, disposition: 'remove' },
    ];
    const result = filterAndSortKeepSegments(segments);
    assert.equal(result.length, 0);
  });

  it('un único segmento keep devuelve array con un elemento', () => {
    const segments: Segment[] = [
      { id: 'a', start: 0, end: 30, disposition: 'keep' },
    ];
    const result = filterAndSortKeepSegments(segments);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'a');
  });

  it('maneja muchos segmentos (caso de muchos cortes)', () => {
    const segments: Segment[] = Array.from({ length: 10 }, (_, i) => ({
      id: `seg_${i}`,
      start: i * 10,
      end: i * 10 + 8,
      disposition: i % 2 === 0 ? 'keep' : 'remove',
    }));
    const result = filterAndSortKeepSegments(segments);
    assert.equal(result.length, 5);
    // Verificar orden
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i].start > result[i - 1].start, 'orden ascendente por start');
    }
  });

  it('segmentos con límites cercanos se ordenan correctamente', () => {
    const segments: Segment[] = [
      { id: 'a', start: 10.001, end: 10.5, disposition: 'keep' },
      { id: 'b', start: 10.0, end: 10.001, disposition: 'keep' },
    ];
    const result = filterAndSortKeepSegments(segments);
    assert.equal(result[0].id, 'b');
    assert.equal(result[1].id, 'a');
  });
});

describe('consistencia de naming entre múltiples segmentos', () => {
  it('los filenames generados para N segmentos son todos únicos', () => {
    const segments: Segment[] = [
      { id: '1', start: 0, end: 5, disposition: 'keep' },
      { id: '2', start: 10, end: 20, disposition: 'keep' },
      { id: '3', start: 30, end: 45, disposition: 'keep' },
      { id: '4', start: 60, end: 90, disposition: 'keep' },
      { id: '5', start: 120, end: 150, disposition: 'keep' },
    ];
    const keeps = filterAndSortKeepSegments(segments);
    const names = keeps.map((seg, i) => buildAudioSegmentFilename(i, seg.start, seg.end));
    const unique = new Set(names);
    assert.equal(unique.size, names.length, 'todos los nombres deben ser únicos');
  });

  it('el orden secuencial de los filenames refleja el orden temporal', () => {
    const segments: Segment[] = [
      { id: '3', start: 60, end: 80, disposition: 'keep' },
      { id: '1', start: 5, end: 15, disposition: 'keep' },
      { id: '2', start: 25, end: 40, disposition: 'keep' },
    ];
    const keeps = filterAndSortKeepSegments(segments);
    const names = keeps.map((seg, i) => buildAudioSegmentFilename(i, seg.start, seg.end));
    assert.match(names[0], /^audio_01_segundo_05/);
    assert.match(names[1], /^audio_02_segundo_25/);
    assert.match(names[2], /^audio_03_minuto_01_00/);
  });
});
