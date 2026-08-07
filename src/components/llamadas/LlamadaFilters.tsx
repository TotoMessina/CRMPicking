import React from 'react';
import { LlamadaFilters as Filters } from '../../hooks/useLlamadas';
import { Search, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyUsers } from '../../hooks/useCompanyUsers';

const RUBROS = [
    { value: '', label: 'Todos los rubros' },
    { value: 'kiosco', label: 'Kiosco / Almacén' },
    { value: 'almacen', label: 'Almacén' },
    { value: 'autoservicio', label: 'Autoservicio' },
    { value: 'otro', label: 'Otro' },
    { value: 'sin_comercio', label: 'Sin Comercio' },
];

const RESPUESTAS = [
    { value: '', label: 'Todas las respuestas' },
    { value: 'sin_respuesta', label: 'Sin Respuesta' },
    { value: 'numero_incorrecto', label: 'Número incorrecto o inexistente' },
    { value: 'otro_momento', label: 'Llamada en otro momento' },
    { value: 'sin_interes', label: 'Sin Interés' },
    { value: 'exitosa', label: 'Llamada Exitosa' },
    { value: 'sin_comercio', label: 'Sin Comercio' },
];

interface Props {
    filters: Filters;
    updateFilter: (key: keyof Filters, value: string) => void;
}

const inputStyle: React.CSSProperties = {
    padding: '9px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s',
};

export function LlamadaFilters({ filters, updateFilter }: Props) {
    const { empresaActiva } = useAuth();
    const { data: usuarios = [] } = useCompanyUsers(empresaActiva?.id || null);

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '28px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', flexShrink: 0 }}>
                <Filter size={16} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Filtros
                </span>
            </div>

            {/* Búsqueda general */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    id="llamadas-filter-busqueda"
                    type="text"
                    placeholder="Nombre, apellido o teléfono..."
                    value={filters.busqueda}
                    onChange={e => updateFilter('busqueda', e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '34px' }}
                />
            </div>

            {/* Operador */}
            <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
                <select
                    id="llamadas-filter-operador"
                    value={filters.operador}
                    onChange={e => updateFilter('operador', e.target.value)}
                    style={inputStyle}
                >
                    <option value="">Todos los operadores</option>
                    {usuarios.map(u => (
                        <option key={u} value={u}>{u}</option>
                    ))}
                </select>
            </div>

            {/* Rubro */}
            <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
                <select
                    id="llamadas-filter-rubro"
                    value={filters.rubro}
                    onChange={e => updateFilter('rubro', e.target.value)}
                    style={inputStyle}
                >
                    {RUBROS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            </div>

            {/* Respuesta */}
            <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                <select
                    id="llamadas-filter-respuesta"
                    value={filters.respuesta}
                    onChange={e => updateFilter('respuesta', e.target.value)}
                    style={inputStyle}
                >
                    {RESPUESTAS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            </div>

            {/* Reset */}
            {(filters.busqueda || filters.operador || filters.rubro || filters.respuesta) && (
                <button
                    onClick={() => {
                        updateFilter('busqueda', '');
                        updateFilter('operador', '');
                        updateFilter('rubro', '');
                        updateFilter('respuesta', '');
                    }}
                    style={{
                        padding: '9px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Limpiar
                </button>
            )}
        </div>
    );
}
