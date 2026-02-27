# PickingUp CRM

> CRM interno para la gestión de clientes, activadores, logística y estadísticas del equipo PickingUp.

---

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Estilos | Vanilla CSS (dark/light mode) |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Gráficas | Chart.js + react-chartjs-2 |
| Mapas | Leaflet.js |
| PWA | vite-plugin-pwa + Workbox |
| Deploy | Vercel |

---

## 🚀 Funcionalidades principales

### 📋 Clientes
- Listado con paginación, filtros avanzados (nombre, teléfono, dirección, rubro, estado, situación, responsable, interés, estilo de contacto)
- Filtro rápido **Próximos 7 días** para agenda de contacto
- Cards con historial de actividades expandible
- Botones rápidos de próximo contacto (+3d, +7d, +15d, +1mes, Sin fecha)
- Registro de **visitas** con un click (contador visible en la card)
- Edición y eliminación de clientes
- Importación/exportación a Excel
- Historial automático al editar un cliente

### 📊 Estadísticas
- **Ecosistema Apps**: crecimiento diario, rubros, estados, situación de locales, rubros por situación (multi-filtro)
- **Gestión Activadores**: cards individuales por activador con Altas / Efectivas / Visitas y barra de efectividad, gráficos de Altas Diarias (stacked) y Efectividad de Conversión — todos filtrables por activador

### 🗺 Mapa
- Visualización geográfica de clientes y repartidores

### 📅 Calendario
- Agenda visual de actividades programadas

### 🏪 Otros módulos
- Proveedores, Repartidores, Consumidores, Pipeline, Tickets, Calificaciones

---

## 📦 Instalación local

```bash
# Clonar el repo
git clone https://github.com/TotoMessina/CRMPicking.git
cd CRMPicking/crm-react

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# Iniciar servidor de desarrollo
npm run dev
```

---

## 📱 PWA (Instalable)

La aplicación es una **Progressive Web App**. En navegadores compatibles (Chrome, Edge, Safari iOS) aparece el botón "Instalar app" en la barra de dirección, o se puede agregar a la pantalla de inicio desde el menú del navegador.

- ✅ Offline-ready (Workbox service worker)
- ✅ Icono de app personalizado
- ✅ Funciona en modo standalone (sin barra del navegador)
- ✅ Tema oscuro nativo

---

## 🌐 Deploy

El proyecto se despliega automáticamente en **Vercel** al hacer push a `main`.

Las rutas SPA están configuradas en `vercel.json` para evitar errores 404 al recargar páginas.

---

## 🗂 Estructura del proyecto

```
crm-react/
├── public/
│   ├── icon-192.png      # Icono PWA 192x192
│   └── icon-512.png      # Icono PWA 512x512
├── src/
│   ├── components/
│   │   └── ui/           # Modales, botones y UI compartida
│   ├── pages/            # Páginas principales (Clientes, Estadísticas, etc.)
│   ├── lib/              # Cliente Supabase
│   └── main.jsx
├── index.html
├── vite.config.js        # Configuración Vite + PWA
└── vercel.json           # Redirects para SPA
```
