import { AppWindow, Layers, Check, Lock, Unlock } from 'lucide-react';
import { ALL_PAGES } from '../../constants/pages';
import type { CrmRole } from '../../types/permisos';

interface TabModulosProps {
    groupedPages: Record<string, any[]>;
    permisos: Record<string, { habilitada: boolean; roles: Set<string> }>;
    setPermisos: React.Dispatch<React.SetStateAction<Record<string, { habilitada: boolean; roles: Set<string> }>>>;
    rolesDinamicos: CrmRole[];
    localSidebarGroups: string[];
    localPageGroups: Record<string, string>;
    setLocalPageGroups: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setDirty: (v: boolean) => void;
}

export function TabModulos({
    groupedPages,
    permisos,
    setPermisos,
    rolesDinamicos,
    localSidebarGroups,
    localPageGroups,
    setLocalPageGroups,
    setDirty,
}: TabModulosProps) {
    return (
        <div className="permisos-grupos-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: '-10px' }}>
                <button
                    className="btn-secundario"
                    onClick={() => { ALL_PAGES.filter(p => p.to).forEach(p => setPermisos(pr => ({ ...pr, [p.to!]: { habilitada: true, roles: new Set(rolesDinamicos.map(r => r.nombre)) } }))); setDirty(true); }}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                    <Unlock size={14} style={{ marginRight: 4 }} /> Todo
                </button>
                <button
                    className="btn-secundario danger-hover"
                    onClick={() => { ALL_PAGES.filter(p => p.to).forEach(p => setPermisos(pr => ({ ...pr, [p.to!]: { habilitada: false, roles: new Set() } }))); setDirty(true); }}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                    <Lock size={14} style={{ marginRight: 4 }} /> Nada
                </button>
            </div>

            {Object.keys(groupedPages).map(groupName => {
                const paginas = groupedPages[groupName];
                if (!paginas || paginas.length === 0) return null;

                return (
                    <section key={groupName} className="permisos-group-section">
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                            <Layers size={16} /> {groupName}
                        </h2>

                        <div className="permisos-cards-grid">
                            {paginas.map((page: any) => {
                                const perm = permisos[page.to] || { habilitada: false, roles: new Set() };
                                const isEnabled = perm.habilitada;
                                const Icon = page.icon || AppWindow;

                                return (
                                    <div key={page.to} className={`permiso-card glass-card ${isEnabled ? 'enabled' : 'disabled'}`} style={{ padding: 0, overflow: 'hidden' }}>
                                        <div className="permiso-card-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="permiso-icon-wrap" style={{ background: isEnabled ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg)', color: isEnabled ? 'var(--accent)' : 'var(--text-muted)', padding: 8, borderRadius: 8, transition: 'all 0.3s' }}>
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{page.label}</h3>
                                                </div>
                                            </div>
                                            <div onClick={() => { setPermisos(pr => ({ ...pr, [page.to]: { ...pr[page.to], habilitada: !isEnabled } })); setDirty(true); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isEnabled ? 'var(--accent)' : 'var(--text-muted)', userSelect: 'none' }}>{isEnabled ? 'ON' : 'OFF'}</span>
                                                <div className={`modern-switch ${isEnabled ? 'active' : ''}`}><div className="modern-switch-knob"></div></div>
                                            </div>
                                        </div>

                                        <div className="permiso-card-body" style={{ padding: '12px 16px', background: isEnabled ? 'transparent' : 'var(--bg-elevated)', transition: 'background 0.3s', position: 'relative' }}>
                                            <div className="roles-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {rolesDinamicos.map(rolData => {
                                                    const rol = rolData.nombre;
                                                    const hasRole = perm.roles.has(rol);
                                                    return (
                                                        <button
                                                            key={rol}
                                                            disabled={!isEnabled}
                                                            onClick={() => {
                                                                setPermisos(prev => {
                                                                    const roles = new Set(prev[page.to]?.roles || []);
                                                                    if (roles.has(rol)) roles.delete(rol); else roles.add(rol);
                                                                    return { ...prev, [page.to]: { ...prev[page.to], roles } };
                                                                });
                                                                setDirty(true);
                                                            }}
                                                            className={`role-chip ${hasRole ? 'selected' : ''}`}
                                                            style={{ '--chip-color': rolData.color_hex || 'var(--accent)', fontSize: '0.75rem', padding: '4px 10px' } as any}
                                                        >
                                                            {hasRole ? <Check size={12} /> : null} {rol}
                                                        </button>
                                                    );
                                                })}
                                                {rolesDinamicos.length === 0 && <span className="muted" style={{ fontSize: '0.8rem' }}>No hay roles creados.</span>}
                                            </div>
                                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Categoría del Sidebar</label>
                                                <select
                                                    className="input premium-input"
                                                    style={{ width: '100%', fontSize: '0.8rem', height: '32px', padding: '0 8px', cursor: isEnabled ? 'pointer' : 'not-allowed' }}
                                                    value={localPageGroups[page.to] || page.group}
                                                    disabled={!isEnabled}
                                                    onChange={e => {
                                                        setLocalPageGroups(prev => ({ ...prev, [page.to]: e.target.value }));
                                                        setDirty(true);
                                                    }}
                                                >
                                                    {localSidebarGroups.map(grp => (
                                                        <option key={grp} value={grp}>{grp}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {!isEnabled && <div style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'not-allowed' }} title="Habilita el módulo primero"></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
