import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Pipeline from './pages/Pipeline';
import Consumidores from './pages/Consumidores';
import Repartidores from './pages/Repartidores';
import Proveedores from './pages/Proveedores';
import MapaClientes from './pages/MapaClientes';
import MapaRepartidores from './pages/MapaRepartidores';
import MapaKiosco from './pages/MapaKiosco';
import Calendario from './pages/Calendario';
import Horarios from './pages/Horarios';
import Estadisticas from './pages/Estadisticas';
import Tickets from './pages/Tickets';
import Calificaciones from './pages/Calificaciones';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/consumidores" element={<Consumidores />} />
            <Route path="/repartidores" element={<Repartidores />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/horarios" element={<Horarios />} />
            <Route path="/mapa" element={<MapaClientes />} />
            <Route path="/mapa_repartidores" element={<MapaRepartidores />} />
            <Route path="/kiosco" element={<MapaKiosco />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/calificaciones" element={<Calificaciones />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
