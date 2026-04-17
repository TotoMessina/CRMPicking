# PickingUp CRM (Logistics & CRM Hybrid) 🚀

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PickingUp CRM** no es un CRM convencional; es una plataforma de gestión integral diseñada para resolver la brecha entre la gestión de relaciones con clientes y la logística de última milla. Nacida de una necesidad real de relevamiento de datos en campo, hoy es una solución robusta preparada para el mercado Enterprise.

---

## 🌟 Lo Nuevo (Highlight de Funcionalidades)

### 📍 Geocodificación & Control de Costos (Inteligencia Google Maps)
- **Conversión Automática**: Integración con Google Geocoding API para transformar direcciones textuales en coordenadas precisas instantáneamente.
- **Optimizador de Créditos**: Lógica inteligente de detección de cambios que evita peticiones redundantes a la API de Google, maximizando el uso del crédito gratuito mensual.
- **Feedback Visual**: Botón "Ubicar" dinámico que reacciona a los cambios en la dirección.

### 🧠 Inteligencia Logística (Business Intelligence)
- **Asignador de Rutas Optimizado**: Implementación de algoritmos *Nearest Neighbor* y *2-opt* para planificar trayectos con el menor kilometraje posible.
- **Geo-Scoring (Churn Risk)**: Mapa de calor dinámico que detecta clientes con riesgo de abandono basándose en la frecuencia de contacto y patrones de compra.
- **PWA Ready**: Soporte offline completo con sincronización en segundo plano (Workbox).

---

## 📋 Módulos Principales

| Módulo | Funcionalidad Clave |
| :--- | :--- |
| **Clientes (B2B)** | Gestión avanzada de cartera con filtros glassmorphic y registro de actividades en tiempo real. |
| **Consumidores (B2C)** | Seguimiento del ciclo de vida del consumidor final y segmentación por zonas. |
| **Repartidores** | Control de flota, seguimiento de estados y asignación de hojas de ruta. |
| **Estadísticas 360°** | Dashboards ejecutivos con KPIs de efectividad, tasa de conversión y salud de la cartera. |
| **Agenda & Kanban** | Calendario sincronizado y tablero Drag & Drop para gestión de tareas de equipo. |

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + Vite (SWC) + TanStack React Query v5.
- **Geolospatial**: Leaflet + OSRM + Google Geocoding API.
- **UI/UX**: CSS Vanilla Premium (Glassmorphism, Dark Mode Nativo, Micro-animaciones).
- **Backend & Seguridad**: 
  - **Supabase**: PostgreSQL con Row Level Security (RLS) para arquitecturas multi-tenant.
  - **Auth**: Sistema de autenticación seguro con control de invitaciones.
- **Herramientas**: SheetJS (Excel), Chart.js (BI), Lucide (Icons), FullCalendar.

---

## 📂 Estructura del Proyecto

```text
src/
├── components/      # Componentes UI (React Portal Modals, Buttons, etc.)
├── contexts/        # Gestión de estado global (Auth, Theme)
├── hooks/           # Lógica de negocio encapsulada y queries
├── lib/             # Clientes de servicios (Supabase, Google Maps)
├── pages/           # Vistas dinámicas (Pipeline, Mapas, Dashboard)
└── index.css        # Sistema de diseño (Variables CSS & Modern UI)
```

---

## 🚀 Acceso a la Demo

Puedes probar la versión interactiva del sistema ahora mismo:

🔗 **Demo Link**: [INSERTA_AQUI_TU_URL_DE_VERCEL]

**Credenciales de Prueba:**
- **Botón Directo**: Haz clic en **"Acceder a Demo"** en la pantalla de inicio.
- **Manual**:
  - `Usuario:` test1@crm.com
  - `Contraseña:` Test1234

> [!NOTE]
> La versión de demo permite interactuar con todas las funcionalidades, pero los datos se comparten públicamente con otros testers y pueden reiniciarse periódicamente.

---

## 🔧 Instalación Local

```bash
# Clone
git clone https://github.com/TotoMessina/CRMPickingUp.git

# Install
npm install

# Environment
# Crea un archivo .env con tus credenciales de Supabase y Google Maps:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# VITE_GOOGLE_MAPS_API_KEY=...

# Dev
npm run dev
```

---

Desarrollado con ❤️ para transformar la logística en datos inteligentes.
