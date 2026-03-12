# PickingUp CRM

![PickingUp CRM](https://img.shields.io/badge/Status-Active_Development-success?style=for-the-badge)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_4-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**PickingUp CRM** es una plataforma integral de gestión comercial, logística y operativa diseñada específicamente para el ecosistema de PickingUp. El sistema permite administrar de forma centralizada la captación de locales (clientes), la flota logística (repartidores), los usuarios finales (consumidores) y el análisis de rendimiento del equipo comercial (activadores).

Está construido con una arquitectura **Multi-Empresa (Multi-tenant)** y un **stack fuertemente tipado**, garantizando el aislamiento criptográfico de datos por entorno mediante Row Level Security (RLS) en base de datos.

---

## 🌟 Funcionalidades Core del Producto

El CRM se divide en módulos interconectados que cubren todo el ciclo de vida del negocio:

### 1. 📋 Gestión de Clientes (Comercios/Locales)
El corazón comercial del sistema. Rastrea a los comercios desde el primer contacto hasta su activación y operación diaria.
- **Ciclo de Vida (Estados):** 
  - `1 - Cliente relevado` (Prospecto inicial)
  - `2 - Local Visitado No Activo`
  - `3 - Primer Ingreso`
  - `4 - Local Creado` (En onboarding)
  - `5 - Local Visitado Activo` (Operando en la plataforma)
  - `6 - Local No Interesado`
- **Filtros Avanzados y Búsqueda:** Búsqueda en tiempo real por nombre, teléfono, rubro, estado, situación operativa, nivel de interés, y responsable.
- **Seguimiento CRM (Agenda):** Botones de acción rápida para reprogramar el próximo contacto (+3 días, +7 días, +15 días, +1 mes). Filtro de "Próximos 7 días" para organizar la semana comercial.
- **Acciones con 1 Click:** Registro inmediato de "Visitas Presenciales" directamente desde la tarjeta del cliente, retroalimentando las estadísticas de los activadores al instante.
- **Trazabilidad Absoluta:** Cada edición (cambio de estado, adición de notas, cambio de responsable) genera una entrada automática en el historial de `actividades` para auditoría.
- **Importación/Exportación Inteligente:** Motor de carga masiva vía Excel (.xlsx/.csv) que soporta mapeo de fechas históricas (`created_at`).

### 2. 📊 Ecosistema de Estadísticas y KPIs
Dashboards en tiempo real potenciados por `Chart.js`, divididos en dos visiones estratégicas:
- **Dashboard Ecosistema Apps:**
  - **Crecimiento Diario:** Gráfico de barras de altas por día.
  - **Distribución de Cartera:** Gráficos Doughnut separando comercios por `Rubro`, `Estado` y `Creador`.
  - **Situación Operativa:** Análisis de locales en Estado 5 (Activos) fragmentados por "En funcionamiento", "En proceso" o "Sin comunicación nueva", con cruce multi-filtro por rubros.
  - **Evolución Consumidores/Repartidores:** Curvas de adopción diaria de nuevos usuarios y personal logístico.
- **Dashboard Gestión Activadores (Equipo Comercial):**
  - **Ranking de Efectividad:** Mide la tasa de conversión (Locales creados / Locales relevados) por cada activador.
  - **Volumen de Visitas:** Total de visitas registradas en calle por vendedor en el rango de fechas seleccionado.
  - **Desglose Diario (Stacked Bar):** Visualización apilada de qué estados logró generar cada activador en el día a día.

### 3. 🗺️ Inteligencia Geoespacial (Mapas)
Integración profunda con `Leaflet.js` para visualización geográfica táctica.
- **Mapa de Clientes y Kioscos:** Mapeo de comercios con pines que cambian de color según su estado en el embudo.
- **Mapa de Repartidores:** Visualización en vivo de la flota logística.
- **Modo Capa de Cobertura:** Dibuja automáticamente radios de 2KM alrededor de locales/repartidores activos para visualizar agujeros blancos de servicio.
- **Mapas de Calor (Heatmaps):** Interpolación de densidad térmica para entender zonas de alta concentración de comercios o repartidores consolidados.
- **Geolocalización en Campo:** Botón de "Ubicarme" (`navigator.geolocation`) para centrar el mapa en el activador y permitir registro in-situ ("Registrar Aquí").

### 4. 🛵 Logística y Usuarios Finales
- **Repartidores:** Panel de control de la flota. Control de estado documental ("Documentación sin gestionar", "Cuenta confirmada", "Cuenta confirmada y repartiendo"). Soporta importación masiva.
- **Consumidores:** Base de datos de usuarios de la app final con fechas de registro unificadas.

### 5. 🛠️ Herramientas Operativas Adicionales
- **Pipeline:** Vista Kanban (tipo Trello) para mover clientes arrastrándolos entre diferentes fases de negociación en tiempo real.
- **Calendario y Horarios:** Visualización de turnos o compromisos a lo largo del mes. Agenda visual tipo grilla.
- **Soporte (Tickets y Calificaciones):** Gestión de reclamos y análisis del feedback de usuarios.
- **Chat Interno:** Canal de comunicación integrado en la plataforma.

### 6. 🏢 Arquitectura Multi-Empresa & Seguridad (Multi-tenant)
- **Aislamiento Total:** El sistema soporta múltiples empresas operando en paralelo. Absolutamente todas las consultas SQL y llamadas a APIs están filtradas por el `empresa_id` de la empresa activa del usuario.
- **Row Level Security (RLS):** Las políticas en la base de datos limitan la manipulación de datos a nivel subyacente.
- **Gestión de Permisos:** Los administradores globales pueden navegar entre empresas; los empleados locales solo interactúan con la información de su franquicia asignada.

---

## 💻 Arquitectura Técnica (Frontend)

El proyecto utiliza un stack moderno optimizado para Progressive Web Apps (PWA) de alto rendimiento, con un enfoque en la robustez y escalabilidad.

- **Framework & Lenguaje:** `React 18` + `TypeScript`. El uso de TypeScript en los módulos de Clientes, Estadísticas y Utilidades garantiza un desarrollo seguro, con detección de errores en tiempo de compilación y autocompletado avanzado.
- **Estado Asíncrono (Caching):** Utiliza `React Query (@tanstack/react-query)` v5. Minimiza las peticiones a la red mediante un caché agresivo (staleTime de 30s) permitiendo a múltiples activadores colaborar sin colisiones. Las ediciones locales invalidan inteligentemente (`queryClient.invalidateQueries`) solo las secciones afectadas.
- **Backend-as-a-Service:** `Supabase`. Conexión directa a PostgreSQL mediante el sdk de supabase. Uso intensivo de RPCs (Remote Procedure Calls) y Triggers SQL para asegurar transacciones ACID durante cargas complejas.
- **PWA Ready:** Configurado vía `vite-plugin-pwa` con service workers generados por `Workbox`. 
  - Capacidad nativa de instalación (Add to Home Screen).
  - Experiencia "app-like" en iOS y Android.
  - Funcionamiento offline parcial y caching agresivo de assets.
- **UI/UX:** Sistema de diseño propietario modularizado, escrito en `Vanilla CSS` puro, soportando de forma nativa variables CSS para Light/Dark Mode fluído.

### 🛡️ Calidad y Robustez

- **Unit Testing:** Integración de `Vitest` para pruebas unitarias de lógica de negocio pura (procesamiento de fechas, cálculos de KPIs), asegurando que el motor de la aplicación sea fiable.
- **Resiliencia (Error Boundaries):** Implementación de límites de error de React en secciones críticas como gráficos. Si un componente falla individualmente, el resto de la aplicación permanece operativa.
- **Modularización:** Lógica de datos separada de la vista mediante Custom Hooks (`useStatistics`, `useClientsLogic`), mejorando la mantenibilidad y legibilidad del código.

---

## 📦 Instalación Local y Desarrollo

### Prerrequisitos
- Node.js versión 18+ (Recomendado 20 LTS)
- NPM o Yarn

### Pasos de despliegue local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/TotoMessina/CRMPicking.git
   cd CRMPicking/crm-react
   ```

2. **Instalar las dependencias**
   ```bash
   npm install
   ```

3. **Variables de Entorno**
   ```bash
   cp .env.example .env
   ```
   Abre el archivo `.env` recién creado y completa las claves de tu proyecto de Supabase:
   - `VITE_SUPABASE_URL`: La URL de tu instancia de Supabase.
   - `VITE_SUPABASE_ANON_KEY`: La clave pública anónima de la API.

4. **Levantar el entorno de desarrollo**
   ```bash
   npm run dev
   ```
   El proyecto estará disponible en `http://localhost:5173`.

5. **Ejecutar Pruebas Unitarias**
   ```bash
   npm run test
   ```
   Lanza la suite de pruebas de Vitest para validar la lógica de utilidades y hooks.

---

## 🌐 Estructura de Despliegue (Producción)

El proyecto cuenta con despliegue unificado y automático (CI/CD) a través de **Vercel**. Cualquier Pull Request o push directo a la rama principal (`main`) dispara un build de producción. 

El archivo `vercel.json` incluye reglas personalizadas para Single Page Applications (SPA), interceptando todos los endpoints y redirigiéndolos al `index.html` central, previniendo errores 404 de "Page Not Found" en navegaciones directas a rutas profundas.
