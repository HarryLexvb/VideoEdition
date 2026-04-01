import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { TimelineSegment } from '../types';
import { getUploadPath, getTempPath, getResultPath, cleanupFiles } from '../storage/local';

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
 * Extrae el audio de los segmentos conservados (o del video completo si no hay segmentación).
 * Salida en MP3.
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
