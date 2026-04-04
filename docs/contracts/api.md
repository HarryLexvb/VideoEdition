# Contrato API - VideoEdition

Version: 1.1 (alineada al codigo actual)

Estado del backend: parcial operativo (MVP).

## Base URL

Hay dos formas de consumir la API:

1. Directa al contenedor/proceso API:

```text
http://localhost:3000
```

2. Via Nginx (cuando web corre en Docker Compose):

```text
http://localhost/api
```

Nota: en Nginx existe proxy /api/ -> api:3000/.

## Upload (Tus)

Endpoints validos segun despliegue:

```text
http://localhost:1080/files/   (tusd directo)
http://localhost/files/        (via Nginx)
```

Al finalizar upload, tusd notifica:

```text
POST /hooks/upload
```

## Endpoints

### GET /health

Health check del backend.

Response 200:

```json
{
  "ok": true,
  "timestamp": "2026-04-04T00:00:00.000Z"
}
```

### POST /jobs/export

Encola y procesa un job de exportacion de video.

Body minimo requerido:

```json
{
  "source": {
    "fileName": "video.mp4",
    "mimeType": "video/mp4",
    "size": 104857600,
    "uploadId": "abc123"
  },
  "timeline": [
    { "id": "seg-1", "start": 0, "end": 10.5, "disposition": "keep" },
    { "id": "seg-2", "start": 10.5, "end": 18.2, "disposition": "remove" }
  ],
  "meta": {
    "duration": 18.2,
    "keepSegmentCount": 1,
    "removeSegmentCount": 1
  }
}
```

Campos adicionales enviados por frontend (por ejemplo trimRange, hasTrimRange, trimDuration) hoy son aceptados pero no son usados por la logica de backend actual.

Response 202:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Job de exportación encolado"
}
```

Response 400:

```json
{
  "error": "El campo source.uploadId es requerido"
}
```

### POST /jobs/extract-audio

Mismo contrato de entrada que /jobs/export. Genera salida MP3.

Response 202:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "queued",
  "message": "Job de extracción de audio encolado"
}
```

### GET /jobs/:jobId

Consulta de estado para polling desde frontend.

Response 200 (processing):

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 55
}
```

Response 200 (completed):

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "resultUrl": "http://localhost:3000/results/export_abc123.mp4"
}
```

Response 200 (failed):

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "No hay segmentos marcados para conservar"
}
```

Response 404:

```json
{
  "error": "Job no encontrado"
}
```

### GET /results/:filename

Entrega el archivo procesado desde RESULTS_DIR.

Headers esperados:
- Content-Type: video/mp4, audio/mpeg, etc.
- Content-Disposition: attachment; filename="..."
- Content-Length: tamano del archivo

Seguridad implementada:
- Sanitizacion de filename via path.basename para evitar path traversal.

### POST /hooks/upload

Endpoint de hook para tusd (actualmente loguea el evento y responde ok).

Response 200:

```json
{
  "ok": true
}
```

## Estados de Job

- queued
- processing
- completed
- failed

## Alcance Real Del MVP

Implementado:
- API Fastify funcional
- Procesamiento FFmpeg para export y extract-audio
- Descarga de resultados
- Integracion con uploads Tus por uploadId

No implementado todavia:
- Autenticacion y autorizacion
- Base de datos
- Cola persistente de jobs (BullMQ/Redis)
- Validacion de schema en runtime
- Rate limiting y politicas de seguridad avanzadas

## Validacion E2E Ejecutada

Validacion local ejecutada el 2026-04-04 con un video real:
- GET /health: 200 OK.
- POST /jobs/export: job encolado y completado, con descarga de MP4 valida.
- POST /jobs/extract-audio: job encolado y completado, con descarga de MP3 valida.
- GET /results/:filename: entrega correcta de archivos generados.

## Referencias De Codigo

- apps/api/src/server.ts
- apps/api/src/routes/jobs.ts
- apps/api/src/routes/results.ts
- apps/api/src/routes/hooks.ts
- apps/api/src/services/ffmpeg.ts
- apps/api/src/services/jobStore.ts
- apps/api/src/storage/local.ts