# Contrato API — Editor Web de Video

Versión: 1.0 — congelada para integración frontend/backend.

---

## Base URL

```
http://localhost:3000   (desarrollo)
http://<VPS_IP>         (producción vía Nginx)
```

## Upload (TUS — tusd)

```
TUS endpoint: http://localhost:1080/files/
```

El frontend usa Uppy con `@uppy/tus`. Al completar el upload, tusd llama al hook:

```
POST /hooks/upload
```

El `uploadId` retornado por tusd se guarda en el store del frontend (`video.uploadId`) y se
incluye en todos los payloads de jobs.

---

## Endpoints

### GET /health

Verificación del estado del servidor.

**Response 200**
```json
{ "ok": true, "timestamp": "2026-04-01T12:00:00.000Z" }
```

---

### POST /jobs/export

Inicia un job de exportación de video con los segmentos conservados.

**Request body**
```json
{
  "source": {
    "fileName": "video.mp4",
    "mimeType": "video/mp4",
    "size": 104857600,
    "uploadId": "abc123"
  },
  "timeline": [
    { "id": "seg-1", "start": 0.000, "end": 10.500, "disposition": "keep" },
    { "id": "seg-2", "start": 10.500, "end": 25.000, "disposition": "remove" },
    { "id": "seg-3", "start": 25.000, "end": 40.000, "disposition": "keep" }
  ],
  "meta": {
    "duration": 40.000,
    "keepSegmentCount": 2,
    "removeSegmentCount": 1
  }
}
```

**Response 202**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Job de exportación encolado"
}
```

**Response 400**
```json
{ "error": "El campo source.uploadId es requerido" }
```

---

### POST /jobs/extract-audio

Misma firma que `/jobs/export`. Extrae el audio de los segmentos conservados en MP3.

**Response 202**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "queued",
  "message": "Job de extracción de audio encolado"
}
```

---

### GET /jobs/:jobId

Consulta el estado de un job. El frontend hace polling cada 2.5 s.

**Response 200 — en proceso**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 55
}
```

**Response 200 — completado**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "resultUrl": "/results/export_abc123.mp4"
}
```

**Response 200 — fallido**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "No hay segmentos marcados para conservar"
}
```

**Response 404**
```json
{ "error": "Job no encontrado" }
```

---

### GET /results/:filename

Descarga el archivo procesado.

| Header | Valor |
|--------|-------|
| Content-Type | `video/mp4` o `audio/mpeg` según extensión |
| Content-Disposition | `attachment; filename="..."` |

---

## Tipos de status

| Status | Descripción |
|--------|-------------|
| `queued` | Job encolado, aún no inició |
| `processing` | FFmpeg procesando |
| `completed` | Archivo listo para descargar |
| `failed` | Error — ver campo `error` |

## Notas de implementación

- El campo `uploadId` corresponde al ID del archivo en tusd (sin extensión).
- FFmpeg usa `-c copy` (sin re-encode) para velocidad. Si se necesita precisión de fotograma exacta, se puede activar re-encode puntual en `services/ffmpeg.ts`.
- Los archivos temporales se limpian automáticamente tras cada job.
- El job store es en memoria (MVP). Para producción: BullMQ + Redis.
