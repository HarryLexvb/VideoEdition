import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';
import archiver from 'archiver';
import { config } from '../config';

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function resultRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /results/:filename — sirve el archivo procesado para descarga
  fastify.get<{ Params: { filename: string } }>('/results/:filename', async (request, reply) => {
    const { filename } = request.params;

    // Prevenir path traversal — solo se permite el nombre del archivo, sin rutas
    const safeName = path.basename(filename);
    const filePath = path.join(config.resultsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Archivo no encontrado' });
    }

    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    reply.header('Content-Type', contentType);
    reply.header('Content-Disposition', `attachment; filename="${safeName}"`);
    reply.header('Content-Length', fs.statSync(filePath).size);

    return reply.send(fs.createReadStream(filePath));
  });

  // POST /results/zip-segments — ZIP organizado por carpetas (segmento → audio + capturas)
  fastify.post<{
    Body: {
      segments: Array<{
        folderName: string;
        audioFilename?: string;
        captures?: Array<{ name: string; data: string }>;
      }>;
    };
  }>('/results/zip-segments', async (request, reply) => {
    const { segments } = request.body ?? {};

    if (!Array.isArray(segments) || segments.length === 0) {
      return reply.status(400).send({ error: 'Se requiere al menos un segmento en el campo segments' });
    }

    const archive = archiver('zip', { zlib: { level: 6 } });

    for (const segment of segments) {
      // Sanitize folder name: keep alphanumeric, spaces, hyphens, underscores
      const folder = path.basename(segment.folderName ?? 'segmento').replace(/[^a-zA-Z0-9 \-_]/g, '');

      // Add audio file from server results dir if specified
      if (segment.audioFilename) {
        const safeName = path.basename(String(segment.audioFilename));
        const filePath = path.join(config.resultsDir, safeName);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `${folder}/${safeName}` });
        }
      }

      // Embed PNG captures from base64 data
      for (const capture of segment.captures ?? []) {
        const safeCaptName = path.basename(String(capture.name)).replace(/[^a-zA-Z0-9.\-_]/g, '') || 'captura.png';
        // Strip data URL prefix if present
        const base64Data = String(capture.data).replace(/^data:image\/[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        archive.append(buffer, { name: `${folder}/${safeCaptName}` });
      }
    }

    const pass = new PassThrough();

    archive.on('error', (err) => {
      fastify.log.error({ err }, 'Error al crear ZIP de segmentos');
      pass.destroy(err);
    });

    archive.pipe(pass);
    void archive.finalize();

    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', 'attachment; filename="cortes_y_capturas.zip"');

    return reply.send(pass);
  });

  // POST /results/zip — empaqueta una lista de archivos en un ZIP y lo devuelve
  fastify.post<{ Body: { filenames: string[] } }>('/results/zip', async (request, reply) => {
    const { filenames } = request.body ?? {};

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return reply.status(400).send({ error: 'Se requiere al menos un archivo en el campo filenames' });
    }

    // Validar y resolver cada nombre — prevenir path traversal
    const resolvedPaths: Array<{ safeName: string; filePath: string }> = [];
    for (const rawName of filenames) {
      const safeName = path.basename(String(rawName));
      const filePath = path.join(config.resultsDir, safeName);
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: `Archivo no encontrado: ${safeName}` });
      }
      resolvedPaths.push({ safeName, filePath });
    }

    const archive = archiver('zip', { zlib: { level: 6 } });

    for (const { safeName, filePath } of resolvedPaths) {
      archive.file(filePath, { name: safeName });
    }

    const pass = new PassThrough();

    archive.on('error', (err) => {
      fastify.log.error({ err }, 'Error al crear ZIP');
      pass.destroy(err);
    });

    archive.pipe(pass);
    void archive.finalize();

    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', 'attachment; filename="audios.zip"');

    return reply.send(pass);
  });
}
