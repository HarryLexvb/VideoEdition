import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  uploadsDir: process.env.UPLOADS_DIR || path.resolve('./uploads'),
  resultsDir: process.env.RESULTS_DIR || path.resolve('./results'),
  tempDir: process.env.TEMP_DIR || path.resolve('./temp'),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // URL pública de la API — necesaria para construir resultUrl absoluto
  publicUrl: (process.env.PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, ''),
};
