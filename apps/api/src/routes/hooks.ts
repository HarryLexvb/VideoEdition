import { FastifyInstance } from 'fastify';

// tusd llama a este endpoint al completar un upload.
// Sirve para registrar el evento y, en el futuro, hacer limpieza
// automática o mapear uploadId → metadata del archivo.
export async function hookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/hooks/upload', async (request, reply) => {
    fastify.log.info({ body: request.body }, 'tusd: upload completado');
    return reply.status(200).send({ ok: true });
  });
}
