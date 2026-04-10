import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { TimelineSegment } from '../types';
import { getUploadPath, getTempPath, getResultPath, cleanupFiles } from '../storage/local';

/**
 * Convierte segundos a etiqueta legible para nombres de archivo.
 * < 60s → "segundo_NN", >= 60s → "minuto_MM_SS"
 */
function formatTimeLabel(seconds: number): string {
  const floored = Math.floor(seconds);
  if (floored < 60) {
    return `segundo_${floored.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(floored / 60);
  const s = floored % 60;
  return `minuto_${m.toString().padStart(2, '0')}_${s.toString().padStart(2, '0')}`;
}

/**
 * Construye el nombre de archivo para un segmento de audio exportado.
 * Ejemplo: audio_01_segundo_12_a_segundo_18.mp3
 */
function buildAudioSegmentFilename(index: number, start: number, end: number): string {
  const idx = (index + 1).toString().padStart(2, '0');
  const startLabel = formatTimeLabel(start);
  const endLabel = formatTimeLabel(end);
  return `audio_${idx}_${startLabel}_a_${endLabel}.mp3`;
}

export interface AudioSegmentResult {
  filename: string;
  index: number;
  start: number;
  end: number;
}

// Configurar rutas de ffmpeg si se definen en .env
if (config.ffmpegPath !== 'ffmpeg') ffmpeg.setFfmpegPath(config.ffmpegPath);
if (config.ffprobePath !== 'ffprobe') ffmpeg.setFfprobePath(config.ffprobePath);

/**
 * Corta un tramo del video entre start y end (en segundos).
 * Usa -c copy para evitar re-encode y ser rápido.
 */
function cutSegment(
  inputPath: string,
  start: number,
  end: number,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(start)
      .duration(end - start)
      .outputOptions('-c', 'copy')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });
}

/**
 * Concatena una lista de segmentos de video en un único archivo de salida.
 * Usa el concat demuxer de FFmpeg (sin re-encode).
 */
function concatSegments(segmentPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const listPath = getTempPath(`concat_${uuidv4()}.txt`);
    const content = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, content, 'utf-8');

    ffmpeg()
      .input(listPath)
      .inputOptions('-f', 'concat', '-safe', '0')
      .outputOptions('-c', 'copy')
      .output(outputPath)
      .on('end', () => {
        cleanupFiles(listPath);
        resolve();
      })
      .on('error', (err: Error) => {
        cleanupFiles(listPath);
        reject(err);
      })
      .run();
  });
}

/**
 * Exporta el video final con los segmentos marcados como 'keep',
 * en el orden correcto, sin re-encode.
 */
export async function exportVideo(
  uploadId: string,
  segments: TimelineSegment[],
  onProgress: (p: number) => void,
): Promise<string> {
  const inputPath = getUploadPath(uploadId);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Archivo no encontrado para uploadId: ${uploadId}`);
  }

  const keepSegments = segments.filter((s) => s.disposition === 'keep');

  if (keepSegments.length === 0) {
    throw new Error('No hay segmentos marcados para conservar');
  }

  const outputFilename = `export_${uuidv4()}.mp4`;
  const outputPath = getResultPath(outputFilename);
  const tempPaths: string[] = [];

  try {
    onProgress(10);

    if (keepSegments.length === 1) {
      const seg = keepSegments[0];
      await cutSegment(inputPath, seg.start, seg.end, outputPath);
    } else {
      for (let i = 0; i < keepSegments.length; i++) {
        const seg = keepSegments[i];
        const tempPath = getTempPath(`seg_${uuidv4()}.mp4`);
        tempPaths.push(tempPath);
        await cutSegment(inputPath, seg.start, seg.end, tempPath);
        onProgress(10 + Math.round(((i + 1) / keepSegments.length) * 70));
      }

      onProgress(85);
      await concatSegments(tempPaths, outputPath);
    }

    onProgress(100);
    return outputFilename;
  } finally {
    cleanupFiles(...tempPaths);
  }
}

/**
 * Extrae el audio de los segmentos conservados fusionados en un único MP3.
 * Mantenida para compatibilidad; para exportación por segmento usar extractAudioSegments.
 */
export async function extractAudio(
  uploadId: string,
  segments: TimelineSegment[],
  onProgress: (p: number) => void,
): Promise<string> {
  const inputPath = getUploadPath(uploadId);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Archivo no encontrado para uploadId: ${uploadId}`);
  }

  const keepSegments = segments.filter((s) => s.disposition === 'keep');
  const allKeep = keepSegments.length === segments.length;

  const outputFilename = `audio_${uuidv4()}.mp3`;
  const outputPath = getResultPath(outputFilename);
  const tempPaths: string[] = [];

  try {
    onProgress(10);

    // Si hay segmentación real, primero exportar el video recortado
    let sourceForAudio = inputPath;

    if (!allKeep && keepSegments.length > 0) {
      const tempVideoPath = getTempPath(`tmpvid_${uuidv4()}.mp4`);
      tempPaths.push(tempVideoPath);

      if (keepSegments.length === 1) {
        const seg = keepSegments[0];
        await cutSegment(inputPath, seg.start, seg.end, tempVideoPath);
      } else {
        const segPaths: string[] = [];
        for (const seg of keepSegments) {
          const segPath = getTempPath(`seg_${uuidv4()}.mp4`);
          segPaths.push(segPath);
          tempPaths.push(segPath);
          await cutSegment(inputPath, seg.start, seg.end, segPath);
        }
        await concatSegments(segPaths, tempVideoPath);
      }

      sourceForAudio = tempVideoPath;
    }

    onProgress(60);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourceForAudio)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioQuality(2)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    onProgress(100);
    return outputFilename;
  } finally {
    cleanupFiles(...tempPaths);
  }
}

/**
 * Extrae el audio de cada segmento 'keep' como un archivo MP3 independiente,
 * en orden temporal. Cada archivo lleva un nombre descriptivo con el rango temporal.
 *
 * Ejemplo de salida:
 *   audio_01_segundo_12_a_segundo_18.mp3
 *   audio_02_segundo_25_a_segundo_40.mp3
 *   audio_03_minuto_01_10_a_minuto_01_32.mp3
 */
export async function extractAudioSegments(
  uploadId: string,
  segments: TimelineSegment[],
  onProgress: (p: number) => void,
): Promise<AudioSegmentResult[]> {
  const inputPath = getUploadPath(uploadId);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Archivo no encontrado para uploadId: ${uploadId}`);
  }

  // Ordenar segmentos por tiempo de inicio antes de procesar
  const keepSegments = segments
    .filter((s) => s.disposition === 'keep')
    .sort((a, b) => a.start - b.start);

  if (keepSegments.length === 0) {
    throw new Error('No hay segmentos marcados para conservar');
  }

  const results: AudioSegmentResult[] = [];
  const tempPaths: string[] = [];

  try {
    onProgress(5);

    for (let i = 0; i < keepSegments.length; i++) {
      const seg = keepSegments[i];
      let filename = buildAudioSegmentFilename(i, seg.start, seg.end);
      let outputPath = getResultPath(filename);

      // Resolver colisión si ya existe un archivo con ese nombre
      if (fs.existsSync(outputPath)) {
        filename = buildAudioSegmentFilename(i, seg.start, seg.end).replace(
          '.mp3',
          `_${uuidv4().slice(0, 8)}.mp3`,
        );
        outputPath = getResultPath(filename);
      }

      // Cortar el segmento de video en un archivo temporal
      const tempVideoPath = getTempPath(`seg_audio_${uuidv4()}.mp4`);
      tempPaths.push(tempVideoPath);
      await cutSegment(inputPath, seg.start, seg.end, tempVideoPath);

      // Extraer audio del segmento cortado
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioQuality(2)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });

      results.push({ filename, index: i, start: seg.start, end: seg.end });

      onProgress(5 + Math.round(((i + 1) / keepSegments.length) * 90));
    }

    onProgress(100);
    return results;
  } finally {
    cleanupFiles(...tempPaths);
  }
}
