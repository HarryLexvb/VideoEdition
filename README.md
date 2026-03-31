# VideoCut Studio

Editor de video no destructivo construido con tecnologías web modernas. VideoCut Studio proporciona una interfaz visual profesional para cargar videos locales, visualizarlos en una vista previa con controles completos y editar segmentos mediante una línea de tiempo interactiva con waveform de audio.

## Estado Actual del Proyecto

Este proyecto cuenta **únicamente con frontend funcional**. No existe backend implementado.

### Funcionalidades Operativas

**Carga de video:**
- Modal intuitivo con instrucciones claras ("Arrastra tu video aquí o haz click para seleccionar")
- Drag & drop funcional
- Validación de archivos de video
- Tamaño máximo 2 GB
- Cierre automático del modal al cargar el video
- Preview inmediato con Object URL

**Vista previa:**
- Reproductor Plyr profesional con controles completos
- Play, pause, seek, mute, volumen, fullscreen
- Control de velocidad (0.5x a 2x)
- Detección automática de duración y metadatos
- Sincronización en tiempo real con timeline
- Estado vacío elegante cuando no hay video cargado

**Línea de tiempo interactiva:**
- Waveform de audio generado con WaveSurfer.js
- Visualización de todos los segmentos del video
- Segmentos keep (verde) y remove (rojo)
- Click para seleccionar y navegar
- Drag to seek
- Cursor rojo sincronizado con playhead
- Cortes precisos en posición actual
- Estadísticas visuales de segmentos

**Sistema de edición:**
- Marcación de segmentos no destructiva
- Cortes con botón o teclas
- Cambio de disposición keep/remove
- Undo/Redo completo (Ctrl+Z / Ctrl+Shift+Z)
- Historial de cambios con timestamps

**Sistema de temas:**
- Dark mode y light mode
- Persistencia en localStorage
- Detección automática de preferencia del sistema
- Transiciones suaves

### Limitaciones Actuales

**No implementado (requiere backend):**
- Export real de video editado
- Extracción de audio procesada
- Procesamiento con FFmpeg
- Sistema de jobs con cola
- Upload reanudable Tus (sin endpoint)
- Almacenamiento persistente de proyectos
- Autenticación y usuarios

**Conocido (frontend):**
- La línea de tiempo se genera automáticamente al cargar el video
- El modal de carga muestra instrucciones claras
- Todo el procesamiento es visual, no hay renderizado real del video

## Stack Tecnológico

**Core:**
- React 19.2.4
- TypeScript 5.9.3 (strict mode)
- Vite 8.0.1

**Estilos:**
- Tailwind CSS 3.4.17
- CSS Variables para theming dinámico
- Google Fonts (Manrope, Space Grotesk)

**Estado:**
- Zustand 5.0.12 (estado local + historial undo/redo)
- TanStack Query 5.96.0 (preparado para estado servidor)

**Librerías UI:**
- Uppy 5.x (file upload)
- Plyr 3.8.4 (video player)
- Wavesurfer.js 7.12.5 (waveform + timeline + regions)
- Lucide React 1.7.0 (iconografía)
- React Router DOM 6.30.1 (routing)

## Estructura del Proyecto

```
src/
├── features/editor/          # Feature principal de edición
│   ├── api/                  # Cliente HTTP + hooks
│   ├── components/           # HeaderBar, VideoPlayer, Timeline, Sidebar
│   ├── hooks/                # useVideoUpload (Uppy)
│   ├── model/                # Tipos, lógica de negocio
│   ├── pages/                # EditorPage (orquestación)
│   └── store/                # Zustand store con undo/redo
├── router/                   # Configuración de rutas
├── shared/
│   ├── components/           # Button, StatusBadge, ThemeToggle
│   ├── contexts/             # ThemeContext (dark mode)
│   └── lib/                  # Utilidades
└── styles/                   # Estilos globales
```

## Instalación

```bash
git clone https://github.com/HarryLexvb/VideoEdition.git
cd VideoEdition
npm install
```

## Ejecución Local

```bash
# Desarrollo
npm run dev

# Desarrollo + abrir navegador
npm run dev:open
```

Disponible en `http://localhost:5173/`

## Cómo Usar el Editor

1. **Cargar video:**
   - Click en "Cargar video" en el HeaderBar
   - Se abre un modal con instrucciones claras
   - Arrastra tu video o haz click para seleccionar
   - El modal se cierra automáticamente al cargar

2. **Vista previa:**
   - El video aparece en el reproductor Plyr
   - Usa los controles para reproducir/pausar
   - Ajusta la velocidad si lo necesitas

3. **Timeline:**
   - La línea de tiempo se genera automáticamente
   - El waveform muestra el audio del video
   - El cursor rojo se sincroniza con la reproducción

4. **Editar:**
   - Click en la timeline para mover el playhead
   - Click en "Cortar en cabezal" para crear un corte
   - Click en segmentos para seleccionarlos
   - Cambia disposición keep/remove desde el sidebar

5. **Undo/Redo:**
   - Ctrl+Z para deshacer
   - Ctrl+Shift+Z para rehacer

## Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run dev:open     # Desarrollo + abrir navegador
npm run typecheck    # Verificación TypeScript
npm run build        # Build de producción
npm run preview      # Preview del build
```

## Variables de Entorno (Futuro)

```env
# Para cuando se implemente backend
VITE_API_BASE_URL=http://localhost:8080/api
VITE_TUS_ENDPOINT=http://localhost:8080/files
```

Actualmente el frontend funciona sin estas variables. Los videos se cargan como Object URLs del lado del cliente.

## Sincronización Preview y Timeline

**Preview → Timeline:**
- Al reproducir el video, el cursor de la timeline se mueve en tiempo real
- Actualización mediante evento `timeupdate` del elemento video
- WaveSurfer sincroniza con `setTime()`

**Timeline → Preview:**
- Click en la timeline posiciona el video
- Seleccionar segmento mueve al inicio
- Drag to seek habilitado

## Build para Producción

```bash
npm run build
npm run preview
```

Output en `dist/` (~869 KB, gzipped: ~245 KB)

## Deployment

SPA estándar, compatible con:
- Vercel, Netlify, GitHub Pages
- VPS con Nginx (configurar reescritura de rutas)
- CDN para contenido estático

**Ejemplo Nginx:**
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

## Próximos Pasos para Backend

Para completar el proyecto se necesita:

1. **Backend API:**
   - Express/Fastify con endpoints de jobs
   - POST `/jobs/export` y `/jobs/extract-audio`
   - GET `/jobs/:id` para polling

2. **Procesamiento:**
   - Sistema de jobs con Bull/BullMQ
   - FFmpeg para procesamiento de video
   - Merge de segmentos keep
   - Eliminación de segmentos remove

3. **Storage:**
   - S3/Cloudflare R2 para videos procesados
   - Upload reanudable con Tus

4. **Autenticación:**
   - JWT para usuarios
   - Gestión de proyectos guardados

## Mejoras Futuras Frontend

- Testing (Vitest + React Testing Library)
- ESLint + Prettier
- Pre-commit hooks (husky)
- Error boundaries
- Más keyboard shortcuts
- Export/Import de proyecto como JSON

## Problemas Conocidos y Soluciones

**P: El modal de carga está en blanco**
R: Corregido. Ahora muestra claramente "Arrastra tu video aquí o haz click para seleccionar"

**P: La timeline no aparece aunque haya video**
R: La timeline se genera automáticamente al cargar el video. Verifica que el archivo sea un video válido.

**P: El video no se reproduce**
R: Verifica que el formato sea compatible con el navegador (MP4, WebM, OGG)

## Autor

**Harold Alejandro Villanueva Borda**

- Email principal: harrylex8@gmail.com
- Email institucional: harold.villanueva@gmail.com
- GitHub: [@HarryLexvb](https://github.com/HarryLexvb)

## Repositorio

https://github.com/HarryLexvb/VideoEdition

## Licencia

Proyecto privado y de uso personal/educativo.

---

**Última actualización:** Marzo 2026
**Versión:** 0.1.1 (Modal de carga mejorado, instrucciones claras)
