# VideoCut Studio

Editor de video no destructivo con frontend React + Vite y backend Fastify opcional para procesamiento con FFmpeg.

## Autor

Harold Alejandro Villanueva Borda
- Email personal: harrylex8@gmail.com
- Email institucional: harold.villanueva@gmail.com
- Repositorio: https://github.com/HarryLexvb/VideoEdition

---

## Estado actual

Fecha de corte: 2026-04-06

### Frontend (este repositorio raiz)

Funcional y construible sin backend:

- Carga de video local con Uppy (drag & drop o file picker)
- Upload reanudable con Tus (requiere VITE_TUS_ENDPOINT)
- Preview de video nativo (HTMLVideoElement, sin Plyr dependency)
- Timeline con pistas diferenciadas:
  - Pista de video: muestra tira de miniaturas/fotogramas generados con Canvas API
  - Pista de audio: muestra forma de onda generada con Web Audio API (OfflineAudioContext)
- Extraccion de audio LOCAL (sin backend): crea pista de audio visual en el timeline, silencia el video, sin audio doble en la preview
- Segmentos keep/remove con historial undo/redo
- Trim range visual en timeline
- Teclas de atajo: Ctrl+Z / Ctrl+Shift+Z

### Backend (apps/api)

Fastify + FFmpeg. Operativo como MVP. Requerido solo para exportacion y extraccion server-side.

- POST /jobs/export
- POST /jobs/extract-audio
- GET /jobs/:jobId
- GET /results/:filename
- GET /health

---

## Stack real

### Frontend

| Capa | Tecnologia |
|------|-----------|
| Framework | React 19 |
| Bundler | Vite 8 |
| Lenguaje | TypeScript 5.9 |
| Estado | Zustand 5 |
| API async | TanStack React Query 5 |
| Upload | Uppy 5 + Tus |
| Estilos | Tailwind CSS 3 |
| Iconos | Lucide React |
| Thumbnails | Canvas API (nativo) |
| Waveform | Web Audio API OfflineAudioContext (nativo) |
| Router | React Router DOM 6 |

### Backend

| Capa | Tecnologia |
|------|-----------|
| Framework | Fastify |
| Procesamiento | FFmpeg (ffmpeg-static) |
| Upload server | tusd |
| Jobs | En memoria (sin DB) |

---

## Arquitectura de pistas en el timeline

Cuando se carga un video:

```
Timeline
 [VIDEO] [████ fotograma ████ fotograma ████ fotograma ████]  <- Canvas thumbnails
```

Cuando se extrae audio (accion local, sin backend):

```
Timeline
 [VIDEO] [████ fotograma ████ fotograma ████ fotograma ████]  <- Canvas thumbnails (muted)
 [AUDIO] [~~~~~forma de onda Web Audio API~~~~~~~~~~~~~~~~~]  <- OfflineAudioContext
```

Comportamiento:
- Video track muted = true: no suena desde el elemento video
- Audio track muted = false: el waveform es solo visual; el sonido viene del mismo elemento video
  (la pista de audio en el timeline es una representacion visual de que el audio fue separado)
- Sin audio doble: el video element permanece como unica fuente de reproduccion
- Sincronizacion: el playhead de ambas pistas sigue el currentTime del video element

---

## Como ejecutar

### Opcion A - Solo frontend (sin backend)

Funcionalidades disponibles: carga, preview, timeline, extraccion de audio local, segmentos, trim, historial.

```bash
npm install
npm run dev
```

URL: http://localhost:5173

### Opcion B - Frontend + backend en Docker (flujo completo)

Funcionalidades adicionales: exportacion con FFmpeg, extraccion de audio server-side, descarga de resultados.

1. Configurar variables de entorno en la raiz:

```
VITE_API_BASE_URL=http://localhost:3000
VITE_TUS_ENDPOINT=http://localhost:1080/files/
```

2. Levantar servicios:

```bash
# Terminal 1 - frontend
npm install
npm run dev

# Terminal 2 - api + tusd
docker compose up -d api tusd
```

### Opcion C - Stack completo Docker

```bash
docker compose up --build
```

Servicios:
- Web: http://localhost
- API: http://localhost:3000
- Tusd: http://localhost:1080/files/

---

## Scripts

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo Vite |
| `npm run dev:open` | Inicia y abre browser |
| `npm run typecheck` | Verificacion de tipos TypeScript |
| `npm run build` | Typecheck + build de produccion |
| `npm run preview` | Preview del build de produccion |

Backend (`apps/api`):

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Inicia con ts-node-dev |
| `npm run build` | Compila TypeScript |
| `npm run start` | Inicia build compilado |

---

## Variables de entorno

### Frontend (raiz del proyecto)

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| VITE_API_BASE_URL | URL base del backend Fastify | No (solo para jobs backend) |
| VITE_TUS_ENDPOINT | URL del servidor tusd | No (solo para upload reanudable) |

Referencia: `.env.example`

### Backend (apps/api)

| Variable | Default | Descripcion |
|----------|---------|-------------|
| PORT | 3000 | Puerto del servidor |
| HOST | 0.0.0.0 | Host de escucha |
| UPLOADS_DIR | ./uploads | Directorio de archivos subidos |
| RESULTS_DIR | ./results | Directorio de resultados |
| TEMP_DIR | ./temp | Directorio temporal |
| FFMPEG_PATH | auto | Ruta a ffmpeg |
| CORS_ORIGIN | * | Origen permitido en CORS |
| PUBLIC_API_URL | - | URL publica del API para resultUrl |

---

## Funcionalidades implementadas

- [x] Carga de video (local, drag & drop)
- [x] Upload reanudable Tus (opcional)
- [x] Preview de video nativo
- [x] Pista de video en timeline con miniaturas Canvas API
- [x] Extraccion de audio LOCAL (sin backend): pista de audio con waveform Web Audio API
- [x] Sin audio doble en preview tras extraccion
- [x] Segmentos keep/remove en timeline
- [x] Corte en cabezal
- [x] Trim range visual
- [x] Historial undo/redo
- [x] Modo oscuro / claro
- [x] Jobs de exportacion y extraccion en backend (opcional)
- [x] Polling de estado de jobs
- [x] Descarga de resultados procesados

## Deuda tecnica pendiente

- Autenticacion/autorizacion
- Persistencia de jobs (hoy en memoria)
- Cola de trabajo BullMQ + Redis para robustez
- Validacion de schema en runtime (Zod)
- Timeout y politica de reintentos en polling
- Endurecimiento de seguridad y observabilidad
- Tests unitarios e integration

---

## Documentacion relacionada

- Contrato API: `docs/contracts/api.md`
- Plan de correcciones: `PROJECT_FIX_PLAN.md`

---

## Licencia

MIT
