import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
    MapPin, Users, Activity, Map, Settings, Calendar, Clock, 
    ShoppingCart, Truck, Ticket, Star, MessageCircle, LayoutDashboard, Building2, Shield, Database 
} from 'lucide-react';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const useAppShell = () => {
    const { user, role, userName, signOut, empresaActiva, empresasDisponibles, setEmpresaActiva, paginasPermitidas } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [showEmpresaSelector, setShowEmpresaSelector] = useState(false);

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

    useEffect(() => {
        if (!user) return;

        const fetchUnread = async () => {
            const { count, error } = await supabase
                .from('mensajes_chat')
                .select('*', { count: 'exact', head: true })
                .eq('para_usuario', user.email)
                .eq('leido', false)
                .eq('empresa_id', empresaActiva?.id);

            if (!error && count !== null) {
                setUnreadChatCount(count);
            }
        };

        fetchUnread();

        const handleMessagesRead = () => fetchUnread();
        window.addEventListener('chat-messages-read', handleMessagesRead);

        const channel = supabase
            .channel('global_chat_updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_chat', filter: `para_usuario=eq.${user.email}` }, (payload) => {
                if (!payload.new.leido) setUnreadChatCount(prev => prev + 1);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes_chat', filter: `para_usuario=eq.${user.email}` }, () => {
                fetchUnread();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('chat-messages-read', handleMessagesRead);
        };
    }, [user, empresaActiva]);

    const handleLogout = async (e) => {
        e?.preventDefault();
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
                const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BOgAhv4pIXj5g9FXfR7BYaEVnnWSwsgKsgymp0BqOYSaBUnSqtglbkl85wCBP39UTMYGUX_xCQevEcdOKN3OcQY";
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

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
            toast.error(Notification.permission === 'denied' ? 'Permiso denegado. Habilita las notificaciones.' : 'Ocurrió un error al activar notificaciones.');
        }
    };

    const navItems = (() => {
        const isSuperAdmin = role === 'super-admin';
        const effectiveRole = isSuperAdmin ? 'super-admin' : (empresaActiva?.role_en_empresa?.toLowerCase() || role);
        const isActivador = effectiveRole?.includes('activador');
        const isAdmin = effectiveRole === 'admin' || effectiveRole === 'super-admin';
        const activadorRoutes = new Set(['/', '/clientes', '/calendario', '/mapa', '/configuracion', '/chat', '/tablero', '/historial']);

        const allItems = [
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
            { to: '/historial', icon: Clock, label: 'Buscador Historial' },
            { to: '/mapa', icon: Map, label: 'Mapa Clientes' },
            { to: '/mapa-repartidores', icon: Map, label: 'Mapa Repartidores' },
            { to: '/kiosco', icon: ShoppingCart, label: 'Mapa Kiosco' },
            { to: '/estadisticas', icon: Activity, label: 'Estadísticas' },
            { to: '/tickets', icon: Ticket, label: 'Tickets' },
            { to: '/calificaciones', icon: Star, label: 'Calificaciones' },
            { spacer: true },
            { to: '/usuarios', icon: Users, label: 'Usuarios' },
            { to: '/empresas', icon: Building2, label: 'Empresas', adminOnly: true },
            { to: '/permisos-empresa', icon: Shield, label: 'Permisos' },
            { to: '/actividad-sistema', icon: Database, label: 'Auditoría' },
            { to: '/configuracion', icon: Settings, label: 'Configuración' },
        ];

        if (isSuperAdmin) return allItems;
        // Only use permission-based filtering if there are actual entries configured
        if (paginasPermitidas && Object.keys(paginasPermitidas).length > 0) {
            return allItems.filter(item => {
                if (item.spacer) return true;
                if (item.superAdminOnly) return false;
                const perm = paginasPermitidas[item.to];
                return perm && perm.includes(effectiveRole);
            });
        }
        // Fallback: default role-based filtering
        if (isActivador) return allItems.filter(item => item.spacer || activadorRoutes.has(item.to));
        return allItems.filter(item => !item.adminOnly && !item.superAdminOnly || isAdmin);
    })();

    const handleForceUpdate = async () => {
        if (window.confirm('¿Limpiar cache y forzar actualización?')) {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let r of regs) await r.unregister();
            }
            localStorage.clear();
            window.location.reload(true);
        }
    };

    return {
        user, role, userName, signOut, empresaActiva, empresasDisponibles, setEmpresaActiva,
        theme, toggleTheme, navigate, location,
        isMobileMenuOpen, setIsMobileMenuOpen,
        pushEnabled, unreadChatCount,
        showEmpresaSelector, setShowEmpresaSelector,
        handleLogout, handleSubscribePush, handleForceUpdate,
        navItems
    };
};
