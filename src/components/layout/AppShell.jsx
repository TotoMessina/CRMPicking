import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CommandPalette } from '../ui/CommandPalette';
import {
    LogOut, Moon, Sun, Bell, MapPin, Users, Activity,
    Map, Settings, Calendar, Clock, ShoppingCart, Truck, Ticket, Star, MessageCircle, LayoutDashboard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Utility to convert Base64 VAPID to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function AppShell() {
    const { user, role, userName, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);

    useEffect(() => {
        if ('Notification' in window && navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) setPushEnabled(true);
                });
            });
        }
    }, []);

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

    const handleSubscribePush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error('Las notificaciones push no están soportadas en este navegador.');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Must provide your VAPID Public Key here. It should be safe to expose on frontend.
                const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BOgAhv4pIXj5g9FXfR7BYaEVnnWSwsgKsgymp0BqOYSaBUnSqtglbkl85wCBP39UTMYGUX_xCQevEcdOKN3OcQY";
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

            // Save the subscription logic to Supabase
            if (user?.email) {
                const { error } = await supabase.from('push_subscriptions').upsert(
                    { user_email: user.email, subscription: JSON.parse(JSON.stringify(subscription)) },
                    { onConflict: 'user_email,subscription' }
                );

                if (error) throw error;
            }

            setPushEnabled(true);
            toast.success('¡Notificaciones activadas exitosamente!', { icon: '🔔' });

        } catch (error) {
            console.error('Error suscribiendo al push:', error);
            if (Notification.permission === 'denied') {
                toast.error('Permiso denegado. Habilita las notificaciones en tu navegador.');
            } else {
                toast.error('Ocurrió un error al activar notificaciones.');
            }
        }
    };

    const isActivador = role?.includes('activador');

    // Routes visible to activadores
    const activadorRoutes = new Set(['/', '/clientes', '/calendario', '/mapa', '/configuracion', '/chat', '/tablero']);

    const allNavItems = [
        { to: '/', icon: MapPin, label: 'Inicio' },
        { to: '/chat', icon: MessageCircle, label: 'Chat Interno' },
        { to: '/clientes', icon: Activity, label: 'Clientes' },
        { to: '/pipeline', icon: Activity, label: 'Pipeline' },
        { to: '/tablero', icon: LayoutDashboard, label: 'Tablero Tareas' },
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
        { to: '/usuarios', icon: Users, label: 'Usuarios' },
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
                        <strong>{userName || user?.email || 'Cargando...'}</strong>
                    </div>
                </div>

                <button type="button" onClick={toggleTheme} className="btn-secundario theme-toggle">
                    {theme === 'dark' ? <><Sun size={16} className="mr-2" /> Modo día</> : <><Moon size={16} className="mr-2" /> Modo noche</>}
                </button>
                <button type="button" onClick={handleSubscribePush} disabled={pushEnabled} className="btn-secundario theme-toggle" style={{ marginTop: '8px', opacity: pushEnabled ? 0.6 : 1, cursor: pushEnabled ? 'default' : 'pointer' }}>
                    <Bell size={16} className="mr-2" /> {pushEnabled ? 'Notificaciones On' : 'Activar Notificaciones'}
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
