import path from 'path';
import fs from 'fs';
import { config } from '../config';

export function ensureDirs(): void {
  for (const dir of [config.uploadsDir, config.resultsDir, config.tempDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getUploadPath(uploadId: string): string {
  // tusd guarda el archivo con el nombre igual al uploadId, sin extensión
  return path.join(config.uploadsDir, uploadId);
}

export function getTempPath(filename: string): string {
  return path.join(config.tempDir, filename);
}

export function getResultPath(filename: string): string {
  return path.join(config.resultsDir, filename);
}

export function cleanupFiles(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignorar errores de limpieza
    }
  }
}
