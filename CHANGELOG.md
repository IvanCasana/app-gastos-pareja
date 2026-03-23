# Changelog

Todos los cambios relevantes del proyecto se documentan en este archivo.

Este historial sigue una estructura inspirada en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y usa [Semantic Versioning](https://semver.org/spec/v2.0.0.html) como referencia para ordenar releases.

## [Unreleased]

### Pendiente
- Ajustes finales de UX/UI sobre el rediseño actual.
- Nuevas mejoras de producto que entren en el siguiente release.

## [0.3.0] - 2026-03-23

### Resumen
- Rediseño visual grande de la experiencia principal.
- Nueva jerarquía mobile-first para grupos, saldo y movimientos.
- Mejora del uso de avatares y lectura rápida del grupo activo.

### Added
- Panel inferior tipo bottom sheet para crear y editar movimientos.
- Avatares de integrantes visibles en el resumen del grupo.
- Avatares del pagador visibles dentro de la lista de movimientos.
- Carga progresiva de movimientos con botón `Ver más`.

### Changed
- La sección de grupos ahora es colapsable, manteniendo visible el grupo actual.
- El selector de grupos se rediseñó con una presentación más clara.
- El login y el primer ingreso pasaron a una UI más moderna.
- El primer ingreso usa la foto de Google como avatar por defecto cuando existe.
- La categoría por defecto del formulario cambió a `Otros`.
- Los mensajes de saldo se reescribieron para evitar lenguaje de deuda directa.
- Las tarjetas de movimientos se compactaron para aprovechar mejor el espacio en desktop.

### Fixed
- Fallback correcto cuando una foto de perfil no carga.
- Consistencia visual entre entorno local y Firebase Hosting al publicar el frontend actualizado.
- Lectura de perfil básico entre integrantes para poder mostrar avatares en grupo y movimientos.

## [0.2.0] - 2026-03-22

### Resumen
- Paso del MVP inicial a una app con grupos reales, permisos y reglas de negocio más claras.
- Integración del flujo principal sobre `HomePage` como pantalla real del producto.

### Added
- Flujo de grupos con creación, unión por código y selección de grupo activo.
- Soporte para transacciones asociadas a un `groupId`.
- Borrado de grupos desde la app, eliminando también sus movimientos asociados.
- `CHANGELOG.md` inicial para registrar hitos del proyecto.

### Changed
- El flujo principal de la app se conectó a `HomePage` como pantalla real del producto.
- El perfil de usuario se adaptó para usar `groupIds` y `activeGroupId`.
- El formulario de movimientos pasó a usar usuarios reales del grupo en lugar de nombres fijos.
- El cálculo de balance se adaptó al grupo actual y a los campos `paidByUserId` y `createdByUserId`.
- El `README` se mejoró para presentación de portfolio.

### Security
- Lectura de transacciones restringida a miembros del grupo.
- Creación de transacciones restringida a miembros del grupo autenticados.
- Edición de movimientos restringida al creador del movimiento.
- Borrado de movimientos restringido al creador del movimiento.
- Borrado de grupos restringido al creador del grupo.

### Fixed
- Login con Firebase usando configuración válida del proyecto.
- Errores de imports y flujo que llevaban a pantallas inconsistentes.
- Selección por defecto del usuario actual al cargar un movimiento.
- Confirmación antes de borrar movimientos.
- Error de unión a grupos causado por reglas demasiado restrictivas.
- Inconsistencia donde se mostraba el botón `Borrar` a quien no correspondía.

## [0.1.0] - 2026-03-22

### Resumen
- Base inicial del MVP con autenticación, Firestore y primer deploy productivo.

### Added
- Inicialización del proyecto con React, Vite y Firebase.
- Autenticación con Google.
- Alta de username en primer ingreso.
- Carga básica de movimientos y visualización de balance.
- Publicación inicial en Firebase Hosting.
- Versionado inicial del repo en Git y GitHub.
