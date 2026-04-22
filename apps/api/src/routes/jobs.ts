import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { jobStore } from '../services/jobStore';
import { exportVideo, extractAudioSegments } from '../services/ffmpeg';
import { transcribeAudioSegments } from '../services/transcription';
import { Job, JobPayload, TranscribeJobPayload } from '../types';

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

  // POST /jobs/transcribe
  fastify.post<{ Body: TranscribeJobPayload }>('/jobs/transcribe', async (request, reply) => {
    const payload = request.body;

    if (!Array.isArray(payload?.segments) || payload.segments.length === 0) {
      return reply.status(400).send({ error: 'El campo segments es requerido y debe contener al menos un elemento' });
    }

    const job: Job = {
      id: uuidv4(),
      type: 'transcribe',
      status: 'queued',
      progress: 0,
      payload,
      createdAt: new Date(),
    };

    jobStore.set(job);
    void processTranscribeJob(job.id, fastify);

    return reply.status(202).send({
      jobId: job.id,
      status: job.status,
      message: 'Job de transcripción encolado',
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
      resultUrls: job.resultUrls,
      transcriptionSegments: job.transcriptionSegments,
      error: job.error,
    });
  });
}

async function processTranscribeJob(jobId: string, fastify: FastifyInstance): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  jobStore.update(jobId, { status: 'processing', progress: 5 });
  fastify.log.info({ jobId }, 'Iniciando transcripción con Whisper');

  try {
    const payload = job.payload as TranscribeJobPayload;
    const onProgress = (p: number): void => { jobStore.update(jobId, { progress: p }); };

    const transcriptionSegments = await transcribeAudioSegments(payload.segments, onProgress);

    jobStore.update(jobId, {
      status: 'completed',
      progress: 100,
      transcriptionSegments,
    });

    fastify.log.info({ jobId }, 'Transcripción completada');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido en la transcripción';
    fastify.log.error({ jobId, message }, 'Transcripción fallida');
    jobStore.update(jobId, { status: 'failed', error: message });
  }
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
    const { source, timeline } = job.payload as JobPayload;
    const uploadId = source.uploadId!;

    const onProgress = (p: number): void => {
      jobStore.update(jobId, { progress: p });
    };

    if (type === 'export') {
      const resultFilename = await exportVideo(uploadId, timeline, onProgress);
      jobStore.update(jobId, {
        status: 'completed',
        progress: 100,
        resultUrl: `${config.publicUrl}/results/${resultFilename}`,
      });
    } else {
      // Exportar cada segmento 'keep' como un MP3 independiente
      const segmentResults = await extractAudioSegments(uploadId, timeline, onProgress);
      const resultUrls = segmentResults.map(
        (r) => `${config.publicUrl}/results/${r.filename}`,
      );
      jobStore.update(jobId, {
        status: 'completed',
        progress: 100,
        // resultUrl apunta al primer segmento para compatibilidad con clientes que no soporten resultUrls
        resultUrl: resultUrls[0],
        resultUrls,
      });
    }

    fastify.log.info({ jobId }, 'Job completado');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido en el procesamiento';
    fastify.log.error({ jobId, message }, 'Job fallido');

    jobStore.update(jobId, {
      status: 'failed',
      error: message,
    });
  }
}
