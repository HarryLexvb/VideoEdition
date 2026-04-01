import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { ensureDirs } from './storage/local';
import { jobRoutes } from './routes/jobs';
import { resultRoutes } from './routes/results';
import { hookRoutes } from './routes/hooks';

async function main(): Promise<void> {
  // Asegurar que existen los directorios necesarios
  ensureDirs();

  const server = Fastify({
    logger:
      process.env.NODE_ENV === 'production'
        ? { level: 'info' }
        : { level: 'info', transport: { target: 'pino-pretty' } },
  });

  // CORS — permite peticiones del frontend
  await server.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  // Health check — útil para Docker y Nginx
  server.get('/health', async () => ({
    ok: true,
    timestamp: new Date().toISOString(),
  }));

  // Rutas
  await server.register(jobRoutes);
  await server.register(resultRoutes);
  await server.register(hookRoutes);

  // Arrancar servidor
  await server.listen({ port: config.port, host: config.host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
