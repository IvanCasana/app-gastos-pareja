# Changelog

Todos los cambios relevantes del proyecto se documentan en este archivo.

Este historial sigue una estructura inspirada en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y usa [Semantic Versioning](https://semver.org/spec/v2.0.0.html) como referencia para ordenar releases.

## [Unreleased]

### Added
- Hoja de perfil dentro de la app para editar username y elegir avatar.
- Soporte PWA inicial con `manifest`, `service worker` e iconos instalables.
- Sistema de avatares predefinidos con tematica de animales, priorizando gatitos.
- Sonidos de easter egg en el logo con moneda + maullidos aleatorios.

### Changed
- La cabecera ahora integra el logo real de la app y acceso directo a perfil.
- El perfil permite alternar entre foto de Google y presets guardados en Firestore.
- Las tarjetas de movimientos se refinaron con metadata mas clara, menu contextual y descripcion colapsable.
- Los montos largos ahora se compactan mejor para no romper el layout.
- El formulario de movimientos ahora usa validaciones inline mas sutiles para monto y categoria.
- `Dar dinero` ya no usa categoria, mientras que `Compartido` exige una categoria explicita.

### Fixed
- Limpieza de textos con encoding roto en UI y documentacion.
- Mejor consistencia entre version local y version publicada en Hosting.
- Restriccion del monto a 9 digitos enteros y 2 decimales para evitar valores que rompan la UI.
- Flujo de login estabilizado entre desktop, mobile y modo responsive usando estrategia `popup-first`.
- Lectura de perfiles de integrantes endurecida contra fallos parciales para que la pantalla principal no se rompa si un perfil no carga.
- Cache de PWA y `service worker` corregidos para evitar bundles viejos en celulares y app instalada.
- Reglas de lectura de `users` relajadas temporalmente para restaurar el acceso estable entre integrantes mientras se define un esquema mas fino.
- Fecha de los movimientos corregida para usar dia local y evitar desfasajes por UTC.
- Normalizacion de payloads de movimientos y username para reducir estados inconsistentes al guardar.

### Security
- Reglas de Firestore endurecidas para validar mejor la estructura de `users`, `groups`, `transactions` y reservas de `usernames`.
- Actualizaciones de grupos limitadas a joins, salidas, remociones del admin y renombre del miembro correspondiente.

### Pending
- Ajustes finales de UX/UI sobre el rediseño actual.
- Nuevas mejoras de producto para el siguiente release.

## [0.3.0] - 2026-03-23

### Summary
- Rediseño visual grande de la experiencia principal.
- Nueva jerarquia mobile-first para grupos, saldo y movimientos.
- Mejora de lectura rapida del grupo activo y sus integrantes.

### Added
- Panel inferior tipo bottom sheet para crear y editar movimientos.
- Avatares de integrantes visibles en el resumen del grupo.
- Avatares del pagador visibles dentro de la lista de movimientos.
- Carga progresiva de movimientos con boton `Ver mas`.

### Changed
- La seccion de grupos ahora es colapsable, manteniendo visible el grupo actual.
- El selector de grupos se rediseño con una presentacion mas clara.
- El login y el primer ingreso pasaron a una UI mas moderna.
- El primer ingreso usa la foto de Google como avatar por defecto cuando existe.
- La categoria por defecto del formulario cambio a `Otros`.
- Los mensajes de saldo se reescribieron para evitar lenguaje de deuda directa.
- Las tarjetas de movimientos se compactaron para aprovechar mejor el espacio en desktop.

### Fixed
- Fallback correcto cuando una foto de perfil no carga.
- Consistencia visual entre entorno local y Firebase Hosting al publicar el frontend actualizado.
- Lectura de perfil basico entre integrantes para poder mostrar avatares en grupo y movimientos.

## [0.2.0] - 2026-03-22

### Summary
- Paso del MVP inicial a una app con grupos reales, permisos y reglas de negocio mas claras.
- Integracion del flujo principal sobre `HomePage` como pantalla real del producto.

### Added
- Flujo de grupos con creacion, union por codigo y seleccion de grupo activo.
- Soporte para transacciones asociadas a un `groupId`.
- Borrado de grupos desde la app, eliminando tambien sus movimientos asociados.
- `CHANGELOG.md` inicial para registrar hitos del proyecto.

### Changed
- El flujo principal de la app se conecto a `HomePage` como pantalla real del producto.
- El perfil de usuario se adapto para usar `groupIds` y `activeGroupId`.
- El formulario de movimientos paso a usar usuarios reales del grupo en lugar de nombres fijos.
- El calculo de balance se adapto al grupo actual y a los campos `paidByUserId` y `createdByUserId`.
- El `README` se mejoro para presentacion de portfolio.

### Security
- Lectura de transacciones restringida a miembros del grupo.
- Creacion de transacciones restringida a miembros del grupo autenticados.
- Edicion de movimientos restringida al creador del movimiento.
- Borrado de movimientos restringido al creador del movimiento.
- Borrado de grupos restringido al creador del grupo.

### Fixed
- Login con Firebase usando configuracion valida del proyecto.
- Errores de imports y flujo que llevaban a pantallas inconsistentes.
- Seleccion por defecto del usuario actual al cargar un movimiento.
- Confirmacion antes de borrar movimientos.
- Error de union a grupos causado por reglas demasiado restrictivas.
- Inconsistencia donde se mostraba el boton `Borrar` a quien no correspondia.

## [0.1.0] - 2026-03-22

### Summary
- Base inicial del MVP con autenticacion, Firestore y primer deploy productivo.

### Added
- Inicializacion del proyecto con React, Vite y Firebase.
- Autenticacion con Google.
- Alta de username en primer ingreso.
- Carga basica de movimientos y visualizacion de balance.
- Publicacion inicial en Firebase Hosting.
- Versionado inicial del repo en Git y GitHub.
