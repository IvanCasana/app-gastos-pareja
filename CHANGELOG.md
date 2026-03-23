# Changelog

Todos los cambios importantes de este proyecto se documentan en este archivo.

## [Unreleased]

### Agregado
- Flujo de grupos con creacion, union por codigo y seleccion de grupo activo.
- Soporte para transacciones asociadas a un `groupId`.
- Lista de movimientos mostrando quien pago y quien cargo cada movimiento.
- Borrado de grupos desde la app, eliminando tambien sus movimientos asociados.
- Reglas de Firestore alineadas con grupos y permisos por creador.
- Rediseño visual mobile-first con panel inferior para crear y editar movimientos.
- Avatares de integrantes visibles en el resumen del grupo y en la lista de movimientos.
- Carga progresiva de movimientos con boton `Ver mas`.

### Cambiado
- Flujo principal de la app conectado a `HomePage` como pantalla real del producto.
- Perfil de usuario adaptado para usar `groupIds` y `activeGroupId`.
- Formulario de movimientos actualizado para usar usuarios reales del grupo en lugar de nombres fijos.
- Calculo de balance adaptado al grupo actual y a los campos `paidByUserId` y `createdByUserId`.
- README mejorado para presentacion de portfolio.
- Texto de saldo actualizado para evitar lenguaje de deuda directa.
- Categoria por defecto cambiada a `Otros`.
- Seccion de grupos colapsable manteniendo visible el grupo actual.
- Login y primer ingreso rediseñados, usando la foto de Google como avatar por defecto cuando existe.

### Seguridad
- Lectura de perfiles `users` habilitada para usuarios autenticados, permitiendo mostrar avatares y datos basicos entre integrantes.
- Lectura de transacciones restringida a miembros del grupo.
- Creacion de transacciones restringida a miembros del grupo autenticados.
- Edicion de movimientos restringida al creador del movimiento.
- Borrado de movimientos restringido al creador del movimiento.
- Borrado de grupos restringido al creador del grupo.

### Corregido
- Login con Firebase usando configuracion valida del proyecto.
- Error de imports y flujo que llevaba a pantallas inconsistentes.
- Seleccion por defecto del usuario actual al cargar un movimiento.
- Confirmacion antes de borrar movimientos.
- Error de union a grupos causado por reglas demasiado restrictivas.
- Inconsistencia donde se mostraba el boton `Borrar` a quien no correspondia.

## [2026-03-22]

### Inicial
- Inicializacion del proyecto con React, Vite y Firebase.
- Autenticacion con Google.
- Alta de username en primer ingreso.
- Carga basica de movimientos y visualizacion de balance.
- Publicacion inicial en Firebase Hosting.
- Versionado inicial del repo en Git y GitHub.
