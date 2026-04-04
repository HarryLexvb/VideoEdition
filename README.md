# VideoCut Studio

Editor de video no destructivo con frontend React y backend Fastify para procesamiento con FFmpeg.

## Estado Real Del Proyecto (Auditoria 2026-04-04)

Veredicto tecnico: el repositorio SI tiene backend.

Clasificacion actual:
- Frontend: funcional para carga, preview, timeline, segmentos, trim e historial.
- Backend: parcial pero operativo (MVP), con API y procesamiento real de jobs.
- Produccion endurecida: pendiente (sin autenticacion, sin cola persistente, sin base de datos, sin validacion de schema en runtime).

## Evidencia Tecnica Del Backend

Componentes de backend detectados y verificados en codigo:
- Servidor HTTP Fastify en apps/api/src/server.ts
- Rutas API en apps/api/src/routes/jobs.ts, apps/api/src/routes/results.ts, apps/api/src/routes/hooks.ts
- Logica de procesamiento FFmpeg en apps/api/src/services/ffmpeg.ts
- Almacenamiento local (uploads/results/temp) en apps/api/src/storage/local.ts
- Job store en memoria en apps/api/src/services/jobStore.ts
- Configuracion por variables de entorno en apps/api/src/config.ts
- Contenedores y orquestacion en docker-compose.yml y apps/api/Dockerfile
- Integracion frontend -> backend en src/features/editor/api/client.ts y src/features/editor/api/hooks.ts

## Arquitectura Actual

### Frontend
- React + Vite + TypeScript
- Editor visual (player, timeline, trim, segmentos)
- Construye payload de job en src/features/editor/model/projectPayload.ts
- Lanza jobs y hace polling de estado via API

### Backend (MVP)
- Fastify con CORS
- Endpoints:
  - GET /health
  - POST /jobs/export
  - POST /jobs/extract-audio
  - GET /jobs/:jobId
  - GET /results/:filename
  - POST /hooks/upload
- Procesa exportacion y extraccion de audio con FFmpeg
- Retorna resultUrl para descarga

### Upload Reanudable
- Soporte Tus en frontend via Uppy
- Servicio tusd en docker-compose.yml
- Hook de finalizacion en POST /hooks/upload

## Lo Que Si Hace Hoy

- Cargar video localmente
- Mostrar preview y waveform
- Definir segmentos keep/remove
- Definir trim range visual
- Enviar jobs al backend (si VITE_API_BASE_URL esta configurado)
- Consultar estado de jobs por polling
- Descargar resultados desde /results/:filename

## Limitaciones Reales (Sin Sobreestimar)

- Job store en memoria (se pierde al reiniciar el backend)
- Sin autenticacion/autorizacion
- Sin base de datos
- Sin cola distribuida (BullMQ/Redis no implementado)
- Sin validacion estricta de schema de payload en runtime
- Escalabilidad limitada por procesamiento en el mismo proceso del API

## Ejecucion

### Opcion A: Frontend Solamente

Util para UI/UX sin procesamiento real.

```bash
npm install
npm run dev
```

Abre: http://localhost:5173

### Opcion B: Frontend + Backend En Local (Sin Docker Para Web)

1. Instala dependencias:

```bash
npm install
cd apps/api
npm install
```

2. Configura entorno frontend (.env en la raiz):

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_TUS_ENDPOINT=http://localhost:1080/files/
```

3. Levanta servicios:

```bash
# Terminal 1 (frontend)
npm run dev

# Terminal 2 (backend)
cd apps/api
npm run dev
```

4. Levanta tusd por Docker (recomendado para pruebas de upload reanudable):

```bash
docker compose up tusd -d
```

### Opcion C: Stack Contenerizado (Docker Compose)

```bash
docker compose up --build
```

Servicios:
- Web (Nginx): http://localhost
- API directa: http://localhost:3000
- tusd directo: http://localhost:1080/files/

Si quieres que el frontend del contenedor web use rutas proxied de Nginx, define antes del build:

```bash
VITE_API_BASE_URL=http://localhost/api
VITE_TUS_ENDPOINT=http://localhost/files/
```

Nota: las variables VITE_* se inyectan en build time de Vite. Si cambian, reconstruye la imagen web.

## Variables De Entorno

### Frontend (raiz)

Ver .env.example:
- VITE_API_BASE_URL: base URL para jobs y polling
- VITE_TUS_ENDPOINT: endpoint Tus para uploads reanudables

### Backend (apps/api)

Ver apps/api/.env.example:
- PORT, HOST
- UPLOADS_DIR, RESULTS_DIR, TEMP_DIR
- FFMPEG_PATH, FFPROBE_PATH
- CORS_ORIGIN
- PUBLIC_API_URL (usada para construir resultUrl absoluto)

## Scripts

### Raiz (frontend)

```bash
npm run dev
npm run dev:open
npm run typecheck
npm run build
npm run preview
```

### apps/api (backend)

```bash
npm run dev
npm run build
npm run start
```

## Contrato API

Documentacion actualizada del contrato en docs/contracts/api.md

## Validacion Operativa Reciente

Validacion ejecutada en local el 2026-04-04 con video real provisto por el usuario:
- Fuente: video MP4 local de 174415760 bytes.
- API: GET /health respondio 200 correctamente.
- Procesamiento: POST /jobs/export completo con estado completed.
- Procesamiento: POST /jobs/extract-audio completo con estado completed.
- Descarga de resultados verificada:
  - Export MP4 descargado (~1216461 bytes).
  - Audio MP3 descargado (~3443182 bytes).

## Estado Documental

Este README fue corregido tras auditoria de codigo para mantener consistencia con el estado tecnico real del repositorio.

## Licencia

MIT