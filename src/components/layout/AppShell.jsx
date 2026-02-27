import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CommandPalette } from '../ui/CommandPalette';
import {
    LogOut, Moon, Sun, Bell, MapPin, Users, Activity,
    Map, UserPlus, Settings, Calendar, Clock, ShoppingCart, Truck, Ticket, Star
} from 'lucide-react';

export function AppShell() {
    const { user, role, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleLogout = async (e) => {
        e.preventDefault();
        await signOut();
        navigate('/login');
    };

    const isActivador = role?.includes('activador');

    // Routes visible to activadores
    const activadorRoutes = new Set(['/', '/clientes', '/calendario', '/mapa', '/configuracion']);

    const allNavItems = [
        { to: '/', icon: MapPin, label: 'Inicio' },
        { to: '/clientes', icon: Activity, label: 'Clientes' },
        { to: '/pipeline', icon: Activity, label: 'Pipeline' },
        { to: '/consumidores', icon: Users, label: 'Consumidores' },
        { to: '/repartidores', icon: Truck, label: 'Repartidores' },
        { to: '/proveedores', icon: ShoppingCart, label: 'Proveedores' },
        { to: '/calendario', icon: Calendar, label: 'Calendario' },
        { to: '/horarios', icon: Clock, label: 'Horarios' },
        { to: '/mapa', icon: Map, label: 'Mapa Clientes' },
        { to: '/mapa-repartidores', icon: Map, label: 'Mapa Repartidores' },
        { to: '/kiosco', icon: ShoppingCart, label: 'Mapa Kiosco' },
        { to: '/estadisticas', icon: Activity, label: 'Estadísticas' },
        { to: '/tickets', icon: Ticket, label: 'Tickets' },
        { to: '/calificaciones', icon: Star, label: 'Calificaciones' },
        { spacer: true },
        { to: '/usuarios', icon: UserPlus, label: 'Usuarios' },
        { to: '/configuracion', icon: Settings, label: 'Configuración' },
    ];

    const navItems = isActivador
        ? allNavItems.filter(item => item.spacer || activadorRoutes.has(item.to))
        : allNavItems;

    if (!user) return null;

    return (
        <div className="app-shell">
            <button
                className="mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(true)}
            >
                ☰
            </button>

            <div
                className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-text">
                        <div className="logo-pu">
                            <div className="sidebar-logo">PU</div>
                            <div className="sidebar-title">PickingUp</div>
                        </div>
                    </div>
                    <button
                        className="sidebar-close-btn"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <div className="sidebar-user" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: '0 16px 16px 16px' }}>
                    <div className="user-info">
                        <span className="muted">Usuario:</span>
                        <strong>{user?.email || 'Cargando...'}</strong>
                    </div>
                </div>

                <button type="button" onClick={toggleTheme} className="btn-secundario theme-toggle">
                    {theme === 'dark' ? <><Sun size={16} className="mr-2" /> Modo día</> : <><Moon size={16} className="mr-2" /> Modo noche</>}
                </button>
                <button type="button" className="btn-secundario theme-toggle" style={{ marginTop: '8px' }}>
                    <Bell size={16} className="mr-2" /> Activar Notificaciones
                </button>

                <nav className="sidebar-nav" aria-label="Navegación principal">
                    <ul className="sidebar-menu">
                        {navItems.map((item, index) => {
                            if (item.spacer) {
                                return <li key={`spacer-${index}`} className="spacer"></li>;
                            }
                            const Icon = item.icon;
                            return (
                                <li key={item.to} onClick={() => setIsMobileMenuOpen(false)}>
                                    <NavLink
                                        to={item.to}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                    >
                                        <Icon size={18} style={{ marginRight: '8px' }} />
                                        {item.label}
                                    </NavLink>
                                </li>
                            );
                        })}
                        <li>
                            <a href="#" onClick={handleLogout} id="btnLogout">
                                <LogOut size={18} style={{ marginRight: '8px' }} />
                                Salir
                            </a>
                        </li>
                    </ul>
                </nav>
            </aside>

            <div className="app-content">
                <main style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div key={location.pathname} className="page-transition" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Outlet />
                    </div>
                </main>
            </div>

            <CommandPalette />
        </div>
    );
}
