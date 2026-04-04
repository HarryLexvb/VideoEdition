# VideoCut Studio

> Editor de video no destructivo con interfaz profesional para cargar, visualizar y editar videos localmente mediante timeline interactivo.

## 🎯 Estado Actual

**✅ Frontend 100% Funcional | ❌ Backend No Implementado**

### ✨ Funcionalidades Implementadas

- ✅ **Carga de videos** (hasta 2GB) - Drag & drop o click
- ✅ **Preview profesional** con controles Plyr
- ✅ **Timeline interactivo** con waveform (WaveSurfer.js)
- ✅ **Recorte de video (Trim Range)** ⭐ NUEVO - Selección visual de rango inicio/fin
- ✅ **Sistema de segmentos** con marcado keep/remove
- ✅ **Undo/Redo completo** (Ctrl+Z / Ctrl+Shift+Z)
- ✅ **Dark mode** con persistencia
- ✅ **Gestión de estado** con Zustand
- ✅ **UI responsive** con Tailwind CSS

### ⚠️ Limitaciones Actuales

**NO funciona sin backend:**
- ❌ Export real de video editado
- ❌ Extracción de audio
- ❌ Procesamiento con FFmpeg
- ❌ API/Backend
- ❌ Storage persistente
- ❌ Sistema de jobs

## 🛠️ Stack Tecnológico

| Categoría | Tecnologías |
|-----------|-------------|
| **Core** | React 19.2, TypeScript 5.9, Vite 8 |
| **Estado** | Zustand 5, TanStack Query 5 |
| **UI** | Tailwind CSS 3, Lucide React 1 |
| **Media** | Plyr 3.8 (player), WaveSurfer.js 7 (timeline) |
| **Upload** | Uppy 5 (con soporte Tus opcional) |
| **Routing** | React Router DOM 6 |

## 📋 Requisitos

- **Node.js** 18+ (probado con v23.2.0)
- **npm** 9+ (probado con 10.9.0)
- **Navegador moderno** con soporte para:
  - ES2020+, File API, Blob, URL.createObjectURL
  - Codec H.264/AAC recomendado

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/HarryLexvb/VideoEdition.git
cd VideoEdition

# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev
```

Accede en: `http://localhost:5173`

## 📖 Guía de Uso

### 1️⃣ Cargar Video

1. Click en **"Cargar Video"** (botón con gradiente en la esquina superior derecha)
2. En el modal:
   - **Arrastra** un video al área gris
   - **O haz click** en el área gris para abrir el selector de archivos
3. **Formatos:** MP4 (H.264/AAC), WebM, MOV
4. **Máximo:** 2GB

### 2️⃣ Visualizar

- El **preview** aparece arriba con controles de reproducción
- El **timeline con waveform** se genera automáticamente debajo
- Espera unos segundos mientras carga los metadatos

### 3️⃣ Recortar Video (Trim) ⭐ NUEVO

**Panel de Recorte (sidebar derecho):**
- **Marcar Inicio:** Posiciona el cabezal y haz click en "Marcar Inicio"
- **Marcar Fin:** Mueve el cabezal al punto final y haz click en "Marcar Fin"
- **Ajuste Visual:** Arrastra los bordes de la región azul en el timeline para redimensionar
- **Limpiar:** Botón "Limpiar" para resetear la selección
- **Visualización:** El panel muestra inicio, fin y duración del rango seleccionado

**Notas:**
- La región de trim aparece como una banda azul semi-transparente
- Los handles en los bordes permiten ajuste preciso
- El historial (Ctrl+Z) captura cambios de trim

### 4️⃣ Editar Segmentos

- **Cortar:** Click en "Cortar en cabezal" para dividir en el punto actual
- **Navegar:** Click en el timeline para mover el playhead
- **Reproducir:** Usa los controles del player

### 5️⃣ Gestionar Segmentos

**Panel lateral derecho:**
- Ver lista de segmentos creados
- Click en segmento para seleccionar
- Marcar como:
  - 🟢 **Keep** (verde) - Conservar
  - 🔴 **Remove** (rojo) - Eliminar
- **Undo/Redo:** Ctrl+Z / Ctrl+Shift+Z

### 6️⃣ Exportar (⚠️ No Funcional)

Los botones "Exportar" y "Extraer audio" preparan la configuración (incluyendo trim range y segmentos) pero **NO procesan el video** porque no hay backend implementado.

**Payload generado incluye:**
- Source (archivo, tamaño, tipo)
- Timeline (segmentos con disposición keep/remove)
- **Trim Range** (inicio, fin, duración) ⭐ NUEVO
- Metadata (duración total, contadores)

## 🏗️ Estructura del Proyecto

```
VideoEdition/
├── src/
│   ├── features/
│   │   └── editor/
│   │       ├── api/              # Hooks API (preparados para backend)
│   │       ├── components/        # Componentes del editor
│   │       │   ├── VideoPlayer.tsx
│   │       │   ├── TimelinePanel.tsx
│   │       │   ├── TrimControls.tsx    # ⭐ NUEVO - Panel de recorte
│   │       │   ├── SidebarPanel.tsx
│   │       │   └── HeaderBar.tsx
│   │       ├── hooks/            # useVideoUpload
│   │       ├── model/            # Types y lógica de negocio
│   │       ├── pages/            # EditorPage
│   │       └── store/            # Zustand store
│   ├── shared/
│   │   ├── components/           # Button, StatusBadge, ThemeToggle
│   │   ├── contexts/             # ThemeContext
│   │   └── lib/                  # Utilidades (formatTime, id)
│   ├── router/                   # AppRouter
│   └── styles/                   # global.css
├── public/
├── PROJECT_FIX_PLAN.md        # ⭐ Plan de corrección técnica
└── index.html
```

## 🐛 Troubleshooting

### El video no carga

**Síntomas:** No aparece preview ni timeline

**Soluciones:**
1. Usa MP4 H.264/AAC (mayor compatibilidad)
2. Abre DevTools (F12) → Console
3. Busca logs con `[VideoPlayer]` o `[TimelinePanel]`

**Logs esperados (éxito):**
```
[EditorPage] Video seleccionado: video.mp4 URL creada: blob:...
[VideoPlayer] 🎬 Cargando video: video.mp4
[VideoPlayer] ✓ loadedmetadata - Duración: 120.5 segundos
[TimelinePanel] ✓ Inicializando WaveSurfer
[TimelinePanel] ✓ WaveSurfer creado exitosamente
```

### El área de carga no funciona

**Solución:**
- El área **gris/azul** en el centro del modal ES clickeable
- Haz click directamente en el área de drop zone
- O arrastra el archivo sobre ella

### Timeline no aparece

**Causas:**
- Video aún cargando metadatos (espera unos segundos)
- Formato incompatible
- Video corrupto

**Verifica:**
- Footer muestra "Media: conectado"
- Console muestra logs de WaveSurfer
- Prueba con otro video más pequeño

### Región de trim no aparece ⭐ NUEVO

**Solución:**
- Debes marcar tanto inicio como fin para que aparezca la región azul
- Si solo marcas uno, el panel mostrará el valor pero no habrá región visual
- Usa "Limpiar" para resetear y volver a intentar

### Formatos Soportados

**✅ Recomendados:**
- MP4 (H.264 + AAC)
- WebM (VP8/VP9 + Vorbis/Opus)

**⚠️ Pueden fallar:**
- AVI (depende del codec)
- MKV (no nativo en navegador)
- Videos 4K+ (carga muy lenta)
- Códecs exóticos

## 📦 Scripts

```bash
npm run dev         # Desarrollo (puerto 5173)
npm run build       # Producción
npm run preview     # Preview del build
npm run typecheck   # Verificar tipos TS
```

## ⚙️ Variables de Entorno

```bash
# .env (opcional)
VITE_TUS_ENDPOINT=http://localhost:3000/upload/tus
```

Si defines esto, habilita upload reanudable vía Tus (requiere backend).

## 🎨 Características UI

- Gradientes modernos y sombras suaves
- Animación shimmer en botón principal
- Transiciones fluidas (300ms)
- Dark mode completo
- Responsive (desktop y tablets)
- ARIA labels para accesibilidad

## ⚠️ IMPORTANTE - Leer Antes de Usar

### Este es un Editor Frontend Únicamente

**Lo que SÍ hace:**
- ✅ Cargar y reproducir videos localmente
- ✅ Visualizar waveform
- ✅ **Recortar video seleccionando rango inicio/fin** ⭐ NUEVO
- ✅ Crear y marcar segmentos
- ✅ Gestionar historial de cambios

**Lo que NO hace:**
- ❌ NO exporta video procesado
- ❌ NO extrae audio real
- ❌ NO guarda proyectos
- ❌ NO procesa video con FFmpeg

Los botones de exportar/extraer audio están visibles pero **no funcionan** sin implementar backend.

## 🚀 Roadmap Futuro

**Fase 1 - Backend:**
- [ ] API REST (Express/Fastify)
- [ ] Jobs (BullMQ)
- [ ] Procesamiento (FFmpeg)
- [ ] Storage (S3/R2)

**Fase 2 - Funcionalidades:**
- [ ] Export funcional
- [ ] Extracción de audio real
- [ ] Múltiples pistas
- [ ] Transiciones
- [ ] Efectos y filtros

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit (`git commit -m 'feat: agregar funcionalidad'`)
4. Push (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License

## 👤 Autor

**Harold Alejandro Villanueva Borda**

- GitHub: [@HarryLexvb](https://github.com/HarryLexvb)
- Email: harrylex8@gmail.com
- Email institucional: harold.villanueva@gmail.com

## 🔗 Enlaces

- **Repositorio:** https://github.com/HarryLexvb/VideoEdition
- **Issues:** https://github.com/HarryLexvb/VideoEdition/issues

## 🙏 Tecnologías Utilizadas

- **Uppy** - Upload modular y robusto
- **Plyr** - Reproductor HTML5 elegante
- **WaveSurfer.js** - Visualización de audio/video
- **Zustand** - Estado simple y potente
- **Lucide** - Íconos SVG modernos
- **Tailwind CSS** - Utility-first CSS
- **Vite** - Build tool ultrarrápido

---

**Versión:** 0.5.0  
**Última actualización:** 03 de Abril, 2026  
**Estado:** Frontend completo con trim/recorte | Backend pendiente

---

## 📝 Notas de Desarrollo

### Problemas Resueltos

✅ Video flickering al cargar  
✅ Timeline no renderiza  
✅ Área de carga sin respuesta al click  
✅ Callbacks inestables causando re-renders  
✅ Object URLs sin cleanup  
✅ Caracteres especiales mal codificados (UTF-8)  
✅ Falta de funcionalidad de trim/recorte de video  
✅ Historial no capturaba trim range  
✅ Regions de timeline no redimensionables  
✅ Threshold de sincronización alto (180ms → 50ms)  
✅ EPSILON demasiado alto (20ms → 1ms)  
✅ Mensaje UI engañoso corregido  
✅ Validación de tamaño duplicada eliminada

### Cambios Recientes (v0.5.0)

- ⭐ **NUEVO:** Funcionalidad completa de trim/recorte de video
- ⭐ **NUEVO:** Componente TrimControls con botones "Marcar Inicio/Fin"
- ⭐ **NUEVO:** Región de trim azul redimensionable en timeline
- ✅ Historial (undo/redo) ahora captura trim range
- ✅ Payload de exportación incluye trimRange con metadata
- ✅ Store extendido con 7 acciones de trim
- ✅ **Optimización:** Threshold de sincronización reducido 180ms → 50ms (3.6x más preciso)
- ✅ **Optimización:** EPSILON reducido 20ms → 1ms (20x más preciso en cortes)
- ✅ **Corrección:** Mensaje UI actualizado para mayor claridad
- ✅ **Limpieza:** Validación duplicada eliminada (DRY)
- ✅ TypeCheck y Build validados exitosamente
- 📝 Documentación actualizada con estado real del proyecto

---

**⚠️ RECORDATORIO FINAL**

Este proyecto es un **editor de video no destructivo frontend**. La funcionalidad de procesamiento real (exportar, extraer audio) requiere implementar un backend con FFmpeg. El estado actual permite visualizar, segmentar, **recortar (trim)**, y preparar la configuración de edición completa para enviar a un backend futuro.
