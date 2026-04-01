import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
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
}
