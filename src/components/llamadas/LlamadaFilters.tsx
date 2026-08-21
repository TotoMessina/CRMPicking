import React from 'react';
import { LlamadaFilters as Filters } from '../../hooks/useLlamadas';
import { Search, Filter, PhoneCall, Calendar, Sparkles, MessageCircle, X } from 'lucide-react';
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

const ETIQUETAS = [
    { value: '', label: 'Todas las etiquetas' },
    { value: 'cliente nuevo', label: '✨ Cliente Nuevo' },
    { value: 'cliente actualizado', label: '🔄 Cliente Actualizado' },
];

const ORIGENES_CONTACTO = [
    { value: '', label: 'Todos los orígenes' },
    { value: 'Me contactaron por llamada', label: 'Me contactaron por llamada' },
    { value: 'Publicidad en instagram', label: 'Publicidad en instagram' },
    { value: 'Ya conocia Instalshop', label: 'Ya conocia Instalshop' },
];

const CANTIDADES_LLAMADAS = [
    { value: '', label: 'Cualquier cantidad de llamadas' },
    { value: '0', label: '⏳ Sin llamadas (0 - Pendientes)' },
    { value: '1', label: '📞 Solo 1 llamada (= 1)' },
    { value: '1+', label: '📞 1 o más llamadas (≥ 1)' },
    { value: '2+', label: '📞 2 o más llamadas (≥ 2)' },
    { value: '3+', label: '📞 3 o más llamadas (≥ 3)' },
    { value: '5+', label: '🔥 5 o más llamadas (≥ 5)' },
];

const FECHAS_MODIFICACION = [
    { value: '', label: 'Cualquier fecha de modificación' },
    { value: 'hoy', label: '⚡ Modificados hoy' },
    { value: '7d', label: '📅 Últimos 7 días' },
    { value: '30d', label: '📅 Últimos 30 días' },
    { value: 'custom', label: '📆 Rango personalizado...' },
];

const ESTADOS_CONVERSION = [
    { value: '', label: 'Cualquier conversión' },
    { value: 'whatsapp', label: '💬 WhatsApp enviado' },
    { value: 'formulario', label: '📝 Formulario completado' },
    { value: 'listo', label: '✅ Envió "Listo"' },
    { value: 'redes', label: '✨ Siguió en redes' },
];

interface Props {
    filters: Filters;
    updateFilter: (key: keyof Filters, value: string) => void;
    onReset?: () => void;
}

const inputStyle: React.CSSProperties = {
    padding: '9px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text)',
    fontSize: '0.85rem',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s',
};

export function LlamadaFilters({ filters, updateFilter, onReset }: Props) {
    const { empresaActiva } = useAuth();
    const { data: usuarios = [] } = useCompanyUsers(empresaActiva?.id || null);

    const activeCount = [
        filters.busqueda,
        filters.operador,
        filters.rubro,
        filters.respuesta,
        filters.etiqueta,
        filters.origen_contacto,
        filters.cantidad_llamadas,
        filters.fecha_modificacion,
        filters.fecha_desde,
        filters.fecha_hasta,
        filters.estado_conversion
    ].filter(Boolean).length;

    const handleClearAll = () => {
        if (onReset) {
            onReset();
        } else {
            updateFilter('busqueda', '');
            updateFilter('operador', '');
            updateFilter('rubro', '');
            updateFilter('respuesta', '');
            updateFilter('etiqueta', '');
            updateFilter('origen_contacto', '');
            updateFilter('cantidad_llamadas', '');
            updateFilter('fecha_modificacion', '');
            updateFilter('fecha_desde', '');
            updateFilter('fecha_hasta', '');
            updateFilter('estado_conversion', '');
        }
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
        }}>
            {/* Cabecera de filtros */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                    <Filter size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Filtros de Llamadas
                    </span>
                    {activeCount > 0 && (
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'var(--accent)',
                            color: 'white',
                        }}>
                            {activeCount} activo{activeCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {activeCount > 0 && (
                    <button
                        onClick={handleClearAll}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <X size={13} /> Limpiar filtros
                    </button>
                )}
            </div>

            {/* Fila 1: Búsqueda general, Operador, Cantidad de llamadas, Modificación */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {/* Búsqueda general */}
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        id="llamadas-filter-busqueda"
                        type="text"
                        placeholder="Nombre, comercio, teléfono..."
                        value={filters.busqueda || ''}
                        onChange={e => updateFilter('busqueda', e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '34px' }}
                    />
                </div>

                {/* Cantidad de llamadas */}
                <div>
                    <select
                        id="llamadas-filter-cantidad"
                        value={filters.cantidad_llamadas || ''}
                        onChange={e => updateFilter('cantidad_llamadas', e.target.value)}
                        style={inputStyle}
                    >
                        {CANTIDADES_LLAMADAS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Fecha de última modificación */}
                <div>
                    <select
                        id="llamadas-filter-fecha-mod"
                        value={filters.fecha_modificacion || ''}
                        onChange={e => updateFilter('fecha_modificacion', e.target.value)}
                        style={inputStyle}
                    >
                        {FECHAS_MODIFICACION.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>

                {/* Operador */}
                <div>
                    <select
                        id="llamadas-filter-operador"
                        value={filters.operador || ''}
                        onChange={e => updateFilter('operador', e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">Todos los operadores</option>
                        {usuarios.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Selector de Rango Personalizado si está activo */}
            {filters.fecha_modificacion === 'custom' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Calendar size={14} style={{ color: 'var(--accent)' }} /> Rango de Modificación:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desde:</span>
                        <input
                            type="date"
                            value={filters.fecha_desde || ''}
                            onChange={e => updateFilter('fecha_desde', e.target.value)}
                            style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '0.82rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hasta:</span>
                        <input
                            type="date"
                            value={filters.fecha_hasta || ''}
                            onChange={e => updateFilter('fecha_hasta', e.target.value)}
                            style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '0.82rem' }}
                        />
                    </div>
                </div>
            )}

            {/* Fila 2: Etiqueta, Respuesta, Origen, Rubro, Conversión */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {/* Etiqueta */}
                <div>
                    <select
                        id="llamadas-filter-etiqueta"
                        value={filters.etiqueta || ''}
                        onChange={e => updateFilter('etiqueta', e.target.value)}
                        style={inputStyle}
                    >
                        {ETIQUETAS.map(e => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                    </select>
                </div>

                {/* Respuesta */}
                <div>
                    <select
                        id="llamadas-filter-respuesta"
                        value={filters.respuesta || ''}
                        onChange={e => updateFilter('respuesta', e.target.value)}
                        style={inputStyle}
                    >
                        {RESPUESTAS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                </div>

                {/* Origen de Contacto */}
                <div>
                    <select
                        id="llamadas-filter-origen"
                        value={filters.origen_contacto || ''}
                        onChange={e => updateFilter('origen_contacto', e.target.value)}
                        style={inputStyle}
                    >
                        {ORIGENES_CONTACTO.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Rubro */}
                <div>
                    <select
                        id="llamadas-filter-rubro"
                        value={filters.rubro || ''}
                        onChange={e => updateFilter('rubro', e.target.value)}
                        style={inputStyle}
                    >
                        {RUBROS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                </div>

                {/* Estado de Conversión */}
                <div>
                    <select
                        id="llamadas-filter-conversion"
                        value={filters.estado_conversion || ''}
                        onChange={e => updateFilter('estado_conversion', e.target.value)}
                        style={inputStyle}
                    >
                        {ESTADOS_CONVERSION.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
