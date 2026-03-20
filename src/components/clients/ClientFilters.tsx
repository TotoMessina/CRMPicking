import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, Phone, MapPin, Store, Activity as ActivityIcon, User, Tag, Building, Clock, Calendar, ChevronDown, X, Check } from 'lucide-react';
import { ClientFilters as ClientFiltersType } from '../../hooks/useClientsLogic';

interface Props {
    filters: ClientFiltersType;
    updateFilter: (name: keyof ClientFiltersType, value: any) => void;
    rubrosValidos: string[];
    responsablesValidos: string[];
}

const ResponsableMultiSelect: React.FC<{
    selected: string[];
    options: string[];
    onChange: (next: string[]) => void;
}> = ({ selected, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (opt: string) => {
        const isSelected = selected.includes(opt);
        if (isSelected) {
            onChange(selected.filter(i => i !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {/* Trigger Container */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="input"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '44px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-input)',
                    gap: '8px',
                    flexWrap: 'wrap',
                    border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
                    boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                    {selected.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Todos</span>
                    ) : (
                        selected.slice(0, 2).map(val => (
                            <span key={val} style={{ 
                                background: 'var(--accent)', 
                                color: '#fff', 
                                padding: '2px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {val}
                                <X size={12} onClick={(e) => { e.stopPropagation(); toggleOption(val); }} style={{ cursor: 'pointer' }} />
                            </span>
                        ))
                    )}
                    {selected.length > 2 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>+{selected.length - 2}</span>
                    )}
                </div>
                <ChevronDown size={16} style={{ 
                    color: 'var(--text-muted)', 
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease'
                }} />
            </div>

            {/* Dropdown Popover */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    animation: 'page-enter 0.2s ease-out forwards'
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            autoFocus
                            placeholder="Buscar responsable..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '8px 10px 8px 32px', 
                                fontSize: '0.85rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-input)'
                            }}
                        />
                    </div>

                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No se encontraron resultados
                            </div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = selected.includes(opt);
                                return (
                                    <div 
                                        key={opt}
                                        onClick={() => toggleOption(opt)}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                            transition: 'all 0.1s ease',
                                            fontSize: '0.85rem'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = isSelected ? 'var(--accent-soft)' : 'var(--bg-active)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? 'var(--accent-soft)' : 'transparent')}
                                    >
                                        <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>{opt}</span>
                                        {isSelected && <Check size={14} style={{ color: 'var(--accent)' }} />}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {selected.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => onChange([])}
                                style={{ 
                                    background: 'transparent', 
                                    color: 'var(--danger)', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600,
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                }}
                            >
                                Limpiar selección
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ClientFilters: React.FC<Props> = ({ filters, updateFilter, rubrosValidos, responsablesValidos }) => {
    return (
        <section style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '24px',
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', opacity: 0.5 }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem' }}>
                <Filter size={18} style={{ color: 'var(--accent)' }} /> Filtros de Búsqueda
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" placeholder="Nombre o local..." value={filters.nombre} onChange={e => updateFilter('nombre', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                </div>
                <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" placeholder="Teléfono..." value={filters.telefono} onChange={e => updateFilter('telefono', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                </div>
                <div style={{ position: 'relative' }}>
                    <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" placeholder="Dirección..." value={filters.direccion} onChange={e => updateFilter('direccion', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                </div>

                <div style={{ position: 'relative' }}>
                    <Store size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="input" value={filters.rubro} onChange={e => updateFilter('rubro', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                        <option value="">Cualquier rubro</option>
                        {rubrosValidos.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div style={{ position: 'relative' }}>
                    <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="input" value={filters.estado} onChange={e => updateFilter('estado', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                        <option value="Todos">Todos los estados</option>
                        <option value="1 - Cliente relevado">1 - Cliente relevado</option>
                        <option value="2 - Local Visitado No Activo">2 - Local Visitado No Activo</option>
                        <option value="3 - Primer ingreso">3 - Primer Ingreso</option>
                        <option value="4 - Local Creado">4 - Local Creado</option>
                        <option value="5 - Local Visitado Activo">5 - Local Visitado Activo</option>
                        <option value="6 - Local No Interesado">6 - Local No Interesado</option>
                    </select>
                </div>

                <div style={{ position: 'relative' }}>
                    <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="input" value={filters.situacion} onChange={e => updateFilter('situacion', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                        <option value="Todos">Todas las situaciones</option>
                        <option value="sin comunicacion nueva">Sin comunicación nueva</option>
                        <option value="en proceso">En proceso</option>
                        <option value="en funcionamiento">En funcionamiento</option>
                    </select>
                </div>

                <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="input" value={filters.tipoContacto} onChange={e => updateFilter('tipoContacto', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                        <option value="Todos">Todos los tipos de contacto</option>
                        <option value="Visita Presencial">Visita Presencial</option>
                        <option value="Llamada">Llamada</option>
                    </select>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <User size={14} /> Responsables
                    </div>
                    <ResponsableMultiSelect 
                        selected={filters.responsable} 
                        options={responsablesValidos} 
                        onChange={(next) => updateFilter('responsable', next)} 
                    />
                </div>

                <div style={{ position: 'relative' }}>
                    <Tag size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="input" value={filters.interes} onChange={e => updateFilter('interes', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                        <option value="">Cualquier interés</option>
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                    </select>
                </div>

                <div style={{ position: 'relative' }}>
                    <Building size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="input" value={filters.estilo} onChange={e => updateFilter('estilo', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                        <option value="">Cualquier estilo</option>
                        <option value="Dueño">Dueño</option>
                        <option value="Empleado">Empleado</option>
                        <option value="Cerrado">Cerrado</option>
                    </select>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>Creado Desde:</label>
                    <input type="date" className="input" value={filters.creadoDesde} onChange={e => updateFilter('creadoDesde', e.target.value)} style={{ width: '100%', borderRadius: '12px' }} />
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>Creado Hasta:</label>
                    <input type="date" className="input" value={filters.creadoHasta} onChange={e => updateFilter('creadoHasta', e.target.value)} style={{ width: '100%', borderRadius: '12px' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '2px' }}>
                    <button
                        onClick={() => {
                            const newVal = !filters.vencidos;
                            updateFilter('vencidos', newVal);
                            if (newVal) updateFilter('proximos7', false);
                        }}
                        style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.85rem',
                            background: filters.vencidos ? '#ef4444' : 'var(--bg-elevated)',
                            color: filters.vencidos ? '#fff' : 'var(--text-muted)',
                            border: filters.vencidos ? '1px solid #ef4444' : '1px solid var(--border)',
                            boxShadow: filters.vencidos ? '0 4px 14px -4px rgba(239,68,68,0.5)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Clock size={16} />
                        Vencidos{filters.vencidos ? ' ✓' : ''}
                    </button>
                    <button
                        onClick={() => {
                            const newVal = !filters.proximos7;
                            updateFilter('proximos7', newVal);
                            if (newVal) updateFilter('vencidos', false);
                        }}
                        style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.85rem',
                            background: filters.proximos7 ? 'var(--accent)' : 'var(--bg-elevated)',
                            color: filters.proximos7 ? '#fff' : 'var(--text-muted)',
                            border: filters.proximos7 ? '1px solid var(--accent)' : '1px solid var(--border)',
                            boxShadow: filters.proximos7 ? '0 4px 14px -4px rgba(37,99,235,0.5)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Calendar size={16} />
                        Próximos 7 días{filters.proximos7 ? ' ✓' : ''}
                    </button>
                </div>
            </div>
        </section>
    );
};
