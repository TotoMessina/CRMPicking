import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Shield, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_PAGES = [
    { to: '/', label: 'Inicio (Dashboard)' },
    { to: '/chat', label: 'Chat Interno' },
    { to: '/clientes', label: 'Clientes' },
    { to: '/pipeline', label: 'Pipeline' },
    { to: '/tablero', label: 'Tablero de Tareas' },
    { to: '/consumidores', label: 'Consumidores' },
    { to: '/repartidores', label: 'Repartidores' },
    { to: '/proveedores', label: 'Proveedores' },
    { to: '/calendario', label: 'Calendario' },
    { to: '/horarios', label: 'Horarios' },
    { to: '/mapa', label: 'Mapa de Clientes' },
    { to: '/mapa-repartidores', label: 'Mapa Repartidores' },
    { to: '/kiosco', label: 'Mapa Kiosco' },
    { to: '/estadisticas', label: 'Estadísticas' },
    { to: '/tickets', label: 'Tickets' },
    { to: '/calificaciones', label: 'Calificaciones' },
    { to: '/usuarios', label: 'Usuarios' },
    { to: '/empresas', label: 'Empresas' },
    { to: '/configuracion', label: 'Configuración' },
    { to: '/permisos-empresa', label: 'Permisos de Empresa' },
    { to: '/actividad-sistema', label: 'Auditoría (Log del Sistema)' },
];

const ALL_ROLES = ['admin', 'supervisor', 'activador', 'empleado'];

export default function PermisosEmpresa() {
    const { role } = useAuth();
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [permisos, setPermisos] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchEmpresas = async () => {
            const { data } = await supabase.from('empresas').select('id, nombre').order('nombre');
            setEmpresas(data || []);
            if (data?.length > 0) setSelectedEmpresa(data[0]);
        };
        fetchEmpresas();
    }, []);

    const fetchPermisos = useCallback(async () => {
        if (!selectedEmpresa) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('empresa_permisos_pagina')
            .select('*')
            .eq('empresa_id', selectedEmpresa.id);

        if (error) {
            toast.error('Error al cargar permisos');
            setLoading(false);
            return;
        }

        // Build map from DB
        const map = {};
        (data || []).forEach(row => {
            map[row.pagina] = {
                habilitada: row.habilitada,
                roles: new Set(row.roles_permitidos || []),
            };
        });

        // Fill in defaults for pages not yet in DB
        ALL_PAGES.forEach(p => {
            if (!map[p.to]) {
                map[p.to] = { habilitada: false, roles: new Set() };
            }
        });

        setPermisos(map);
        setLoading(false);
    }, [selectedEmpresa]);

    useEffect(() => {
        fetchPermisos();
    }, [fetchPermisos]);

    const toggleHabilitada = (pagina) => {
        setPermisos(prev => ({
            ...prev,
            [pagina]: {
                ...prev[pagina],
                habilitada: !prev[pagina]?.habilitada,
            }
        }));
    };

    const toggleRole = (pagina, rol) => {
        setPermisos(prev => {
            const roles = new Set(prev[pagina]?.roles || []);
            if (roles.has(rol)) roles.delete(rol);
            else roles.add(rol);
            return {
                ...prev,
                [pagina]: { ...prev[pagina], roles }
            };
        });
    };

    const enableAll = () => {
        setPermisos(prev => {
            const next = { ...prev };
            ALL_PAGES.forEach(p => {
                next[p.to] = { habilitada: true, roles: new Set(ALL_ROLES) };
            });
            return next;
        });
    };

    const disableAll = () => {
        setPermisos(prev => {
            const next = { ...prev };
            ALL_PAGES.forEach(p => {
                next[p.to] = { habilitada: false, roles: new Set() };
            });
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedEmpresa) return;
        setSaving(true);

        const rows = ALL_PAGES.map(p => ({
            empresa_id: selectedEmpresa.id,
            pagina: p.to,
            habilitada: permisos[p.to]?.habilitada ?? false,
            roles_permitidos: Array.from(permisos[p.to]?.roles || []),
            updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
            .from('empresa_permisos_pagina')
            .upsert(rows, { onConflict: 'empresa_id,pagina' });

        if (error) {
            toast.error('Error al guardar permisos');
        } else {
            toast.success('Permisos guardados correctamente');
        }

        setSaving(false);
    };

    if (role !== 'super-admin') {
        return (
            <div className="container" style={{ padding: '40px', textAlign: 'center' }}>
                <Shield size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h2>Acceso restringido</h2>
                <p className="muted">Esta página es solo para super-administradores.</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={24} /> Permisos de Empresa
                    </h1>
                    <p className="muted" style={{ margin: '4px 0 0' }}>
                        Configurá qué páginas y roles puede acceder cada empresa.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Empresa selector */}
                    <div style={{ position: 'relative' }}>
                        <select
                            className="input"
                            style={{ appearance: 'none', paddingRight: '32px', minWidth: '180px', fontWeight: 600 }}
                            value={selectedEmpresa?.id || ''}
                            onChange={e => {
                                const emp = empresas.find(c => c.id === e.target.value);
                                setSelectedEmpresa(emp);
                            }}
                        >
                            {empresas.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                    </div>

                    <button className="btn-secundario" onClick={enableAll} style={{ fontSize: '0.85rem' }}>
                        ✅ Habilitar todo
                    </button>
                    <button className="btn-secundario" onClick={disableAll} style={{ fontSize: '0.85rem' }}>
                        ❌ Deshabilitar todo
                    </button>
                    <button
                        className="btn-primario"
                        onClick={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? 'Guardando...' : '💾 Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Cargando permisos...</div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Página
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Habilitada
                                </th>
                                {ALL_ROLES.map(r => (
                                    <th key={r} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {r}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ALL_PAGES.map((page, idx) => {
                                const perm = permisos[page.to] || { habilitada: false, roles: new Set() };
                                const isEnabled = perm.habilitada;

                                return (
                                    <tr
                                        key={page.to}
                                        style={{
                                            background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-elevated)',
                                            borderBottom: '1px solid var(--border)',
                                            opacity: isEnabled ? 1 : 0.55,
                                            transition: 'opacity 0.2s',
                                        }}
                                    >
                                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Building2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                <div>
                                                    <div>{page.label}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{page.to}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Toggle ON/OFF */}
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => toggleHabilitada(page.to)}
                                                    style={{ display: 'none' }}
                                                />
                                                <div style={{
                                                    width: '40px', height: '22px', borderRadius: '11px',
                                                    background: isEnabled ? 'var(--accent)' : 'var(--border)',
                                                    position: 'relative', transition: 'background 0.2s'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute', top: '3px',
                                                        left: isEnabled ? '20px' : '3px',
                                                        width: '16px', height: '16px', borderRadius: '50%',
                                                        background: 'white', transition: 'left 0.2s',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.82rem', color: isEnabled ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>
                                                    {isEnabled ? 'ON' : 'OFF'}
                                                </span>
                                            </label>
                                        </td>

                                        {/* Role checkboxes */}
                                        {ALL_ROLES.map(rol => (
                                            <td key={rol} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <label style={{ cursor: isEnabled ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={perm.roles.has(rol)}
                                                        disabled={!isEnabled}
                                                        onChange={() => toggleRole(page.to, rol)}
                                                        style={{
                                                            width: '18px', height: '18px', cursor: isEnabled ? 'pointer' : 'not-allowed',
                                                            accentColor: 'var(--accent)'
                                                        }}
                                                    />
                                                </label>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
