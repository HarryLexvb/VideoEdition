# VideoCut Studio

Editor de video no destructivo con frontend React + Vite y backend Fastify + FFmpeg + OpenAI Whisper.

## Autor

Harold Alejandro Villanueva Borda
- Email: harrylex8@gmail.com
- Repositorio: https://github.com/HarryLexvb/VideoEdition

---

## Funcionalidades

### Frontend (sin backend requerido)
- Carga de video local con Uppy (drag & drop o file picker)
- Upload reanudable con Tus (requiere `VITE_TUS_ENDPOINT`)
- Preview de video nativo (HTMLVideoElement)
- Timeline con pistas diferenciadas:
  - **Pista de video**: tira de miniaturas generadas con Canvas API
  - **Pista de audio**: forma de onda generada con Web Audio API (OfflineAudioContext)
- Extraccion de audio local (sin backend): crea pista de audio visual, silencia el video
- Segmentos keep/remove con historial undo/redo
- Capturas de fotogramas por segmento
- Trim range visual en timeline
- Extraccion personalizada por rangos
- Modo oscuro / claro
- Atajos de teclado: `Ctrl+Z` / `Ctrl+Shift+Z`

### Backend (requiere Docker o `apps/api`)
- Exportacion de video con FFmpeg (segmentos keep concatenados, sin re-encode)
- Extraccion de audio por segmento (MP3 individual por segmento keep)
- **Transcripcion automatica con OpenAI Whisper** — genera `transcripcion.txt` incluido en el ZIP
- Descarga en ZIP organizado por carpetas (audio + capturas + transcripcion por segmento)
- Polling de estado de jobs en tiempo real

---

## Stack

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
| ZIP client-side | JSZip |
| Router | React Router DOM 6 |

### Backend

| Capa | Tecnologia |
|------|-----------|
| Framework | Fastify 4 |
| Procesamiento de video/audio | FFmpeg (fluent-ffmpeg) |
| Transcripcion | OpenAI Whisper (whisper-1) |
| Upload server | tusd |
| Empaquetado | archiver |
| Jobs | En memoria (Map) |

### Infraestructura

| Componente | Tecnologia |
|-----------|-----------|
| Contenedores | Docker + Docker Compose |
| Proxy / SPA | Nginx |
| VPS recomendado | Hostinger KVM (Ubuntu) |

---

## Endpoints del backend

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/jobs/export` | Exportar video (segmentos keep concatenados) |
| `POST` | `/jobs/extract-audio` | Extraer audio MP3 por segmento |
| `POST` | `/jobs/transcribe` | Transcribir segmentos de audio con Whisper |
| `GET` | `/jobs/:jobId` | Estado del job (polling) |
| `GET` | `/results/:filename` | Descargar archivo procesado |
| `POST` | `/results/zip-segments` | ZIP organizado (audio + capturas + transcripcion.txt) |
| `POST` | `/results/zip` | ZIP simple de archivos |
| `POST` | `/hooks/upload` | Webhook tusd (post-finish) |

---

## Flujo de transcripcion

1. Subir video → extraer audio (genera MP3 por segmento en el servidor)
2. El botton **"Transcripcion"** aparece cuando los segmentos estan listos
3. Click → job asincronico a OpenAI Whisper por cada segmento
4. Cuando completa, el boton cambia a **"Transcripcion lista"**
5. Descargar ZIP → incluye `transcripcion.txt` en la raiz con el texto de cada segmento:

```
=== Segmento 1 (0:12 - 0:18) ===
Texto transcrito del primer segmento.

=== Segmento 2 (1:25 - 1:40) ===
Texto transcrito del segundo segmento.
```

---

## Como ejecutar

### Opcion A — Solo frontend (sin backend)

```bash
npm install
npm run dev
# http://localhost:5173
```

Funcionalidades disponibles: carga, preview, timeline, extraccion de audio local, segmentos, trim, historial, capturas.

### Opcion B — Frontend + backend en Docker

```bash
# 1. Crear .env en la raiz (ver Variables de entorno)
# 2. Levantar
docker compose up -d api tusd
npm run dev
```

### Opcion C — Stack completo en Docker

```bash
docker compose up --build -d
# Web: http://localhost
# API: http://localhost:3000
# Tusd: http://localhost:1080/files/
```

---

## Variables de entorno

Copia `.env.example` como `.env` en la raiz y como `apps/api/.env`.

### Frontend / Docker build (`raiz/.env`)

| Variable | Default Docker | VPS |
|----------|---------------|-----|
| `VITE_API_BASE_URL` | `http://127.0.0.1:3000` | `https://tudominio.com/api` |
| `VITE_TUS_ENDPOINT` | `http://127.0.0.1:1080/files/` | `https://tudominio.com/files/` |
| `PUBLIC_API_URL` | `http://127.0.0.1:3000` | `https://tudominio.com/api` |
| `CORS_ORIGIN` | `*` | `https://tudominio.com` |
| `OPENAI_API_KEY` | — | `sk-proj-...` (requerido para transcripcion) |

### Backend (`apps/api/.env`)

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `HOST` | `0.0.0.0` | Host de escucha |
| `UPLOADS_DIR` | `./uploads` | Directorio de archivos subidos por tusd |
| `RESULTS_DIR` | `./results` | Directorio de resultados procesados |
| `TEMP_DIR` | `./temp` | Directorio temporal FFmpeg |
| `FFMPEG_PATH` | auto | Ruta a binario ffmpeg |
| `FFPROBE_PATH` | auto | Ruta a binario ffprobe |
| `CORS_ORIGIN` | `*` | Origen permitido en CORS |
| `PUBLIC_API_URL` | `http://localhost:3000` | URL publica para construir resultUrls |
| `OPENAI_API_KEY` | — | API key de OpenAI (requerida para transcripcion) |

> Los archivos `.env` y `apps/api/.env` estan en `.gitignore` — nunca se suben al repositorio.

---

## Deploy en VPS (Hostinger via SSH + GitHub)

### 1. Instalar Docker (una sola vez)

```bash
ssh usuario@IP_VPS
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit && ssh usuario@IP_VPS   # reconectar para aplicar grupo
docker --version && docker compose version
```

### 2. Configurar SSH key para GitHub (una sola vez)

```bash
ssh-keygen -t ed25519 -C "vps-videoedition" -f ~/.ssh/github_vps -N ""
cat ~/.ssh/github_vps.pub   # copiar este output
```

Pegar la clave en **GitHub → Settings → SSH and GPG keys → New SSH key**.

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/github_vps
  StrictHostKeyChecking no
EOF
ssh -T git@github.com   # debe responder: Hi HarryLexvb!
```

### 3. Clonar y configurar

```bash
git clone git@github.com:HarryLexvb/VideoEdition.git
cd VideoEdition

# .env de produccion (raiz)
cat > .env << 'EOF'
VITE_API_BASE_URL=https://TUDOMINIO.COM/api
VITE_TUS_ENDPOINT=https://TUDOMINIO.COM/files/
PUBLIC_API_URL=https://TUDOMINIO.COM/api
CORS_ORIGIN=https://TUDOMINIO.COM
OPENAI_API_KEY=sk-proj-TUKEY
EOF

# .env del backend
cat > apps/api/.env << 'EOF'
OPENAI_API_KEY=sk-proj-TUKEY
EOF
```

### 4. Primer deploy

```bash
docker compose up --build -d
docker compose ps   # los 3 servicios deben estar "Up"
```

### 5. Actualizar con nuevos cambios

```bash
ssh usuario@IP_VPS
cd VideoEdition
git pull origin main
docker compose up --build -d
```

---

## Scripts

### Frontend (raiz)

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de produccion |
| `npm run preview` | Preview del build |
| `npm run typecheck` | Verificacion de tipos TypeScript |

### Backend (`apps/api`)

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Desarrollo con hot reload (tsx watch) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run start` | Inicia build compilado |

---

## Arquitectura de contenedores

```
           Browser
              │
         port 80 (HTTP)
              │
        ┌─────▼─────┐
        │   Nginx   │  (contenedor web)
        │  SPA +    │
        │  Proxy    │
        └──┬─────┬──┘
           │     │
      /api/│     │/files/
           │     │
    ┌──────▼─┐ ┌─▼──────┐
    │  API   │ │  tusd  │
    │Fastify │ │ :8080  │
    │ :3000  │ └────────┘
    │FFmpeg  │
    │Whisper │
    └────────┘
```

Volumenes Docker compartidos entre `api` y `tusd`:
- `uploads_data` — archivos subidos por el usuario
- `results_data` — MP3 y videos exportados
- `temp_data` — archivos temporales de FFmpeg

---

## Deuda tecnica

- Autenticacion / autorizacion
- Persistencia de jobs (hoy en memoria — se pierden al reiniciar)
- Cola de trabajo con BullMQ + Redis
- Validacion de schema en runtime (Zod)
- Tests unitarios e integracion
- SSL/HTTPS directo en nginx (hoy se asume terminacion SSL externa)

---

## Licencia

MIT
