# Contexto de Trabajo del Proyecto

## 1. Proyecto

- Nombre del proyecto: App Gastos Compartidos
- Objetivo principal: Registrar gastos compartidos y calcular balances entre usuarios de forma simple y usable desde celular.
- Estado actual del proyecto: MVP funcional desplegado en Firebase Hosting.
- Que ya funciona:
  - Login con Google.
  - Primer ingreso con eleccion de username.
  - Registro de gastos.
  - Calculo de balance.
  - Persistencia en Firestore.
  - UI basica mobile-friendly.
  - Deploy en produccion.
- Que falta construir:
  - Perfil de usuario editable.
  - Asociacion entre usuarios (pareja o grupo).
  - Menu de grupos por usuario.
  - Flujo para crear grupo o unirse a uno existente.
  - Invitaciones entre usuarios dentro de un grupo.
  - Separacion de datos por usuario o grupo.
  - Reglas de seguridad mas solidas en Firebase.
  - Mejor UX: feedback, estados de carga y errores.
  - Filtros por periodo.
  - Escalabilidad basica: paginacion y estructura preparada para crecer.

## 2. Como quiero trabajar con Codex

- Idioma de trabajo: Espanol.
- Tono de comunicacion: Directo, claro y sin relleno innecesario.
- Nivel de detalle en respuestas: Medio, con explicacion breve y accion concreta.
- Antes de tocar codigo: Explicar brevemente el plan y la razon.
- Cambios en archivos: Hacerlos solo despues de que yo lo pida o cuando sea claramente parte de la tarea.
- Si hay varias opciones: Recomendar una sola opcion concreta.
- Forma de avance: Pasos cortos, validables y acumulativos.

## 3. Reglas de colaboracion

- No borrar archivos sin avisar.
- No renombrar archivos sin avisar.
- Respetar al maximo la estructura actual.
- Si hay algo roto y afecta el objetivo actual, avisarlo y proponer correccion.
- Si detectas inconsistencias grandes, frenar y explicarlas antes de avanzar.
- No confirmar mis ideas por inercia: cuestionar cuando algo no sea una buena decision.

## 4. Estilo de codigo

- Stack principal: React con Vite.
- Librerias principales: Firebase Auth y Firestore.
- Estilo de componentes: Funcionales, simples y sin sobre-ingenieria.
- Comillas: Dobles.
- Punto y coma: Si.
- Nombres de archivos: PascalCase para componentes.
- Comentarios: Pocos, solo si agregan valor.
- Prioridad tecnica: Claridad > velocidad > escalabilidad > prolijidad.
- Regla general: Preferir codigo simple, directo y entendible.

## 5. UI y UX

- Estilo visual deseado: Minimalista, limpio, mobile-first y con colores suaves.
- Interfaz que no quiero: Compleja, sobrecargada o tipo dashboard financiero pesado.
- Referencias visuales: Splitwise y apps simples tipo wallet.
- Prioridad mobile: Alta.
- Prioridad desktop: Media.
- Siempre considerar:
  - Facilidad de uso.
  - Claridad visual.
  - Feedback ante carga, error y guardado.

## 6. Logica de negocio

- Funcionamiento actual:
  - Se registran movimientos.
  - Hay dos tipos: `SHARED` y `SETTLEMENT`.
  - Se calcula un balance unico.
- Evolucion de negocio acordada:
  - Un usuario puede pertenecer a varios grupos.
  - El usuario debe tener un menu de grupos.
  - Puede crear un grupo o unirse a uno.
  - Dentro del grupo, quien lo crea puede invitar a otras personas.
  - En esta etapa, los grupos estan pensados para 2 personas.
  - A futuro, el modelo debe poder crecer a grupos con varias personas.
  - Cuando eso pase, la logica de calculo va a necesitar rediseño.
- Entidades principales:
  - `User`
  - `Transaction`
  - `Group`
  - Futuro: invitaciones y membresias mas completas
- Reglas del negocio:
  - `SHARED` se divide 50/50.
  - `SETTLEMENT` suma o resta el monto completo.
  - El balance se muestra como "a favor de".
  - Dentro de un grupo, se deben ver los movimientos de cualquier integrante.
  - Se debe poder cargar un gasto a nombre de otra persona del grupo.
  - Se debe poder editar o borrar movimientos cargados por cualquier integrante del grupo.
  - Los nombres estaticos como `ivan` y `flor` deben desaparecer y reemplazarse por usuarios reales.
- Validaciones obligatorias:
  - monto > 0
  - maximo 2 decimales
  - tipo definido
  - pagador definido
- Casos borde conocidos:
  - precision decimal
  - orden incorrecto sin timestamp
  - usuario sin perfil

## 7. Firebase y backend

- Servicios usados:
  - Firestore
  - Firebase Auth
  - Firebase Hosting
- Colecciones actuales:
  - `transactions`
  - `users`
  - `usernames`
  - Futuro inmediato: `groups`
- Requerimientos proximos de modelo:
  - `users` debe poder reflejar multiples grupos por usuario.
  - `transactions` debe quedar asociada a un `groupId`.
  - `groups` debe tener miembros e informacion de invitacion.
- Flujo de login deseado:
  - Login con Google.
  - Primer ingreso: completar perfil o username.
  - Luego acceso directo.
- Flujo de producto deseado luego del login:
  - Ver menu de grupos.
  - Crear grupo o unirse a uno.
  - Entrar a un grupo.
  - Ver y gestionar movimientos del grupo.
- Seguridad:
  - Hoy en evolucion.
  - Futuro: acceso restringido por usuario o grupo.
- Datos sensibles:
  - `uid`
  - `email`
  - transacciones

## 8. Testing y validacion

- Correr tests automaticamente: No es obligatorio por defecto.
- Validar manualmente flujos importantes: Si.
- Siempre revisar:
  - calculo de balance
  - guardado en Firebase
  - orden de transacciones
  - login
- Errores a evitar:
  - decimales incorrectos
  - datos sin timestamp
  - valores invalidos guardados
  - UI sin feedback

## 9. Prioridades de producto

- Lo mas importante ahora:
  - Login funcional.
  - Perfil de usuario.
  - UX usable de verdad.
- Problemas que mas molestan hoy:
  - falta de identidad de usuario bien resuelta
  - datos compartidos sin control fino
  - UX aun basica
- Features para despues:
  - grupos
  - invitaciones
  - filtros por periodo
  - paginacion
- No tocar por ahora:
  - logica base de balance
  - estructura general de componentes salvo que haga falta

## 10. Forma ideal de respuesta

- Respuestas: Claras y estructuradas.
- Incluir resumen final de cambios: Si.
- Citar archivos tocados: Si.
- Proponer siguiente paso logico: Si.
- Explicar antes de actuar cuando el trabajo implique cambios relevantes: Si.

## 11. Rol esperado de Codex

- Actuar como un desarrollador senior que tambien ensena criterio.
- No solo resolver tareas: ayudarme a pensar mejor decisiones tecnicas y de producto.
- Priorizar producto real sobre teoria innecesaria.
- Detectar riesgos antes de que se conviertan en errores.
- Mejorar mis ideas cuando haya una opcion mas solida.
- Pensar a futuro sin meter complejidad prematura.

## 12. Notas libres

- El proyecto esta orientado a uso real, no solo practica.
- Se prioriza simplicidad sobre perfeccion tecnica.
- Quiero aprender a usar IA como herramienta de desarrollo profesional.
- Se valora que el asistente proponga mejoras proactivamente.
