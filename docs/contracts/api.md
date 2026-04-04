# API Contract - VideoEdition

Version: 1.2  
Estado: activo, alineado al codigo y a pruebas reales (2026-04-04)

## Contexto De Arquitectura

Backend implementado en `apps/api` (Fastify + FFmpeg).

Integracion de upload reanudable:
- `tusd` usa hook HTTP hacia `POST /hooks/upload`.
- En `docker-compose.yml`, el hook apunta a `http://api:3000/hooks/upload`.
- Por lo tanto, para upload Tus funcional, `api` y `tusd` deben correr en la misma red Docker.

## Base URLs

Consumo directo de API:

```text
http://localhost:3000
```

Consumo via proxy Nginx (stack web docker):

```text
http://localhost/api
```

## Tus Endpoint

Directo:

```text
http://localhost:1080/files/
```

Via Nginx:

```text
http://localhost/files/
```

## Endpoints

### GET /health

Devuelve salud del proceso API.

Response 200:

```json
{
  "ok": true,
  "timestamp": "2026-04-04T00:00:00.000Z"
}
```

### POST /jobs/export

Encola un job de export de video.

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
    { "id": "seg-1", "start": 0, "end": 10.5, "disposition": "keep" }
  ],
  "meta": {
    "duration": 10.5,
    "keepSegmentCount": 1,
    "removeSegmentCount": 0
  }
}
```

Notas:
- `source.uploadId` es obligatorio.
- El frontend puede enviar campos extra (`trimRange`, `hasTrimRange`, etc.); hoy no son usados por el backend.

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

Mismo contrato de entrada que `POST /jobs/export`.
Salida final esperada: MP3.

Response 202:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "queued",
  "message": "Job de extracción de audio encolado"
}
```

### GET /jobs/:jobId

Consulta estado del job para polling.

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
  "error": "Archivo no encontrado para uploadId: abc123"
}
```

Response 404:

```json
{
  "error": "Job no encontrado"
}
```

### GET /results/:filename

Descarga de artefacto generado.

Headers:
- `Content-Type`
- `Content-Disposition`
- `Content-Length`

Seguridad actual:
- Sanitizacion de `filename` con `path.basename` para evitar path traversal.

Response 404:

```json
{
  "error": "Archivo no encontrado"
}
```

### POST /hooks/upload

Endpoint de hook para eventos de Tusd.

Response 200:

```json
{
  "ok": true
}
```

## Estados De Job

- `queued`
- `processing`
- `completed`
- `failed`

## Catalogo De Errores Operativos Observados

Errores API:
- 400 por falta de `source.uploadId`.
- 404 por job inexistente.
- 404 por resultado inexistente.

Errores de infraestructura (no API de jobs):
- `tusd` puede responder 500 en `pre-create` si no resuelve `http://api:3000/hooks/upload`.
- Este escenario se evita ejecutando `api` + `tusd` juntos en Compose.

## Verificacion E2E Real Ejecutada

Fecha: 2026-04-04

Resultados:
- `GET /health`: OK.
- `POST /jobs/export` con video real: `completed` + descarga MP4 valida.
- `POST /jobs/extract-audio` con video real: `completed` + descarga MP3 valida.
- Hooks de Tusd recibidos por `/hooks/upload`: OK.

## Brechas Pendientes Del Contrato

Pendiente implementar:
- Validacion de schemas de request en runtime.
- Versionado formal de API.
- Contrato de errores uniforme por codigo y categoria.
- AuthN/AuthZ para endpoints de procesamiento.
- Persistencia de jobs en DB/cola.

## Referencias De Codigo

- `apps/api/src/server.ts`
- `apps/api/src/routes/jobs.ts`
- `apps/api/src/routes/results.ts`
- `apps/api/src/routes/hooks.ts`
- `apps/api/src/services/ffmpeg.ts`
- `apps/api/src/services/jobStore.ts`
- `apps/api/src/storage/local.ts`