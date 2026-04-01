import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { jobStore } from '../services/jobStore';
import { exportVideo, extractAudio } from '../services/ffmpeg';
import { Job, JobPayload } from '../types';

export async function jobRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /jobs/export
  fastify.post<{ Body: JobPayload }>('/jobs/export', async (request, reply) => {
    const payload = request.body;

    if (!payload?.source?.uploadId) {
      return reply.status(400).send({ error: 'El campo source.uploadId es requerido' });
    }

    const job: Job = {
      id: uuidv4(),
      type: 'export',
      status: 'queued',
      progress: 0,
      payload,
      createdAt: new Date(),
    };

    jobStore.set(job);

    // Procesar en background sin bloquear la respuesta
    void processJob(job.id, 'export', fastify);

    return reply.status(202).send({
      jobId: job.id,
      status: job.status,
      message: 'Job de exportación encolado',
    });
  });

  // POST /jobs/extract-audio
  fastify.post<{ Body: JobPayload }>('/jobs/extract-audio', async (request, reply) => {
    const payload = request.body;

    if (!payload?.source?.uploadId) {
      return reply.status(400).send({ error: 'El campo source.uploadId es requerido' });
    }

    const job: Job = {
      id: uuidv4(),
      type: 'extract-audio',
      status: 'queued',
      progress: 0,
      payload,
      createdAt: new Date(),
    };

    jobStore.set(job);

    void processJob(job.id, 'extract-audio', fastify);

    return reply.status(202).send({
      jobId: job.id,
      status: job.status,
      message: 'Job de extracción de audio encolado',
    });
  });

  // GET /jobs/:jobId
  fastify.get<{ Params: { jobId: string } }>('/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const job = jobStore.get(jobId);

    if (!job) {
      return reply.status(404).send({ error: 'Job no encontrado' });
    }

    return reply.send({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      resultUrl: job.resultUrl,
      error: job.error,
    });
  });
}

async function processJob(
  jobId: string,
  type: 'export' | 'extract-audio',
  fastify: FastifyInstance,
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  jobStore.update(jobId, { status: 'processing', progress: 5 });
  fastify.log.info({ jobId, type }, 'Iniciando procesamiento de job');

  try {
    const { source, timeline } = job.payload;
    const uploadId = source.uploadId!;

    const onProgress = (p: number): void => {
      jobStore.update(jobId, { progress: p });
    };

    let resultFilename: string;

    if (type === 'export') {
      resultFilename = await exportVideo(uploadId, timeline, onProgress);
    } else {
      resultFilename = await extractAudio(uploadId, timeline, onProgress);
    }

    // resultUrl absoluto para que el frontend pueda abrirlo directamente
    jobStore.update(jobId, {
      status: 'completed',
      progress: 100,
      resultUrl: `${config.publicUrl}/results/${resultFilename}`,
    });

    fastify.log.info({ jobId, resultFilename }, 'Job completado');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido en el procesamiento';
    fastify.log.error({ jobId, message }, 'Job fallido');

    jobStore.update(jobId, {
      status: 'failed',
      error: message,
    });
  }
}
