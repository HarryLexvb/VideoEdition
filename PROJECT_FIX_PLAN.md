# Project Fix Plan And Status Report

Proyecto: VideoCut Studio  
Rama de referencia: `dev`  
Ultima actualizacion: 2026-04-04

## Objetivo Del Documento

Este documento reemplaza versiones obsoletas del plan anterior y consolida:
- Logros tecnicos reales ya entregados.
- Incidentes detectados en pruebas reales.
- Correcciones aplicadas y su estado.
- Faltantes funcionales y plan de trabajo proximo.

## Estado Real Del Proyecto

Resumen actual:
- Frontend: funcional.
- Backend: parcial operativo (MVP).
- Upload reanudable: funcional con topologia correcta (`api + tusd` en Docker).
- Flujo E2E principal: validado con video real.

## Registro De Logros Confirmados

### Logros de arquitectura
- Se confirmo backend real en `apps/api` con rutas, servicios y procesamiento FFmpeg.
- Se alineo documentacion con el estado real del repositorio.

### Logros de producto
- Trim range funcional integrado a store, timeline y payload.
- Historial (undo/redo) incluye estado de trim.
- Segmentacion keep/remove funcionando con payload de jobs.

### Logros de integracion
- Flujo frontend -> API de jobs validado.
- Flujo Tus -> uploadId -> jobs validado.
- Descarga de resultados backend validada.

### Logros de calidad tecnica
- Correccion de deprecaciones de TypeScript 6 en tsconfig.
- Typecheck frontend y build backend exitosos.

## Incidentes Reales Y Correcciones

### INC-2026-04-04-01 - Upload fallido por hook Tus
Severidad: Alta  
Estado: Resuelto

Sintoma:
- Upload no finalizaba correctamente.
- Jobs devolvian `source.uploadId` faltante.

Causa raiz:
- `tusd` corria en Docker con hook `http://api:3000/hooks/upload`.
- `api` corria local fuera de la red Docker.
- `tusd` no podia resolver host `api`.

Correccion aplicada:
- Topologia recomendada actual: frontend local + `docker compose up -d api tusd`.
- Validacion de hooks confirmada en logs (`pre-create`, `post-create`, `post-finish`).

Evidencia de cierre:
- Upload Tus minimo de prueba con `201` (create) y `204` (patch).
- `uploadId` generado y disponible para jobs.

### INC-2026-04-04-02 - Preview y timeline sin reproduccion/render
Severidad: Alta  
Estado: Resuelto

Sintoma:
- Preview en gris.
- Timeline sin comportamiento esperado.

Causa raiz:
- Inicializacion inestable del preview.
- Timeline sin reinicializacion robusta al cambiar source.

Correccion aplicada:
- Estabilizacion de flujo de preview en `VideoPlayer`.
- Reinicializacion de timeline por `mediaSourceUrl`.

Evidencia de cierre:
- Flujo de usuario completo funcionando tras recarga y nueva carga de archivo.

### INC-2026-04-04-03 - Jobs lanzados sin uploadId listo
Severidad: Media  
Estado: Resuelto

Sintoma:
- Usuario podia pulsar export/extract antes de completar upload.

Causa raiz:
- Falta de guard de negocio en construccion de payload.

Correccion aplicada:
- Bloqueo de envio de job si `isTusEnabled` y no hay `video.uploadId`.
- Mensajes de error accionables para el usuario.

## Validacion De Calidad Ejecutada

Pruebas ejecutadas y resultado:
- Frontend `npm run typecheck`: OK.
- Backend `npm run build`: OK.
- API `GET /health`: OK.
- E2E con video real:
  - `POST /jobs/export`: completed.
  - `POST /jobs/extract-audio`: completed.
  - Descarga de MP4 y MP3 generados: OK.

## Faltantes Funcionales Prioritarios

### P0 - Robustez minima
1. Timeout y politica de reintento para polling de jobs.
2. Mejor manejo de errores de reproduccion en UI (mensaje visible con codigo de error).

### P1 - Escalabilidad y persistencia
1. Migrar job store en memoria a cola persistente (BullMQ + Redis).
2. Persistir metadata de jobs/resultados en DB.

### P2 - Seguridad y hardening
1. Validacion de schemas en runtime para payloads.
2. AuthN/AuthZ para endpoints de procesamiento.
3. Rate limiting y trazabilidad estructurada.

## Riesgos Actuales

Riesgos abiertos:
- Reinicio de API pierde estado de jobs (store en memoria).
- Sin autenticacion, cualquier cliente puede invocar endpoints.
- Sin DB, no hay historial persistente de proyectos/procesamientos.

## Plan De Trabajo Recomendado (Siguiente Sprint)

1. Implementar timeout de polling + UI de reintento.
2. Introducir validacion runtime de payload en backend.
3. Definir y montar infraestructura de cola persistente.
4. Agregar trazabilidad de jobs (idempotencia y correlacion de logs).
5. Diseñar capa minima de autenticacion para operaciones de procesamiento.

## Criterio De Cierre De La Proxima Iteracion

La siguiente iteracion se considera cerrada cuando:
- Polling no queda indefinido.
- Jobs sobreviven reinicios de API.
- Payloads invalidos son rechazados con errores claros y consistentes.
- Existen controles basicos de seguridad en endpoints de procesamiento.