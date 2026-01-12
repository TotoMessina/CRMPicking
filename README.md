# PickingUp CRM 🚀

CRM web moderno desarrollado en **HTML5, CSS3 y JavaScript Vanilla**, potenciado por **Supabase** como backend completo (Auth + DB + Realtime).

Orientado a la gestión integral de **Clientes (B2B)**, **Consumidores (B2C)** y **Repartidores (Flota)**, con herramientas avanzadas de **Inteligencia de Negocios**, **Geolocalización** y **Agenda**.

---

## 🌟 Módulos y Funcionalidades

### 🔐 Autenticación y Seguridad
- **Sistema de Login Completo**: Acceso seguro con email y contraseña.
- **Registro por Invitación**: Solo usuarios con código de invitación válido pueden registrarse.
- **Recuperación de Contraseña**: Flujo completo vía email.
- **Protección de Rutas**: `guard.js` impide acceso no autorizado.
- **RLS (Row Level Security)**: Datos protegidos a nivel base de datos en Supabase.
- **Configuración de Perfil**: Edición de nombre, avatar y contraseña.

### 📋 Clientes (B2B)
- Gestión completa de cartera de clientes.
- Estados comerciales personalizables.
- **Excel Import/Export**: Carga masiva y reportes sin recargas de página.
- **Ordenamiento Inteligente**: Los clientes más recientes aparecen primero.
- **Historial de Actividad**: Registro detallado de gestiones.
- Filtros avanzados persistentes.

### 👥 Consumidores (B2C)
- Base de datos independiente para consumidores finales.
- Seguimiento de ciclo de vida (Lead -> Contactado -> Cliente).
- Importación/Exportación robusta con validación de datos.

### 🚚 Repartidores (Flota) - ¡NUEVO!
- Gestión de flota y personal logístico.
- **Estados de Reclutamiento**: Documentación -> Proceso -> Activo.
- **Geografía**: Análisis por localidad y zonas.
- Historial de actividad y asignación de responsables.

### 📊 Estadísticas & Intelligence (Business Intelligence)
- **Dashboard Ejecutivo**: KPIs en tiempo real de todos los módulos.
- **🔮 Proyecciones (Forecasting)**: Estimación matemática de crecimiento a 3 meses.
- **⏰ Mejor Momento de Contacto**: Análisis de big data para predecir cuándo llamar (ej: "Martes - Mañana").
- **❤️ Salud de Cartera**: Score (0-100) basado en recencia de actividad.
- **🌪️ Embudos de Conversión**: Visualización del pipeline para detectar cuellos de botella.
- **Gráficos Interactivos**:
  - Evolución de Altas (Comparativa Clientes vs Consumidores vs Repartidores).
  - Distribución por Estados, Zonas y Responsables.
  - Promedio de contactos por vendedor.

### 📅 Agenda y Calendario
- Calendario visual con **FullCalendar**.
- Eventos drag-and-drop.
- Distinción entre tareas y contactos comerciales.

### 🗺️ Mapa Interactivo
- Visualización geoespacial con **Leaflet**.
- Clusters para zonas densas con **MarkerCluster**.
- **Optimización de Rutas**: Generación automática de itinerarios eficientes entre clientes seleccionados (Nearest Neighbor).
- **Cálculo de Distancias**: Estimación de kilometraje y visualización de recorrido en el mapa.
- Alta rápida de clientes desde ubicación actual.

---

## 🛠️ Stack Tecnológico

- **Frontend**:
  - Vanilla JavaScript (ES6+)
  - CSS3 con Variables y Diseño Responsive (Mobile First)
  - HTML5 Semántico
- **Backend & BaaS**:
  - **Supabase**: PostgreSQL, Auth, Edge Functions.
- **Librerías Clave**:
  - `Chart.js`: Visualización de datos y gráficos.
  - `Leaflet` + `Leaflet.markercluster` + `Leaflet Routing Machine`: Mapas y enrutamiento.
  - `FullCalendar`: Gestión de agenda.
  - `SheetJS (XLSX)`: I/O de archivos Excel.
  - `Toastify`: Notificaciones UI.

---

## 📂 Estructura del Proyecto

```text
/
├── index.html          # Dashboard Clientes
├── app.js             # Lógica Clientes
│
├── repartidores.html   # [NUEVO] Gestión Repartidores
├── repartidores.js     # Lógica Repartidores + Excel
│
├── consumidores.html   # Gestión Consumidores
├── consumidores.js     # Lógica Consumidores + Excel
│
├── estadisticas.html   # Dashboard BI
├── stats.js            # Lógica BI, Gráficos y Proyecciones
│
├── calendario.html     # Agenda
├── calendario.js       # Integración FullCalendar
│
├── mapa.html           # Mapa Geolocalizado
├── mapa.js             # Lógica Leaflet
│
├── login.html / js     # Autenticación
├── configuracion.html  # Perfil de Usuario
├── guard.js            # Protección de Rutas
├── common.js           # Configuración Supabase y Utilidades
└── styles.css          # Sistema de Diseño Global
```

---

## 🚀 Instalación y Despliegue

1.  **Requisitos**: Servidor web simple (Live Server, Vercel, Netlify) o abrir local.
2.  **Configuración**:
    *   Renombrar/Configurar credenciales en `common.js` (Supabase URL & Key).
3.  **Base de Datos**:
    *   Ejecutar scripts SQL de inicialización en Supabase (Tablas `clientes`, `repartidores`, etc.).
    *   Habilitar políticas RLS.

---

> Desarrollado para optimizar la logística y ventas con datos duros y una UX fluida.