import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAppShell } from '../../hooks/useAppShell';
import { LocationTracker } from '../ui/LocationTracker';
import { CommandPalette } from '../ui/CommandPalette';
import { EmpresaSelector } from '../ui/EmpresaSelector';
import { LogOut, Sun, Moon, Bell, Building2, ChevronDown, Navigation, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '../../contexts/TenantContext';

const SidebarBrand = ({ setIsMobileMenuOpen, empresaActiva }) => {
    const { tenantConfig } = useTenant();
    const logoUrl = empresaActiva?.config?.logoUrl || tenantConfig.app.logoUrl;
    const systemName = empresaActiva?.config?.systemName || tenantConfig.app.shortName;
    return (
    <div className="sidebar-brand">
        {logoUrl ? (
            <img
                src={logoUrl}
                alt={systemName}
                className="sidebar-logo-img"
                style={{ maxHeight: '40px', objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
            />
        ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="sidebar-logo" style={{ background: 'var(--accent)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {systemName.substring(0, 2).toUpperCase()}
                </div>
                <div className="sidebar-title" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{systemName}</div>
            </div>
        )}
        <div className="sidebar-brand-text" style={{ display: 'none' }}>
            <div className="logo-pu">
                <div className="sidebar-logo">{systemName.substring(0,2).toUpperCase()}</div>
                <div className="sidebar-title">{systemName}</div>
            </div>
        </div>
        <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Cerrar menú">×</button>
    </div>
    );
};

const UserInfo = ({ userName, email, avatarUrl, empresaActiva, empresasDisponibles, onChangeEmpresa }) => (
    <div className="sidebar-user-card">
        <div className="sidebar-avatar">
            {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                : (userName || email || '?')[0].toUpperCase()
            }
        </div>
        <div className="sidebar-user-info">
            <strong className="sidebar-user-name">{userName || email || 'Cargando...'}</strong>
            {empresaActiva && (
                <button
                    className="sidebar-empresa-btn"
                    onClick={() => empresasDisponibles.length > 1 && onChangeEmpresa()}
                    disabled={empresasDisponibles.length <= 1}
                    title={empresaActiva.nombre}
                >
                    <Building2 size={10} />
                    <span>{empresaActiva.nombre}</span>
                    {empresasDisponibles.length > 1 && <ChevronDown size={10} />}
                </button>
            )}
        </div>
    </div>
);

const NavItem = ({ item, unreadChatCount, setIsMobileMenuOpen }) => {
    const Icon = item.icon;
    return (
        <li onClick={() => setIsMobileMenuOpen(false)}>
            <NavLink 
                to={item.to} 
                id={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) => (isActive ? 'active' : '')} 
                style={{ display: 'flex', alignItems: 'center' }}
            >
                <Icon size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
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

const NAV_GROUP_ORDER = ['Activaciones', 'Operaciones', 'Planificación', 'Mapas', 'Listados', 'Administrativo'];

const NavGroup = ({ groupName, items, unreadChatCount, setIsMobileMenuOpen, isOpen, onToggle }) => {
    const hasUnread = items.some(item => item.to === '/chat');
    return (
        <li className="sidebar-nav-group">
            <button
                className={`sidebar-nav-group-label sidebar-nav-group-toggle${isOpen ? ' open' : ''}`}
                onClick={onToggle}
                aria-expanded={isOpen}
                type="button"
            >
                <span className="sidebar-nav-group-text">{groupName}</span>
                {hasUnread && !isOpen && (
                    <span className="sidebar-group-dot" aria-hidden="true" />
                )}
                <ChevronDown
                    size={13}
                    className="sidebar-nav-group-chevron"
                    aria-hidden="true"
                />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.ul
                        className="sidebar-nav-group-items"
                        key="items"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        {items.map(item => (
                            <NavItem key={item.to} item={item} unreadChatCount={unreadChatCount} setIsMobileMenuOpen={setIsMobileMenuOpen} />
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </li>
    );
};

function getActiveGroup(pathname, navItems, defaultGroup = 'Activaciones') {
    const match = navItems.find(item => {
        if (!item.to) return false;
        if (item.to === '/') return pathname === '/';
        return pathname.startsWith(item.to);
    });
    return match?.group || defaultGroup;
}

export function AppShell() {
    const {
        user, userName, avatarUrl, empresaActiva, empresasDisponibles, setEmpresaActiva,
        theme, toggleTheme, location, navigate,
        isMobileMenuOpen, setIsMobileMenuOpen,
        pushEnabled, unreadChatCount,
        showEmpresaSelector, setShowEmpresaSelector,
        isRutaActive, toggleModoRuta,
        handleLogout, handleSubscribePush, handleForceUpdate,
        navItems
    } = useAppShell();

    const routerLocation = useLocation();
    const { tenantConfig } = useTenant();
    
    const NAV_GROUP_LIST = tenantConfig?.sidebarGroups || NAV_GROUP_ORDER;

    const [openGroups, setOpenGroups] = useState(() => {
        const defaultGroup = NAV_GROUP_LIST[0] || 'Activaciones';
        const active = getActiveGroup(routerLocation.pathname, navItems, defaultGroup);
        return new Set([active]);
    });

    useEffect(() => {
        const defaultGroup = NAV_GROUP_LIST[0] || 'Activaciones';
        const active = getActiveGroup(routerLocation.pathname, navItems, defaultGroup);
        setOpenGroups(prev => {
            if (prev.has(active)) return prev;
            const next = new Set(prev);
            next.add(active);
            return next;
        });
    }, [routerLocation.pathname, navItems, NAV_GROUP_LIST]);
    
    useEffect(() => {
        if (empresaActiva?.config?.brandColor) {
            document.documentElement.style.setProperty('--accent', empresaActiva.config.brandColor);
        } else {
            document.documentElement.style.setProperty('--accent', '#7c3aded');
        }
    }, [empresaActiva]);

    useEffect(() => {
        const handleOpenGroup = (e) => {
            const { groupName } = e.detail;
            setOpenGroups(prev => {
                const next = new Set(prev);
                next.add(groupName);
                return next;
            });
        };
        window.addEventListener('coque-open-nav-group', handleOpenGroup);
        return () => window.removeEventListener('coque-open-nav-group', handleOpenGroup);
    }, []);

    const toggleGroup = (groupName) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName);
            else next.add(groupName);
            return next;
        });
    };

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

                {/* ── HEADER ──────────────────────────── */}
                <div className="sidebar-header">
                    <SidebarBrand setIsMobileMenuOpen={setIsMobileMenuOpen} empresaActiva={empresaActiva} />
                    <UserInfo
                        userName={userName}
                        email={user?.email}
                        avatarUrl={avatarUrl}
                        empresaActiva={empresaActiva}
                        empresasDisponibles={empresasDisponibles}
                        onChangeEmpresa={() => setShowEmpresaSelector(true)}
                    />
                </div>

                {/* ── NAV (scrolleable) ────────────────── */}
                <nav className="sidebar-nav" aria-label="Navegación principal">
                    <ul className="sidebar-menu">
                        {NAV_GROUP_LIST.map(groupName => {
                            const items = navItems.filter(item => item.group === groupName);
                            if (items.length === 0) return null;
                            return (
                                <NavGroup
                                    key={groupName}
                                    groupName={groupName}
                                    items={items}
                                    unreadChatCount={unreadChatCount}
                                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                                    isOpen={openGroups.has(groupName)}
                                    onToggle={() => toggleGroup(groupName)}
                                />
                            );
                        })}
                    </ul>
                </nav>

                {/* ── FOOTER ──────────────────────────── */}
                <div className="sidebar-footer">
                    {/* Botón de IA Estratégica */}
                    <button
                        className="sidebar-ruta-btn"
                        style={{ 
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(217, 70, 239, 0.2))',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            marginBottom: '8px',
                            color: 'var(--color-primary)'
                        }}
                        onClick={() => {
                            // Disparar el evento para abrir el chat
                            window.dispatchEvent(new CustomEvent('open-pickingbot'));
                        }}
                    >
                        <Bot size={14} />
                        <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{tenantConfig.ai.name}</span>
                    </button>

                    {/* Modo Ruta */}
                    <button
                        className={`sidebar-ruta-btn${isRutaActive ? ' active' : ''}`}
                        onClick={toggleModoRuta}
                        title={isRutaActive ? 'Desactivar Modo Ruta' : 'Activar Modo Ruta'}
                    >
                        <Navigation size={14} style={{ transform: isRutaActive ? 'rotate(45deg)' : 'none', transition: 'transform 0.4s ease' }} />
                        <span>{isRutaActive ? 'MODO RUTA: ON' : 'Modo Ruta'}</span>
                        {isRutaActive && <span className="sidebar-ruta-dot" />}
                    </button>

                    {/* Controles icon row */}
                    <div className="sidebar-controls">
                        {/* Theme toggle */}
                        <button
                            className="sidebar-ctrl-btn"
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                            type="button"
                        >
                            {theme === 'dark'
                                ? <Sun size={15} />
                                : <Moon size={15} />}
                        </button>

                        {/* Notifications */}
                        <button
                            className={`sidebar-ctrl-btn${pushEnabled ? ' active' : ''}`}
                            onClick={handleSubscribePush}
                            disabled={pushEnabled}
                            title={pushEnabled ? 'Notificaciones activas' : 'Activar notificaciones'}
                            type="button"
                        >
                            <Bell size={15} />
                            {pushEnabled && <span className="sidebar-ctrl-dot" />}
                        </button>

                        {/* Logout */}
                        <button
                            className="sidebar-ctrl-btn sidebar-ctrl-danger"
                            onClick={handleLogout}
                            id="btnLogout"
                            title="Cerrar sesión"
                            type="button"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>

                    {/* Version + Update */}
                    <div className="sidebar-version">
                        <span>v1.2.5</span>
                        <button onClick={handleForceUpdate} className="sidebar-update-btn">Actualizar</button>
                    </div>
                </div>

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
