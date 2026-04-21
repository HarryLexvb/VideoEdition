import OpenAI from 'openai';
import fs from 'fs';
import { config } from '../config';
import { getResultPath } from '../storage/local';
import type { TranscriptionSegment } from '../types';

export async function transcribeAudioSegments(
  segments: Array<{ filename: string; start: number; end: number }>,
  onProgress: (p: number) => void,
): Promise<TranscriptionSegment[]> {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY no está configurado en el entorno del servidor.');
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const results: TranscriptionSegment[] = [];

  onProgress(5);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const safeName = seg.filename.replace(/[^a-zA-Z0-9._\-]/g, '');
    const filePath = getResultPath(safeName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo de audio no encontrado para transcribir: ${safeName}`);
    }

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
    });

    results.push({
      filename: safeName,
      start: seg.start,
      end: seg.end,
      text: response.text.trim(),
    });

    onProgress(5 + Math.round(((i + 1) / segments.length) * 90));
  }

  onProgress(100);
  return results;
}
