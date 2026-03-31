# VideoCut Studio

> Editor de video no destructivo con interfaz profesional para cargar, visualizar y editar videos locales mediante timeline interactivo con waveform.

## 🎯 Estado Actual

**Frontend funcional al 100% - Backend no implementado**

### ✅ Funcionalidades Implementadas

- ✨ Carga local de videos (hasta 2GB)
- 🎬 Preview con controles profesionales (Plyr)
- 🎵 Timeline interactivo con visualización de waveform (WaveSurfer.js)
- ✂️ Sistema de segmentos con marcado keep/remove
- ↩️ Undo/Redo completo (Ctrl+Z / Ctrl+Shift+Z)
- 🌓 Dark mode
- 📦 Gestión de estado con Zustand
- 🎨 UI responsive con Tailwind CSS
- 🚀 Drag and drop y click para cargar archivos

### 🚧 Limitaciones Actuales

**No implementado (futuro roadmap):**
- Export real de video
- Extracción de audio
- Procesamiento con FFmpeg
- Backend/API
- Storage persistente
- Sistema de jobs

## 🛠️ Stack Tecnológico

| Categoría | Tecnologías |
|-----------|-------------|
| **Core** | React 19, TypeScript 5.9, Vite 8 |
| **Estado** | Zustand 5, TanStack Query 5 |
| **UI** | Tailwind CSS 3, Lucide React |
| **Media** | Plyr 3.8 (player), WaveSurfer.js 7 (timeline) |
| **Upload** | Uppy 5 (con soporte Tus opcional) |
| **Routing** | React Router DOM 6 |

## 📋 Requisitos Previos

- **Node.js** 18+ (recomendado v23+)
- **npm** 9+
- **Navegador moderno** con soporte para:
  - ES2020+
  - Web APIs: File, Blob, URL.createObjectURL
  - Codec: H.264/AAC (para mejor compatibilidad)

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/HarryLexvb/VideoEdition.git
cd VideoEdition

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El proyecto estará disponible en `http://localhost:5173`

## 📖 Cómo Usar

### 1. Cargar Video

1. Click en botón **"Cargar Video"** (botón con gradiente azul/verde en la esquina superior derecha)
2. En el modal que aparece, puedes:
   - **Arrastrar** un archivo de video al área designada
   - **Hacer click** en el área de carga para abrir el explorador de archivos
3. Formatos recomendados: MP4 (H.264/AAC), WebM, MOV
4. Tamaño máximo: 2GB

### 2. Visualizar Video

Una vez cargado:
- El **preview** se mostrará arriba con controles de reproducción
- El **timeline con waveform** aparecerá debajo automáticamente
- Espera unos segundos mientras se cargan los metadatos del video

### 3. Editar en Timeline

- Click en **"Cortar en cabezal"** para dividir el video en el punto actual
- Los segmentos se crean automáticamente
- Puedes hacer click en el timeline para mover el cabezal (playhead)

### 4. Gestión de Segmentos

**Panel lateral derecho:**
- Lista de todos los segmentos
- Click en un segmento para seleccionarlo
- Marca segmentos como:
  - **Verde (keep)**: Conservar en el video final
  - **Rojo (remove)**: Eliminar del video final
- **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z

### 5. Funciones de Exportación (Sin Backend)

**Importante:** Los botones "Exportar" y "Extraer audio" están visibles pero **no funcionan** sin un backend configurado. Solo se prepara la configuración de segmentos.

## 🏗️ Estructura del Proyecto

```
VideoEdition/
├── src/
│   ├── features/
│   │   └── editor/              # Feature principal de edición
│   │       ├── api/             # Hooks de API (preparados para backend)
│   │       ├── components/      # Componentes del editor
│   │       │   ├── VideoPlayer.tsx      # Reproductor con Plyr
│   │       │   ├── TimelinePanel.tsx    # Timeline con WaveSurfer
│   │       │   ├── SidebarPanel.tsx     # Panel de segmentos
│   │       │   └── HeaderBar.tsx        # Barra superior
│   │       ├── hooks/           # Hooks personalizados
│   │       ├── model/           # Types y lógica de negocio
│   │       ├── pages/           # EditorPage principal
│   │       └── store/           # Zustand store
│   ├── shared/                  # Componentes y utilidades compartidas
│   │   ├── components/          # Button, StatusBadge, ThemeToggle
│   │   ├── contexts/            # ThemeContext
│   │   └── lib/                 # Utilidades (formatTime, id)
│   ├── router/                  # Configuración de rutas
│   └── styles/                  # Global CSS
├── public/
└── index.html
```

## 🐛 Troubleshooting

### El video no carga

**Síntomas:**
- Al seleccionar un video, no aparece en el preview
- El timeline no se genera

**Soluciones:**
1. **Verifica el formato**: Preferir MP4 H.264/AAC
2. **Abre DevTools** (F12) y revisa la consola
3. Busca mensajes con `[VideoPlayer]` o `[TimelinePanel]`

**Logs esperados (exitosos):**
```
[EditorPage] Video seleccionado: video.mp4 URL creada: blob:...
[VideoPlayer] 🎬 Cargando video: video.mp4
[VideoPlayer] ✓ loadedmetadata - Duración: 120.5 segundos
[VideoPlayer] MediaElement listo, pasando a TimelinePanel
[TimelinePanel] ✓ Inicializando WaveSurfer
[TimelinePanel] ✓ WaveSurfer creado exitosamente
```

### El area de carga no responde al click

**Solución:**
- El área **SÍ** acepta clicks
- Asegúrate de hacer click **dentro del área de carga** (cuadro gris/azul en el centro del modal)
- El texto "haz click para seleccionar" es clickeable

### Timeline no aparece

**Causas comunes:**
- Metadatos del video no cargaron correctamente
- Formato de video incompatible
- Video corrupto

**Solución:**
1. Espera unos segundos (videos grandes tardan más)
2. Intenta con un video diferente más pequeño
3. Verifica que el footer muestre "Media: conectado"

### Formatos no soportados

**✅ Recomendados (mayor compatibilidad):**
- MP4 (H.264 video + AAC audio)
- WebM (VP8/VP9 + Vorbis/Opus)

**⚠️ Pueden fallar:**
- AVI (dependiente del codec interno)
- MKV (no nativo en navegador)
- Videos 4K+ (carga muy lenta)
- Códecs exóticos (ProRes, etc.)

## 📦 Scripts Disponibles

```bash
npm run dev         # Servidor desarrollo con hot reload (puerto 5173)
npm run build       # Build optimizado para producción
npm run preview     # Preview del build de producción
npm run typecheck   # Verificar tipos TypeScript
```

## ⚙️ Variables de Entorno (Opcional)

```bash
# .env (copiar desde .env.example)
VITE_TUS_ENDPOINT=http://localhost:3000/upload/tus
```

**Nota:** Por defecto, la app funciona en modo **solo frontend**. Si defines `VITE_TUS_ENDPOINT`, habilitarás upload reanudable vía Tus (requiere backend).

## 🎨 Características de UI

- **Diseño moderno**: Gradientes, sombras suaves, bordes redondeados
- **Animaciones**: Efectos shimmer, transiciones suaves
- **Responsive**: Adaptado a desktop y tablets
- **Dark mode**: Soporte completo para tema oscuro
- **Accesibilidad**: ARIA labels, keyboard shortcuts

## 🔧 Problemas Conocidos

1. **Videos muy grandes (>1GB)** pueden tardar en cargar metadatos
2. **Algunos formatos MOV** pueden no ser compatibles dependiendo del codec
3. **Safari** puede tener problemas con ciertos códecs WebM

## 🚀 Roadmap Futuro

**Fase 1 - Backend (No implementado):**
- [ ] API REST con Express/Fastify
- [ ] Sistema de jobs con BullMQ
- [ ] Procesamiento real con FFmpeg
- [ ] Storage en S3/R2

**Fase 2 - Funcionalidades (No implementado):**
- [ ] Export funcional de video editado
- [ ] Extracción real de audio
- [ ] Múltiples pistas de video
- [ ] Transiciones entre segmentos
- [ ] Efectos y filtros

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles

## 👤 Autor

**Harold Alejandro Villanueva Borda**

- GitHub: [@HarryLexvb](https://github.com/HarryLexvb)
- Email: harrylex8@gmail.com
- Email institucional: harold.villanueva@gmail.com

## 🔗 Links

- **Repositorio:** https://github.com/HarryLexvb/VideoEdition
- **Issues:** https://github.com/HarryLexvb/VideoEdition/issues

## 🙏 Agradecimientos

- **Uppy** - Sistema de upload modular
- **Plyr** - Reproductor de video HTML5
- **WaveSurfer.js** - Visualización de waveform
- **Zustand** - Gestión de estado simple
- **Lucide** - Íconos modernos

---

**Versión:** 0.3.0  
**Última actualización:** Marzo 2026  
**Estado:** Frontend funcional, backend en roadmap

---

## ⚠️ Nota Importante

Este proyecto es un **editor frontend** únicamente. **No realiza procesamiento real de video**. Los botones de "Exportar" y "Extraer audio" preparan la configuración pero requieren implementar un backend con FFmpeg para funcionar.

La funcionalidad actual permite:
- ✅ Cargar videos localmente
- ✅ Visualizar y reproducir
- ✅ Crear segmentos y marcarlos
- ✅ Gestionar historial de cambios
- ❌ NO exporta video procesado
- ❌ NO extrae audio real
- ❌ NO guarda proyectos

Para procesamiento real de video, es necesario implementar el backend según el roadmap.
