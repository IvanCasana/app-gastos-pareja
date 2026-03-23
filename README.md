# App Gastos Compartidos

Aplicacion web para registrar gastos compartidos entre personas, organizar movimientos por grupo y calcular balances de forma simple. El proyecto esta pensado como un MVP real, mobile-first y desplegado en produccion con Firebase.

## Demo

- Produccion: https://app-gastos-pareja.web.app
- Repositorio: https://github.com/IvanCasana/app-gastos-pareja
- Historial de cambios: [CHANGELOG.md](./CHANGELOG.md)

## Objetivo del proyecto

Construir una aplicacion de gastos compartidos usable en la vida real, enfocada en simplicidad, flujo claro y persistencia en la nube. La idea del proyecto no es solo practicar React, sino resolver un caso concreto con autenticacion, base de datos y deploy productivo.

## Funcionalidades actuales

- Inicio de sesion con Google mediante Firebase Auth.
- Primer ingreso con eleccion de username.
- Creacion de grupos.
- Union a grupos mediante codigo de invitacion.
- Seleccion de grupo activo.
- Registro de movimientos dentro del grupo activo.
- Tipos de movimiento:
  - `SHARED`: gasto compartido 50/50.
  - `SETTLEMENT`: transferencia directa de dinero.
- Calculo de balance entre dos miembros del grupo.
- Edicion de movimientos.
- Borrado de movimientos con confirmacion.
- Persistencia en Firestore.
- Deploy en Firebase Hosting.

## Stack

- React
- Vite
- Firebase Auth
- Cloud Firestore
- Firebase Hosting
- Git + GitHub

## Como funciona

1. El usuario inicia sesion con Google.
2. Si es su primer ingreso, define un username.
3. Puede crear un grupo o unirse a uno existente con codigo.
4. Una vez dentro del grupo, puede registrar movimientos.
5. La aplicacion calcula el saldo segun quien pago y el tipo de movimiento.

## Modelo actual de negocio

- Un usuario puede pertenecer a varios grupos.
- Cada usuario tiene un `activeGroupId`.
- Las transacciones se filtran por `groupId`.
- En esta etapa, el calculo de balance esta pensado para grupos de 2 personas.
- La estructura ya deja preparado el camino para evolucionar a grupos con mas miembros.

## Estructura principal

```text
src/
  components/
    CompleteProfile.jsx
    Dashboard.jsx
    TransactionForm.jsx
    TransactionList.jsx
    login.jsx
  data/
    categories.js
  pages/
    HomePage.jsx
  utils/
    balance.js
  App.jsx
  firebase.js
  main.jsx
  styles.css
```

## Variables y servicios

La app usa Firebase para:

- autenticacion
- base de datos
- hosting

La configuracion actual permite usar valores de entorno `VITE_FIREBASE_*` o los valores definidos en [src/firebase.js](./src/firebase.js).

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Levantar entorno local:

```bash
npm run dev
```

Build de produccion:

```bash
npm run build
```

## Deploy

Deploy manual de hosting y reglas:

```bash
firebase deploy --only hosting,firestore:rules
```

La URL productiva actual es:

```text
https://app-gastos-pareja.web.app
```

## GitHub Actions

El repositorio incluye workflows para:

- deploy automatico a Firebase Hosting en `main`
- previews en Pull Requests

Para activarlos, debes crear en GitHub el secret:

- `FIREBASE_SERVICE_ACCOUNT`

## Proximos pasos

- Reglas de Firestore mas seguras por membresia de grupo.
- Reemplazo total de logica residual legacy.
- Mejorar UX de estados de carga, vacios y errores.
- Soporte futuro para grupos con mas de 2 personas.
- Rediseño del algoritmo de balance para multiples miembros.
- Tests de logica de negocio, especialmente balance.

## Capturas

Pendiente agregar screenshots o GIFs del flujo principal:

- login
- creacion o union a grupo
- carga de movimientos
- balance actualizado

## Lo que demuestra este proyecto

- Integracion de frontend con autenticacion real.
- Modelado de datos en Firestore.
- Deploy productivo.
- Manejo de estado y flujos de usuario en React.
- Evolucion progresiva de un MVP hacia una app mas solida.

## Autor

Brian Ivan Casana  
GitHub: https://github.com/IvanCasana
