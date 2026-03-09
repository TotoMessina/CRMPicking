const fs = require('fs');

const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Suspense and lazy, and GlobalLoader
content = content.replace(
    "import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';",
    "import React, { Suspense, lazy } from 'react';\nimport { BrowserRouter as Router, Routes, Route } from 'react-router-dom';"
);

content = content.replace(
    "import { AppShell } from './components/layout/AppShell';",
    "import { AppShell } from './components/layout/AppShell';\nimport { GlobalLoader } from './components/ui/GlobalLoader';"
);

// 2. Replace static imports with lazy (except Login and Dashboard)
const pagesToLazyLoad = [
    'Clientes', 'Pipeline', 'Consumidores', 'Repartidores', 'Proveedores',
    'MapaClientes', 'MapaRepartidores', 'MapaKiosco', 'Calendario', 'Horarios',
    'Estadisticas', 'Tickets', 'Calificaciones', 'Usuarios', 'Configuracion',
    'Chat', 'TableroTareas', 'Empresas', 'PermisosEmpresa'
];

pagesToLazyLoad.forEach(page => {
    const rx = new RegExp(`import ${page} from '\\.\\/pages\\/${page}';\\r?\\n`, 'g');
    content = content.replace(
        rx,
        `const ${page} = lazy(() => import('./pages/${page}'));\n`
    );
});

// 3. Wrap the routes with Suspense
// Find: <Route element={<AppShell />}>
// Replace with: <Route element={<AppShell />}>\n            <Route element={<Suspense fallback={<GlobalLoader />}><Outlet /></Suspense>}>
// But App.jsx doesn't have Outlet imported. A simpler way is to wrap the children of AppShell individually.
// Example: <Route path="/clientes" element={<Clientes />} /> to element={<Suspense fallback={<GlobalLoader />}><Clientes /></Suspense>}

pagesToLazyLoad.forEach(page => {
    const rx = new RegExp(`element=\\{<${page} \\/>\\}`, 'g');
    content = content.replace(
        rx,
        `element={<Suspense fallback={<GlobalLoader />}><${page} /></Suspense>}`
    );
});

fs.writeFileSync(path, content);
console.log('App.jsx successfully refactored for lazy loading');
