# PickingUp CRM (Logistics & CRM Hybrid) 🚀

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PickingUp CRM** es una plataforma web moderna y escalable diseñada para resolver la brecha entre la gestión de relaciones con clientes y la logística de última milla. Adopta un ecosistema basado en **React 19**, **Vite** y **Supabase** para ofrecer una experiencia ultra-rápida y en tiempo real.

---

## 🔥 Lo Nuevo (Highlights de Optimización)

### 📍 Geocodificación & Control de Costos
- **Integración con Google Maps API**: Conversión automática de direcciones a coordenadas para eliminar el error humano.
- **Optimizador de Créditos**: Lógica de seguimiento de cambios que previene llamadas redundantes a la API de Google, protegiendo el crédito mensual gratuito de $200 USD.

### 🧠 Inteligencia Logística Pro
- **Asignador de Rutas**: Algoritmos de optimización de trayectos (*Nearest Neighbor* + *2-opt*) integrados.
- **Geo-Scoring (Churn Risk)**: Mapa de calor dinámico que identifica clientes en riesgo de abandono según patrones de compra y frecuencia de contacto.

---

## 🔐 Autenticación y Seguridad Multi-Empresa
- **Sistema Enterprise**: Acceso seguro gestionado por Supabase Auth con soporte para registro por invitación.
- **Contexto de Autenticación Centralizado**: Manejo de sesión global y persistencia en toda la SPA.
- **Estructura Multi-tenant**: Arquitectura que permite la conmutación segura entre distintas empresas respetando la privacidad de datos mediante RLS (Row Level Security).

## 📋 Gestión Integral de Cartera

### Clientes (B2B)
- **Directorio Interactivo**: Gestión completa con filtros glassmorphic avanzados (situación, responsable, rubro).
- **Importación/Exportación Inteligente**: Integración de SheetJS para carga masiva desde Excel y reportes personalizados.
- **Validación Geográfica**: Normalización de direcciones en tiempo real durante la edición.

### Consumidores (B2C) & Repartidores
- **Control de Ciclo de Ventas**: Base de datos independiente para consumidores finales.
- **Administración de Flota**: Seguimiento de estados de repartidores, desde el reclutamiento hasta la activación logística.

## 📊 Business Intelligence (Estadísticas 360°)
- **Dashboard en Tiempo Real**: Visualización de KPIs clave, tasas de conversión y efectividad de activadores.
- **Gráficos Dinámicos**: Implementación de Chart.js para análisis de tendencias, distribución de estados y rendimiento de equipo.
- **Historial de Actividad**: Seguimiento puntual de cada interacción, visita o comentario vinculado a usuarios específicos.

## 📅 Agenda, Kanban y Comunicación
- **Calendario Visual & Horarios**: Control de citas y gestión de turnos mediante FullCalendar.
- **Tablero Kanban**: Gestión de tareas con interfaz Drag & Drop asincrónica (`@hello-pangea/dnd`).
- **Chat Realtime**: Sistema de mensajería interna para comunicación instantánea entre el equipo y actualizaciones de logística.

---

## 🛠️ Stack Tecnológico

- **Frontend Core**: React 19 + Vite (SWC) + TanStack React Query v5.
- **Geospatial**: Leaflet + OSRM + Google Geocoding API.
- **UI/UX**: CSS Vanilla Premium (Glassmorphism, Dark Mode, Micro-animaciones).
- **Backend**: Supabase (Postgres advanced, RPCs, Storage, Realtime).
- **Librerías**: Chart.js, FullCalendar, SheetJS, Lucide React, React Hot Toast.

---

## 📂 Estructura del Proyecto

```text
src/
├── components/      # Componentes UI (React Portals, Layout, Dumb Components)
├── contexts/        # Gestión de estado global (Auth, Theme)
├── hooks/           # Custom Hooks para fetching asincrónico y lógica
├── lib/             # Clientes de servicios (Supabase, Google Maps API)
├── pages/           # Vistas dinámicas y ruteadas (Pipeline, Mapas, BI)
└── index.css        # Sistema de Diseño Global y variables CSS
```

---

## 🚀 Acceso a la Demo

🔗 **Demo Link**: [INSERTA_AQUI_TU_URL_DE_VERCEL]

**Instrucciones de Acceso:**
1. Ve a la pantalla de Login.
2. Haz clic en el botón especial **"Acceder a Demo"**.
3. El sistema autocompletará las credenciales (`test1@crm.com` / `Test1234`).

---

## 🔧 Instalación Local

```bash
# Sincroniza el repositorio
git clone https://github.com/TotoMessina/CRMPickingUp.git

# Instala dependencias
npm install

# Configura variables de entorno (.env)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...

# Inicia en modo desarrollo
npm run dev
```

---
Desarrollado para transformar la logística operativa en inteligencia de negocios.
