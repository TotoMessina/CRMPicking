import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { NetworkStatusHandler } from './components/ui/NetworkStatusHandler';
import { UpdateNotifier } from './components/ui/UpdateNotifier';
import { AppShell } from './components/layout/AppShell';
import { GlobalLoader } from './components/ui/GlobalLoader';
import Login from './pages/Login';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import InternalAI from './pages/InternalAI';

const Clientes = lazy(() => import('./pages/Clientes'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Consumidores = lazy(() => import('./pages/Consumidores'));
const Repartidores = lazy(() => import('./pages/Repartidores'));
const Proveedores = lazy(() => import('./pages/Proveedores'));
const MapaClientes = lazy(() => import('./pages/MapaClientes'));
const MapaRepartidores = lazy(() => import('./pages/MapaRepartidores'));
const MapaConsumidores = lazy(() => import('./pages/MapaConsumidores'));
const MapaGlobal = lazy(() => import('./pages/MapaGlobal'));
const Calendario = lazy(() => import('./pages/Calendario'));
const Horarios = lazy(() => import('./pages/Horarios'));
const Estadisticas = lazy(() => import('./pages/Estadisticas'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Chat = lazy(() => import('./pages/Chat'));
const TableroTareas = lazy(() => import('./pages/TableroTareas'));
const Empresas = lazy(() => import('./pages/Empresas'));
const PermisosEmpresa = lazy(() => import('./pages/PermisosEmpresa'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const ActividadSistema = lazy(() => import('./pages/ActividadSistema'));
const Historial = lazy(() => import('./pages/Historial'));
const RutaDiaria = lazy(() => import('./pages/RutaDiaria'));
const AsignadorRutas = lazy(() => import('./pages/AsignadorRutas'));
const TinderClientes = lazy(() => import('./pages/TinderClientes'));
const PipelineSettings = lazy(() => import('./pages/PipelineSettings'));

function App(): React.JSX.Element {
  // Interceptar recuperación de contraseña si Supabase nos mandó a la raíz
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes("type=recovery") && window.location.pathname !== '/update-password') {
      window.location.replace('/update-password' + window.location.hash);
    }
  }, []);

  return (
    <>
      <Toaster 
        position="top-right" 
        containerStyle={{
          zIndex: 2147483647,
        }}
      />
      <NetworkStatusHandler />
      <UpdateNotifier />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Suspense fallback={<GlobalLoader />}><Chat /></Suspense>} />
            <Route path="/tablero" element={<Suspense fallback={<GlobalLoader />}><TableroTareas /></Suspense>} />
            <Route path="/clientes" element={<Suspense fallback={<GlobalLoader />}><Clientes /></Suspense>} />
            <Route path="/pipeline" element={<Suspense fallback={<GlobalLoader />}><Pipeline /></Suspense>} />
            <Route path="/consumidores" element={<Suspense fallback={<GlobalLoader />}><Consumidores /></Suspense>} />
            <Route path="/repartidores" element={<Suspense fallback={<GlobalLoader />}><Repartidores /></Suspense>} />
            <Route path="/proveedores" element={<Suspense fallback={<GlobalLoader />}><Proveedores /></Suspense>} />
            <Route path="/calendario" element={<Suspense fallback={<GlobalLoader />}><Calendario /></Suspense>} />
            <Route path="/horarios" element={<Suspense fallback={<GlobalLoader />}><Horarios /></Suspense>} />
            <Route path="/historial" element={<Suspense fallback={<GlobalLoader />}><Historial /></Suspense>} />
            <Route path="/ruta" element={<Suspense fallback={<GlobalLoader />}><RutaDiaria /></Suspense>} />
            <Route path="/asignador-rutas" element={<Suspense fallback={<GlobalLoader />}><AsignadorRutas /></Suspense>} />
            <Route path="/mapa" element={<Suspense fallback={<GlobalLoader />}><MapaClientes /></Suspense>} />
            <Route path="/mapa-repartidores" element={<Suspense fallback={<GlobalLoader />}><MapaRepartidores /></Suspense>} />
            <Route path="/mapa-consumidores" element={<Suspense fallback={<GlobalLoader />}><MapaConsumidores /></Suspense>} />
            <Route path="/mapa-global" element={<Suspense fallback={<GlobalLoader />}><MapaGlobal /></Suspense>} />
            <Route path="/estadisticas" element={<Suspense fallback={<GlobalLoader />}><Estadisticas /></Suspense>} />
            <Route path="/tickets" element={<Suspense fallback={<GlobalLoader />}><Tickets /></Suspense>} />
            <Route path="/usuarios" element={<Suspense fallback={<GlobalLoader />}><Usuarios /></Suspense>} />
            <Route path="/empresas" element={<Suspense fallback={<GlobalLoader />}><Empresas /></Suspense>} />
            <Route path="/permisos-empresa" element={<Suspense fallback={<GlobalLoader />}><PermisosEmpresa /></Suspense>} />
            <Route path="/super-admin" element={<Suspense fallback={<GlobalLoader />}><SuperAdmin /></Suspense>} />
            <Route path="/actividad-sistema" element={<Suspense fallback={<GlobalLoader />}><ActividadSistema /></Suspense>} />
            <Route path="/configuracion/pipeline" element={<Suspense fallback={<GlobalLoader />}><PipelineSettings /></Suspense>} />
            <Route path="/ia-interna" element={<InternalAI />} />
            <Route path="/swipe-prospecting" element={<Suspense fallback={<GlobalLoader />}><TinderClientes /></Suspense>} />
            <Route path="/configuracion" element={<Suspense fallback={<GlobalLoader />}><Configuracion /></Suspense>} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
