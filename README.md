# VideoCut Studio

Editor de video no destructivo con interfaz profesional para cargar videos locales, visualizarlos y editar segmentos mediante línea de tiempo interactiva con waveform.

## Estado Actual

**Frontend 100% funcional - Sin backend implementado**

### Funcionando

- Carga de video con modal visual claro
- Vista previa con Plyr
- **Timeline con WaveSurfer (se genera cuando hay metadatos)**
- Edición de segmentos keep/remove
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- Dark mode completo

### Cómo Usar

1. **Cargar video:** Click en "Cargar video"
2. **Modal visual:** Aparece con "Arrastra tu video aquí"
3. **Seleccionar:** Arrastra o haz click para seleccionar
4. **Esperar:** El video carga metadatos (puede tardar unos segundos)
5. **Timeline:** Se genera automáticamente cuando los metadatos están listos

## DEBUG: Si la Timeline No Aparece

**Abre DevTools (F12) → Console y busca:**

```
[VideoPlayer] Cargando nuevo video: nombre.mp4
[VideoPlayer] URL del video: blob:...
[VideoPlayer] Metadatos cargados - readyState: 1 o superior
[VideoPlayer] Duración detectada: XX.XX
[VideoPlayer] loadedmetadata - Duración: XX.XX segundos
```

**Si NO ves estos logs:**
- El video no se está cargando correctamente
- Prueba con un video diferente (MP4 H.264)
- Verifica que el archivo no esté corrupto

**Si ves los logs pero la duración es 0 o NaN:**
- El navegador no puede leer los metadatos del video
- Prueba con un video más simple (MP4 con H.264/AAC)
- Algunos formatos o códecs no son compatibles

**Si la duración se detecta pero la timeline no aparece:**
- Revisa en footer si dice "Media: conectado"
- Verifica en console: `[EditorPage] mediaElement actualizado`
- Si no aparece, hay un problema de comunicación entre componentes

## Formatos Recomendados

**Videos que funcionan mejor:**
- MP4 con H.264 video + AAC audio
- Resolución 1080p o menor
- Bitrate razonable (no más de 10 Mbps)
- Máximo 2 GB

**Evita:**
- Videos 4K muy pesados
- Códecs raros o poco comunes
- Videos con DRM
- Archivos corruptos

## Stack

**Core:** React 19, TypeScript 5.9, Vite 8
**UI:** Tailwind CSS, Lucide React
**Media:** Uppy (upload), Plyr (player), WaveSurfer (timeline)
**Estado:** Zustand, TanStack Query

## Instalación

```bash
git clone https://github.com/HarryLexvb/VideoEdition.git
cd VideoEdition
npm install
npm run dev  # http://localhost:5173
```

## Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Producción
```

## Limitaciones

**No implementado:**
- Export real de video
- Extracción de audio
- Procesamiento FFmpeg
- Backend/API
- Storage persistente

## Próximos Pasos

1. Backend con Express/Fastify
2. Jobs con Bull/BullMQ
3. Procesamiento con FFmpeg
4. Storage S3/R2

## Autor

**Harold Alejandro Villanueva Borda**
- harrylex8@gmail.com
- harold.villanueva@gmail.com
- [@HarryLexvb](https://github.com/HarryLexvb)

## Repositorio

https://github.com/HarryLexvb/VideoEdition

---

**v0.1.3** - Debug mejorado para detección de metadatos
**Última actualización:** Marzo 2026
