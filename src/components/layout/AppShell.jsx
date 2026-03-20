import { NavLink, Outlet } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAppShell } from '../../hooks/useAppShell';
import { LocationTracker } from '../ui/LocationTracker';
import { CommandPalette } from '../ui/CommandPalette';
import { EmpresaSelector } from '../ui/EmpresaSelector';
import { LogOut, Sun, Moon, Bell, Building2, ChevronDown } from 'lucide-react';

const SidebarBrand = ({ setIsMobileMenuOpen }) => (
    <div className="sidebar-brand">
        <div className="sidebar-brand-text">
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

                <button type="button" onClick={toggleTheme} className="btn-secundario theme-toggle">
                    {theme === 'dark' ? <><Sun size={16} className="mr-2" /> Modo día</> : <><Moon size={16} className="mr-2" /> Modo noche</>}
                </button>
                <button type="button" onClick={handleSubscribePush} disabled={pushEnabled} className="btn-secundario theme-toggle" style={{ marginTop: '8px', opacity: pushEnabled ? 0.6 : 1, cursor: pushEnabled ? 'default' : 'pointer' }}>
                    <Bell size={16} className="mr-2" /> {pushEnabled ? 'Notificaciones On' : 'Activar Notificaciones'}
                </button>

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
                <main style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div key={location.pathname} className="page-transition" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </div>
                </main>
            </div>
            <LocationTracker />
            <CommandPalette />
        </div>
    );
}
