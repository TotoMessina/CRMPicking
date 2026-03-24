import { NavLink, Outlet } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAppShell } from '../../hooks/useAppShell';
import { LocationTracker } from '../ui/LocationTracker';
import { CommandPalette } from '../ui/CommandPalette';
import { EmpresaSelector } from '../ui/EmpresaSelector';
import { LogOut, Sun, Moon, Bell, Building2, ChevronDown, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarBrand = ({ setIsMobileMenuOpen }) => (
    <div className="sidebar-brand">
        <img 
            src="/logo-horizontal.png" 
            alt="PickingUp CRM" 
            style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block' }} 
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
        />
        <div className="sidebar-brand-text" style={{ display: 'none' }}>
            <div className="logo-pu">
                <div className="sidebar-logo">PU</div>
                <div className="sidebar-title">PickingUp</div>
            </div>
        </div>
        <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)}>×</button>
    </div>
);

const UserInfo = ({ userName, email }) => (
    <div className="sidebar-user" style={{ marginTop: 0, background: 'transparent', border: 'none', padding: '0 16px 8px 16px' }}>
        <div className="user-info">
            <span className="muted">Usuario:</span>
            <strong>{userName || email || 'Cargando...'}</strong>
        </div>
    </div>
);

const NavItem = ({ item, unreadChatCount, setIsMobileMenuOpen }) => {
    if (item.spacer) return <li className="spacer"></li>;
    const Icon = item.icon;
    return (
        <li onClick={() => setIsMobileMenuOpen(false)}>
            <NavLink to={item.to} className={({ isActive }) => (isActive ? 'active' : '')} style={{ display: 'flex', alignItems: 'center' }}>
                <Icon size={18} style={{ marginRight: '8px' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.to === '/chat' && unreadChatCount > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', marginLeft: 'auto' }}>
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                )}
            </NavLink>
        </li>
    );
};

export function AppShell() {
    const {
        user, userName, empresaActiva, empresasDisponibles, setEmpresaActiva,
        theme, toggleTheme, location, navigate,
        isMobileMenuOpen, setIsMobileMenuOpen,
        pushEnabled, unreadChatCount,
        showEmpresaSelector, setShowEmpresaSelector,
        isRutaActive, toggleModoRuta,
        handleLogout, handleSubscribePush, handleForceUpdate,
        navItems
    } = useAppShell();

    if (!user) return null;

    if (!empresaActiva && empresasDisponibles.length > 1) {
        return <EmpresaSelector empresas={empresasDisponibles} onSelect={setEmpresaActiva} />;
    }

    return (
        <div className="app-shell">
            {showEmpresaSelector && empresasDisponibles.length > 1 && (
                <EmpresaSelector empresas={empresasDisponibles} onSelect={(emp) => { setEmpresaActiva(emp); setShowEmpresaSelector(false); navigate('/'); }} />
            )}

            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
            <div className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <SidebarBrand setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <UserInfo userName={userName} email={user?.email} />

                {empresaActiva && (
                    <div style={{ padding: '0 16px 16px 16px' }}>
                        <button
                            onClick={() => empresasDisponibles.length > 1 && setShowEmpresaSelector(true)}
                            disabled={empresasDisponibles.length <= 1}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', cursor: empresasDisponibles.length > 1 ? 'pointer' : 'default', color: 'var(--text)' }}
                        >
                            <Building2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {empresaActiva.nombre}
                            </span>
                            {empresasDisponibles.length > 1 && <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tema visual</span>
                    <button 
                        onClick={toggleTheme}
                        type="button"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: theme === 'dark' ? '#0f172a' : '#cbd5e1', border: '1px solid var(--border)', borderRadius: '30px',
                            width: '56px', height: '28px', padding: '3px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Sun size={13} color={theme === 'dark' ? '#64748b' : '#f59e0b'} style={{ zIndex: 1, marginLeft: '3px' }} />
                        <Moon size={13} color={theme === 'dark' ? '#60a5fa' : '#64748b'} style={{ zIndex: 1, marginRight: '3px' }} />
                        <div style={{
                            position: 'absolute', top: '1px', left: theme === 'dark' ? '29px' : '1px',
                            width: '24px', height: '24px', background: theme === 'dark' ? '#1e293b' : '#ffffff',
                            borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)', zIndex: 2
                        }} />
                    </button>
                </div>
                
                <div style={{ padding: '0 16px', marginTop: '16px' }}>
                    <button type="button" onClick={handleSubscribePush} disabled={pushEnabled} className="btn-secundario theme-toggle" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: pushEnabled ? 0.6 : 1, cursor: pushEnabled ? 'default' : 'pointer' }}>
                        <Bell size={16} style={{ marginRight: '8px' }} /> {pushEnabled ? 'Notificaciones On' : 'Activar Notificaciones'}
                    </button>
                </div>

                <div style={{ padding: '8px 16px' }}>
                    <button 
                        onClick={toggleModoRuta}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '12px',
                            borderRadius: '12px',
                            border: isRutaActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: isRutaActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                            color: isRutaActive ? 'var(--accent)' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: isRutaActive ? '0 0 15px rgba(37, 99, 235, 0.2)' : 'none'
                        }}
                    >
                        <Navigation size={16} style={{ transform: isRutaActive ? 'rotate(45deg)' : 'none', transition: 'transform 0.5s ease' }} />
                        {isRutaActive ? 'MODO RUTA: ON' : 'ACTIVAR MODO RUTA'}
                    </button>
                    {isRutaActive && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--accent)', textAlign: 'center', marginTop: '4px', fontWeight: 600, animation: 'pulse 2s infinite' }}>
                            Pantalla encendida • Tracking priorizado
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav" aria-label="Navegación principal">
                    <ul className="sidebar-menu">
                        {navItems.map((item, idx) => (
                            <NavItem key={item.to || `spacer-${idx}`} item={item} unreadChatCount={unreadChatCount} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                        ))}
                        <li>
                            <a href="#" onClick={handleLogout} id="btnLogout">
                                <LogOut size={18} style={{ marginRight: '8px' }} />
                                Salir
                            </a>
                        </li>
                    </ul>
                    <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>v1.2.5-DEBUG-REFRESH</div>
                        <button onClick={handleForceUpdate} style={{ width: '100%', padding: '6px', fontSize: '0.7rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>ACTUALIZAR SOFTWARE</button>
                    </div>
                </nav>
            </aside>

            <div className="app-content">
                <main style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={location.pathname} 
                            className="page-transition" 
                            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <ErrorBoundary>
                                <Outlet />
                            </ErrorBoundary>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
            <LocationTracker />
            <CommandPalette />
        </div>
    );
}
