# VideoCut Studio

Editor de video no destructivo construido con tecnologías web modernas. VideoCut Studio proporciona una interfaz visual profesional para cargar videos locales, visualizarlos en una vista previa con controles completos y editar segmentos mediante una línea de tiempo interactiva con waveform de audio.

## Estado Actual del Proyecto

Este proyecto cuenta **únicamente con frontend funcional**. No existe backend implementado.

El frontend está completamente operativo para:
- Cargar videos desde el equipo local del usuario
- Visualizar videos en vista previa con reproductor Plyr profesional
- Generar waveform de audio en línea de tiempo interactiva
- Marcar y editar segmentos keep/remove
- Sistema undo/redo completo
- Dark mode y light mode con persistencia

El frontend está preparado arquitectónicamente para integrarse con un backend futuro mediante contratos API claramente definidos, pero actualmente toda la funcionalidad opera del lado del cliente.

## Características Principales

**Carga de video local**
- Upload mediante drag & drop con Uppy
- Validación de archivos de video
- Tamaño máximo 2 GB
- Creación de Object URL para preview inmediato
- Preparado para Tus (resumable uploads) cuando se configure backend

**Vista previa profesional**
- Reproductor Plyr con controles completos
- Play, pause, seek, mute, volumen
- Control de velocidad (0.5x a 2x)
- Fullscreen
- Detección automática de duración y metadatos
- Sincronización en tiempo real con timeline
- Estado vacío elegante cuando no hay video

**Línea de tiempo interactiva**
- Waveform de audio generado con WaveSurfer.js
- Visualización de todos los segmentos del video
- Segmentos keep (verde) y remove (rojo)
- Click para seleccionar segmentos
- Drag para navegar por el video
- Cursor rojo sincronizado con playhead
- Cortes precisos en posición actual
- Estadísticas de segmentos en tiempo real

**Sistema de edición**
- Marcación de segmentos no destructiva
- Cortes en posición del playhead (Ctrl+K)
- Cambio de disposición keep/remove
- Undo/Redo completo (Ctrl+Z / Ctrl+Shift+Z)
- Historial de cambios con timestamps
- Preview de segmentos seleccionados

**Sistema de temas**
- Dark mode y light mode
- Persistencia en localStorage
- Detección automática de preferencia del sistema
- Transiciones suaves
- Cobertura completa en todos los componentes

## Stack Tecnológico

**Core:**
- React 19.2.4
- TypeScript 5.9.3 (strict mode)
- Vite 8.0.1

**Estilos:**
- Tailwind CSS 3.4.17
- CSS Variables para theming dinámico
- Google Fonts (Manrope, Space Grotesk)

**Estado y Data Fetching:**
- Zustand 5.0.12 (estado local + historial undo/redo)
- TanStack Query 5.96.0 (preparado para estado servidor + polling)

**Librerías de UI/Funcionalidad:**
- Uppy 5.x (file upload + Tus protocol)
- Plyr 3.8.4 (video player profesional)
- Wavesurfer.js 7.12.5 (waveform + timeline + regions)
- Lucide React 1.7.0 (iconografía)
- React Router DOM 6.30.1 (routing SPA)

## Estructura del Proyecto

```
src/
├── features/editor/          # Feature principal de edición
│   ├── api/                  # Cliente HTTP + hooks de TanStack Query
│   ├── components/           # HeaderBar, VideoPlayer, Timeline, Sidebar
│   ├── hooks/                # useVideoUpload (Uppy + Tus)
│   ├── model/                # Tipos, lógica de negocio, transformadores
│   ├── pages/                # EditorPage (orquestación principal)
│   └── store/                # Zustand store con historial undo/redo
├── router/                   # Configuración de rutas (lazy loading)
├── shared/
│   ├── components/           # Button, StatusBadge, ThemeToggle
│   ├── contexts/             # ThemeContext (dark mode)
│   └── lib/                  # Utilidades (formatTime, ids, classnames)
└── styles/                   # Estilos globales y variables CSS
```

## Requisitos Previos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/HarryLexvb/VideoEdition.git
cd VideoEdition

# Instalar dependencias
npm install
```

## Ejecución Local

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# O abrir navegador automáticamente
npm run dev:open
```

El proyecto estará disponible en `http://localhost:5173/`

Los scripts usan `--strictPort`, por lo que si el puerto 5173 está ocupado, verás un error explícito.

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run dev:open     # Desarrollo + abrir navegador
npm run typecheck    # Verificación de tipos TypeScript
npm run build        # Build de producción
npm run preview      # Preview del build de producción
```

## Cómo Usar el Editor

1. **Cargar video:** Click en "Cargar video" en el HeaderBar
2. **Seleccionar archivo:** Arrastra un video o selecciónalo desde el diálogo
3. **Vista previa:** El video aparece automáticamente en el reproductor
4. **Timeline:** La línea de tiempo genera el waveform del audio
5. **Editar:** 
   - Click en la timeline para mover el playhead
   - Click en "Cortar en cabezal" para crear un corte
   - Click en segmentos para seleccionarlos
   - Cambia disposición keep/remove desde el sidebar
6. **Undo/Redo:** Ctrl+Z para deshacer, Ctrl+Shift+Z para rehacer

## Variables de Entorno

Copia `.env.example` a `.env` y configura según necesites:

```env
# URL base del backend (para cuando se implemente)
VITE_API_BASE_URL=http://localhost:8080/api

# Endpoint Tus para uploads reanudables (opcional en desarrollo)
VITE_TUS_ENDPOINT=http://localhost:8080/files
```

**Importante:** Actualmente estas variables están preparadas para uso futuro. El frontend funciona completamente en modo local sin necesidad de backend. Los videos se cargan como Object URLs y se procesan del lado del cliente.

## Sincronización Preview y Timeline

El proyecto implementa sincronización bidireccional entre el reproductor de video y la línea de tiempo:

**Preview → Timeline:**
- Al reproducir el video, el cursor de la timeline se mueve en tiempo real
- La posición se actualiza mediante el evento `timeupdate` del elemento video
- WaveSurfer sincroniza su posición usando `setTime()`

**Timeline → Preview:**
- Al hacer click en la timeline, el video salta a esa posición
- Al seleccionar un segmento, el video se posiciona al inicio del segmento
- Drag to seek habilitado para navegación fluida

## Preparación para Backend (Futuro)

El frontend está diseñado con contratos API claros para integración futura:

### Endpoints Esperados

**`POST /jobs/export`**
- Envía información del video y segmentos marcados
- Retorna jobId para seguimiento con polling

**`POST /jobs/extract-audio`**
- Extracción de audio del video editado
- Retorna jobId para seguimiento

**`GET /jobs/:id`**
- Consulta estado de un job (queued, processing, completed, failed)
- TanStack Query realiza polling automático

### Payload de Ejemplo

```json
{
  "source": {
    "fileName": "video.mp4",
    "mimeType": "video/mp4",
    "size": 12345678,
    "uploadId": "opcional-tus-id"
  },
  "timeline": [
    { "id": "segment_1", "start": 0, "end": 5.2, "disposition": "keep" },
    { "id": "segment_2", "start": 5.2, "end": 12.8, "disposition": "remove" }
  ],
  "meta": {
    "duration": 12.8,
    "keepSegmentCount": 1,
    "removeSegmentCount": 1
  }
}
```

Ver `src/features/editor/api/client.ts` y `src/features/editor/model/projectPayload.ts` para detalles.

## Build para Producción

```bash
# Generar build optimizado
npm run build

# Preview local del build
npm run preview
```

El build final se genera en `dist/`.

## Deployment

El proyecto es una SPA (Single Page Application) estándar. Puede desplegarse en:

- Servicios estáticos: Vercel, Netlify, GitHub Pages, Cloudflare Pages
- VPS con Nginx (configurar reescritura de rutas para SPA)
- CDN: Subir contenido de `dist/` a cualquier CDN

### Ejemplo de configuración Nginx para SPA:

```nginx
server {
  listen 80;
  server_name tu-dominio.com;
  root /ruta/a/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Limitaciones Actuales

**No implementado:**
- Backend para procesamiento de video
- Sistema de jobs con cola
- Procesamiento con FFmpeg
- Export real de video editado
- Extracción real de audio
- Upload reanudable (Tus requiere backend)
- Autenticación y usuarios
- Almacenamiento persistente de proyectos

**Funcional actualmente:**
- Carga de video local
- Vista previa con reproductor completo
- Timeline interactiva con waveform
- Edición no destructiva de segmentos
- Sistema undo/redo
- Dark mode
- Sincronización preview/timeline
- Keyboard shortcuts

## Próximos Pasos

Para continuar el desarrollo:

1. **Backend:**
   - API REST con Express/Fastify
   - Sistema de jobs con Bull/BullMQ
   - Procesamiento con FFmpeg
   - Storage S3/Cloudflare R2
   - Autenticación JWT

2. **Frontend:**
   - Testing (Vitest + React Testing Library)
   - ESLint + Prettier
   - Pre-commit hooks (husky)
   - Error boundaries
   - Más keyboard shortcuts

3. **DevOps:**
   - CI/CD pipeline
   - Deployment automatizado
   - Monitoreo y logging

## Autor

**Harold Alejandro Villanueva Borda**

- Email principal: harrylex8@gmail.com
- Email institucional: harold.villanueva@gmail.com
- GitHub: [@HarryLexvb](https://github.com/HarryLexvb)

## Repositorio

https://github.com/HarryLexvb/VideoEdition

## Licencia

Este proyecto es privado y de uso personal/educativo.

---

**Última actualización:** Marzo 2026
**Versión:** 0.1.0 (Frontend funcional completo)
