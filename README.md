# PickingUp CRM

CRM web moderno desarrollado en **HTML, CSS y JavaScript puro**, utilizando **Supabase** como backend (Base de Datos + API) y orientado a la **gestión comercial**, **seguimiento de clientes y consumidores**, **agenda/calendario multiusuario**, **mapa geolocalizado** y **dashboard de estadísticas**.

El proyecto está pensado para uso interno de equipos comerciales y de marketing, con foco en simplicidad, velocidad y control de la información.

---

## 🚀 Funcionalidades principales

### 📋 Clientes (B2B)
- Alta, edición y baja lógica de clientes.
- Estados comerciales personalizados (relevado, visitado, activo, no interesado, etc.).
- Responsable asignado por cliente.
- Historial de actividades por cliente.
- Agenda de próximos contactos (con vencidos, hoy y próximos días).
- Filtros avanzados y paginación.
- Persistencia de filtros y tema (modo día / noche).

### 👥 Consumidores (B2C)
- Gestión independiente de consumidores finales.
- Historial de actividades por consumidor.
- Estados, responsable y notas.
- Importación y exportación mediante Excel.
- Descarga de modelo Excel.
- Filtros y paginación.
- Integración con usuario activo del CRM (no se pide dos veces).

### 📅 Calendario
- Calendario visual con **FullCalendar**.
- Eventos internos y contactos comerciales.
- Multiusuario con checklist de usuarios por evento.
- Colores personalizados según tipo de evento.
- Arrastrar y redimensionar eventos.
- Filtros por usuario y tipo (contactos / eventos).
- Edición directa desde el calendario.
- Tema oscuro / claro sincronizado con el CRM.

### 🗺️ Mapa
- Mapa interactivo con **Leaflet**.
- Geolocalización de clientes.
- Alta y edición desde el mapa.
- Colores de marcadores según estado del cliente.
- Registro rápido “donde estoy”.
- Vista clara para recorridos comerciales.

### 📊 Estadísticas
- Dashboard ejecutivo con KPIs:
  - Clientes activos
  - Agenda con fecha / vencidos / sin fecha
  - Actividades últimos 7 y 30 días
- Gráficos con **Chart.js**:
  - Estados
  - Rubros
  - Responsables
  - Evolución temporal
- Selector único de lapso (7 días, 30 días, 6 meses, 1 año, etc.).

---

## 🧱 Tecnologías utilizadas

- **Frontend**
  - HTML5
  - CSS3 (custom, responsive, dark mode)
  - JavaScript Vanilla

- **Backend**
  - Supabase (PostgreSQL + API REST)
  - Supabase JS v2

- **Librerías**
  - FullCalendar
  - Leaflet
  - Chart.js
  - SheetJS (XLSX)

---

## 📂 Estructura del proyecto

/
├── index.html # Clientes (B2B)
├── app.js # Lógica principal de clientes
│
├── consumidores.html # Consumidores (B2C)
├── consumidores.js
│
├── calendario.html # Agenda / Calendario
├── calendario.js
│
├── mapa.html # Mapa de clientes
├── mapa.js
│
├── estadisticas.html # Dashboard de estadísticas
├── stats.js
│
├── styles.css # Estilos globales
└── README.md


---

## 🔐 Seguridad y autenticación

- El proyecto utiliza **Supabase ANON KEY** (frontend).
- Las tablas deben tener:
  - **Row Level Security (RLS) habilitado**
  - Políticas explícitas para `anon`
- No hay autenticación de usuarios final (login), se usa:
  - Selector de usuario interno (Toto, Fran, etc.)
  - Guardado en `localStorage` como `usuarioActual`

---