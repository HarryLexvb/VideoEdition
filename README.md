# VideoCut Studio

Editor de video no destructivo construido con tecnologías web modernas. Interfaz profesional para cargar videos locales, visualizarlos con controles completos y editar segmentos mediante línea de tiempo interactiva con waveform.

## Estado Actual

**Frontend 100% funcional - Sin backend implementado**

### Funcionalidades Operativas

**Carga de video intuitiva:**
- Modal visual con instrucciones claras y prominentes
- Banner destacado: "Arrastra tu video aquí"
- Iconos visuales (FileVideo, Upload)
- Badges con información: "Máximo 2 GB", formatos soportados
- Drag & drop completamente funcional
- Cierre automático al cargar el video

**Vista previa profesional:**
- Reproductor Plyr con controles completos
- Play, pause, seek, mute, volumen, fullscreen
- Control de velocidad (0.5x a 2x)
- Detección automática de metadatos
- Sincronización en tiempo real con timeline

**Línea de tiempo interactiva:**
- Waveform de audio generado automáticamente con WaveSurfer.js
- Se genera cuando el video tiene metadatos cargados
- Visualización de segmentos keep (verde) y remove (rojo)
- Click para seleccionar y navegar
- Cursor rojo sincronizado con reproducción
- Estadísticas visuales

**Edición no destructiva:**
- Cortes en posición del playhead
- Cambio de disposición keep/remove
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- Historial completo con timestamps

**Dark mode:**
- Persistencia en localStorage
- Detección automática de preferencia del sistema
- Cobertura completa

### Cómo Funciona

1. **Cargar:** Click en "Cargar video" → Modal con instrucciones visuales claras
2. **Arrastra o selecciona:** El área muestra claramente qué hacer
3. **Espera:** El video carga metadatos (duración, dimensiones)
4. **Timeline:** Se genera automáticamente cuando los metadatos están listos
5. **Edita:** Usa los controles para marcar segmentos

### Debug y Monitoreo

El footer muestra información de debug:
- Estado del mediaElement: "conectado" o "desconectado"
- Video cargado con su nombre y duración
- Logs en consola del navegador para troubleshooting

## Stack Tecnológico

**Core:**
- React 19.2.4
- TypeScript 5.9.3 (strict)
- Vite 8.0.1

**UI:**
- Tailwind CSS 3.4.17
- Lucide React 1.7.0
- Google Fonts

**Estado:**
- Zustand 5.0.12 (estado + undo/redo)
- TanStack Query 5.96.0

**Media:**
- Uppy 5.x (upload)
- Plyr 3.8.4 (player)
- Wavesurfer.js 7.12.5 (timeline)

## Instalación

```bash
git clone https://github.com/HarryLexvb/VideoEdition.git
cd VideoEdition
npm install
```

## Ejecución

```bash
npm run dev        # Desarrollo en http://localhost:5173
npm run build      # Build de producción
```

## Troubleshooting

**Modal aparece vacío:**
- Solucionado en v0.1.2
- Ahora muestra banner visual prominente con instrucciones
- Iconos, badges y texto claramente visible

**Timeline no aparece:**
- La timeline se genera automáticamente
- Requiere que el video cargue metadatos
- Verifica en consola: `[EditorPage] Video seleccionado`
- Verifica en footer: `Media: conectado`
- Si persiste: abre DevTools → Console para ver logs

**Video no se reproduce:**
- Verifica formato compatible: MP4, WebM, MOV
- Verifica tamaño (máximo 2 GB)
- Verifica que el navegador soporte el códec

## Logs de Debug

Abre DevTools (F12) → Console para ver:
```
[EditorPage] Video seleccionado: nombre.mp4 URL creada: blob:...
[EditorPage] mediaElement actualizado: Video element disponible
[EditorPage] Video en store: nombre.mp4 (120.5s)
```

Si no ves estos logs, el video no se está cargando correctamente.

## Limitaciones

**No implementado (requiere backend):**
- Export real de video editado
- Extracción de audio
- Procesamiento con FFmpeg
- Sistema de jobs
- Upload reanudable Tus
- Almacenamiento persistente

**Funcional actualmente:**
- Carga de video local ✓
- Preview con Plyr ✓
- Timeline con WaveSurfer ✓
- Edición de segmentos ✓
- Undo/Redo ✓
- Dark mode ✓

## Próximos Pasos

Para completar el proyecto:

1. **Backend API**
   - Express/Fastify
   - Endpoints: POST `/jobs/export`, `/jobs/extract-audio`, GET `/jobs/:id`

2. **Procesamiento**
   - Bull/BullMQ para jobs
   - FFmpeg para video
   - S3/R2 para storage

3. **Autenticación**
   - JWT
   - Proyectos guardados

## Autor

**Harold Alejandro Villanueva Borda**

- harrylex8@gmail.com
- harold.villanueva@gmail.com
- GitHub: [@HarryLexvb](https://github.com/HarryLexvb)

## Repositorio

https://github.com/HarryLexvb/VideoEdition

---

**Versión:** 0.1.2 (Modal con instrucciones visuales claras + debug mejorado)
**Última actualización:** Marzo 2026
