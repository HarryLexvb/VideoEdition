# VideoCut Studio

**Editor de video no destructivo** construido con tecnologías web modernas. VideoCut Studio proporciona una interfaz visual profesional para marcar segmentos de video, gestionar cortes mediante timeline interactiva, y preparar trabajos de exportación que serán procesados por un backend (actualmente no implementado).

## Estado Actual del Proyecto

⚠️ **Importante:** Este proyecto actualmente cuenta **únicamente con frontend funcional**. No existe backend implementado.

El frontend está completamente operativo y preparado para integrarse con un backend futuro mediante contratos API claramente definidos.

## Características Principales

✅ **Interfaz de edición visual completa**
- Timeline interactiva con waveform de audio
- Marcación de segmentos keep/remove
- Preview en tiempo real con Plyr
- Sistema undo/redo profesional (Ctrl+Z / Ctrl+Shift+Z)

✅ **Gestión de archivos**
- Upload local mediante drag & drop
- Soporte para Tus (resumable uploads) preparado
- Preview inmediato sin procesamiento pesado

✅ **Sistema de temas**
- Dark mode y light mode
- Persistencia de preferencia en localStorage
- Detección automática de preferencia del sistema
- Transiciones suaves entre temas

✅ **Arquitectura moderna y escalable**
- Feature-based modular architecture
- TypeScript strict mode
- Separación clara de responsabilidades
- Preparado para integración con backend

## Stack Tecnológico

**Core:**
- React 19.2.4
- TypeScript 5.9.3
- Vite 8.0.1

**Estilos:**
- Tailwind CSS 3.4.17
- CSS Variables para theming dinámico
- Google Fonts (Manrope, Space Grotesk)

**Estado y Data Fetching:**
- Zustand 5.0.12 (estado local + historial undo/redo)
- TanStack Query 5.96.0 (estado servidor + polling preparado)

**Librerías de UI/Funcionalidad:**
- Uppy 5.x (file upload + Tus protocol)
- Plyr 3.8.4 (video player)
- Wavesurfer.js 7.12.5 (waveform + timeline)
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

- **Node.js** 18 o superior
- **npm** 9 o superior

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

**Nota sobre puerto:** Los scripts usan `--strictPort`, por lo que si el puerto 5173 está ocupado, verás un error explícito en lugar de asignarse otro puerto automáticamente.

Para liberar el puerto en Windows si es necesario:
```powershell
$conn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
```

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run dev:open     # Desarrollo + abrir navegador
npm run typecheck    # Verificación de tipos TypeScript
npm run build        # Build de producción
npm run preview      # Preview del build de producción
```

## Variables de Entorno

Copia `.env.example` a `.env` y configura según necesites:

```env
# URL base del backend (obligatorio cuando se implemente backend)
VITE_API_BASE_URL=http://localhost:8080/api

# Endpoint Tus para uploads reanudables (opcional en desarrollo)
VITE_TUS_ENDPOINT=http://localhost:8080/files
```

**Importante:** Actualmente estas variables están preparadas para uso futuro. El frontend funciona completamente en modo local sin necesidad de backend.

## Modo Oscuro (Dark Mode)

El proyecto incluye un sistema de temas completo:

- **Toggle manual:** Botón en la esquina superior derecha del HeaderBar
- **Persistencia:** La preferencia se guarda en localStorage
- **Detección automática:** Si no hay preferencia guardada, se usa `prefers-color-scheme`
- **Cobertura completa:** Todos los componentes, surfaces, textos y estados interactivos soportan ambos temas

## Flujo de Edición Actual (Frontend)

1. Usuario carga un archivo de video mediante Uppy Dashboard
2. Se crea una URL local (blob) para preview inmediato en Plyr
3. WaveSurfer renderiza el waveform usando el elemento `<video>`
4. Usuario marca segmentos en la timeline (cortes)
5. Cada segmento se marca como `keep` o `remove`
6. El sistema undo/redo opera sobre snapshots de estado
7. Al exportar o extraer audio:
   - Se construye un payload con la información de segmentos
   - Se prepara para enviar al backend (cuando esté disponible)
   - TanStack Query realizaría polling del estado del job

**Nota:** Las operaciones de exportación y extracción de audio actualmente construyen el payload correctamente pero requieren un backend para procesarse.

## Preparación para Backend (Futuro)

El frontend está diseñado con contratos API claros preparados para integración:

### Endpoints Esperados

**`POST /jobs/export`**
- Envía información del video y segmentos
- Retorna jobId para seguimiento

**`POST /jobs/extract-audio`**
- Similar a export, enfocado en extracción de audio
- Retorna jobId para seguimiento

**`GET /jobs/:id`**
- Consulta estado de un job (queued, processing, completed, failed)
- TanStack Query realiza polling automático hasta completarse

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

Ver `src/features/editor/api/client.ts` y `src/features/editor/model/projectPayload.ts` para más detalles.

## Build para Producción

```bash
# Generar build optimizado
npm run build

# Preview local del build
npm run preview
```

El build final se genera en el directorio `dist/`.

## Deployment

El proyecto es una SPA (Single Page Application) estándar. Puede desplegarse en:

- **Servicios estáticos:** Vercel, Netlify, GitHub Pages, Cloudflare Pages
- **VPS con Nginx:** Configurar reescritura de rutas para SPA
- **CDN:** Subir contenido de `dist/` a cualquier CDN

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

**Importante:** Si frontend y backend estarán en dominios distintos, habilita CORS en el backend y considera usar HTTPS.

## Próximos Pasos Reales

Para continuar el desarrollo de este proyecto:

1. **Implementar backend:**
   - Endpoints de procesamiento de video (`/jobs/export`, `/jobs/extract-audio`)
   - Sistema de jobs con cola (p. ej., Bull, BullMQ)
   - Procesamiento con FFmpeg
   - Endpoint de estado de jobs (`GET /jobs/:id`)
   - Storage para archivos procesados

2. **Mejorar frontend:**
   - Testing (Vitest + React Testing Library)
   - Linting (ESLint) y formatting (Prettier)
   - Pre-commit hooks (husky + lint-staged)
   - Error boundaries
   - Más keyboard shortcuts
   - Mejoras de accesibilidad (a11y)

3. **DevOps:**
   - CI/CD pipeline
   - Despliegue automatizado
   - Monitoreo y logging
   - CDN para assets estáticos

## Autor

**Harold Alejandro Villanueva Borda**

- Email principal: harrylex8@gmail.com
- Email institucional: harold.villanueva@gmail.com
- GitHub: [@HarryLexvb](https://github.com/HarryLexvb)

## Repositorio

🔗 https://github.com/HarryLexvb/VideoEdition

## Licencia

Este proyecto es privado y de uso personal/educativo.

---

**Última actualización:** Marzo 2026  
**Versión del proyecto:** 0.0.0 (Prototipo funcional de frontend)
