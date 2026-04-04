# VideoCut Studio

Editor de video no destructivo con frontend React y backend Fastify para procesamiento con FFmpeg.

## Estado Actual (Verificado)

Fecha de corte: 2026-04-04

Clasificacion tecnica real:
- Frontend: funcional para carga, preview, timeline, trim, segmentos e historial.
- Backend: parcial operativo (MVP), con API real, jobs y salida de archivos.
- Infra de upload: funcional con Tus (`tusd`) cuando `api` y `tusd` corren en la misma red Docker.

No es correcto describir este repo como frontend-only.

## Resumen Ejecutivo Para El Equipo

Logros confirmados:
- Flujo completo de upload + export + extract-audio funcional.
- Contrato frontend/backend operativo en endpoints de jobs.
- Descarga de resultados validada (`/results/:filename`).
- Problemas criticos recientes de ejecucion corregidos.

Situacion productiva:
- Proyecto usable para demo tecnica y pruebas de flujo.
- Aun no listo para produccion (sin auth, sin DB, sin cola persistente, sin endurecimiento).

## Arquitectura Real Del Repositorio

### Frontend
- React + Vite + TypeScript.
- Estado local con Zustand.
- Integracion API con React Query.
- Upload con Uppy + Tus opcional.

### Backend
- Fastify (`apps/api/src/server.ts`).
- Rutas:
  - `GET /health`
  - `POST /jobs/export`
  - `POST /jobs/extract-audio`
  - `GET /jobs/:jobId`
  - `GET /results/:filename`
  - `POST /hooks/upload`
- Procesamiento con FFmpeg (`apps/api/src/services/ffmpeg.ts`).
- Storage local (`uploads`, `results`, `temp`).
- Job store en memoria (`apps/api/src/services/jobStore.ts`).

### Infra Upload
- `tusd` en Docker Compose.
- Hook configurado a `http://api:3000/hooks/upload`.
- Implicacion: para upload reanudable funcional, `api` y `tusd` deben convivir en la red de Compose.

## Incidentes Recientes Resueltos

### 1) Upload completaba mal y faltaba `source.uploadId`
Sintoma:
- UI mostraba errores como `El campo source.uploadId es requerido` al exportar/extract.

Causa raiz:
- `tusd` corria en Docker, `api` corria local.
- Hook de `tusd` apuntaba a `http://api:3000/hooks/upload` (host no resolvible fuera de red Docker).

Correccion aplicada:
- Ejecucion recomendada: frontend local + `docker compose up -d api tusd`.
- Guard en frontend para bloquear envio de jobs si no existe `uploadId`.

Estado:
- Resuelto y validado.

### 2) Preview y timeline quedaban en gris/estaticos
Sintoma:
- Video subia, pero no reproducia en preview y timeline no reaccionaba.

Causa raiz:
- Inicializacion inestable del preview y falta de reinicializacion consistente del timeline por cambio de source.

Correccion aplicada:
- Flujo de preview estabilizado con `video` nativo.
- Timeline reinicializado por URL de media activa.

Estado:
- Resuelto y validado.

## Validacion Tecnica Ejecutada

Validaciones reales realizadas el 2026-04-04:
- `npm run typecheck` (frontend): OK.
- `npm run build` en `apps/api`: OK.
- `GET /health`: 200 OK.
- Upload Tus minimo de prueba: creacion y patch OK.
- Hooks `tusd -> api`: eventos recibidos en `/hooks/upload`.
- E2E con video real del usuario:
  - Export job: `completed` + descarga MP4.
  - Extract-audio job: `completed` + descarga MP3.

## Como Ejecutar Correctamente

### Opcion A - Solo Frontend

Uso: UI/UX sin procesamiento real backend.

```bash
npm install
npm run dev
```

URL: `http://localhost:5173`

### Opcion B - Recomendada Para Flujo Completo Local

Frontend local + API/Tusd en Docker.

1. Instalar frontend:

```bash
npm install
```

2. Configurar `.env` en raiz:

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_TUS_ENDPOINT=http://localhost:1080/files/
```

3. Levantar servicios:

```bash
# Terminal 1
npm run dev

# Terminal 2
docker compose up -d api tusd
```

### Opcion C - Stack Completo Docker

```bash
docker compose up --build
```

Servicios:
- Web: `http://localhost`
- API: `http://localhost:3000`
- Tusd: `http://localhost:1080/files/`

## Variables De Entorno

### Frontend (raiz)
- `VITE_API_BASE_URL`
- `VITE_TUS_ENDPOINT`

Referencia: `.env.example`

### Backend (`apps/api`)
- `PORT`, `HOST`
- `UPLOADS_DIR`, `RESULTS_DIR`, `TEMP_DIR`
- `FFMPEG_PATH`, `FFPROBE_PATH`
- `CORS_ORIGIN`
- `PUBLIC_API_URL`

Referencia: `apps/api/.env.example`

## Scripts

Raiz:
- `npm run dev`
- `npm run dev:open`
- `npm run typecheck`
- `npm run build`
- `npm run preview`

`apps/api`:
- `npm run dev`
- `npm run build`
- `npm run start`

## Estado Funcional (Que Ya Hace)

Implementado:
- Carga de video local.
- Upload reanudable Tus.
- Preview de video.
- Timeline y segmentos keep/remove.
- Trim range visual y acciones de historial.
- Creacion de jobs backend.
- Polling de estado de jobs.
- Descarga de resultados procesados.

## Deuda Tecnica Y Faltantes

Pendiente para siguiente fase:
- Autenticacion/autorizacion.
- Persistencia real de jobs (hoy en memoria).
- Base de datos para proyectos/historial.
- Cola de trabajo (BullMQ + Redis) para robustez y escalado.
- Validacion de schema en runtime para payloads.
- Timeout y politicas de reintento de polling en frontend.
- Endurecimiento de seguridad y observabilidad.

## Prioridad Recomendada (Proxima Iteracion)

1. Implementar timeout de polling y UX de reintento.
2. Migrar job store en memoria a cola persistente.
3. Agregar validacion de payloads en backend.
4. Agregar persistencia de metadata de jobs/resultados.
5. Agregar autenticacion minima para endpoints de procesamiento.

## Documentacion Relacionada

- Contrato API: `docs/contracts/api.md`
- Plan y registro de correcciones: `PROJECT_FIX_PLAN.md`

## Licencia

MIT