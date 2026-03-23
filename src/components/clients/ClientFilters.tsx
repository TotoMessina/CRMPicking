import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, Phone, MapPin, Store, Activity as ActivityIcon, User, Tag, Building, Clock, Calendar, ChevronDown, X, Check } from 'lucide-react';
import { ClientFilters as ClientFiltersType } from '../../hooks/useClientsLogic';

interface Props {
    filters: ClientFiltersType;
    updateFilter: (name: keyof ClientFiltersType, value: any) => void;
    rubrosValidos: string[];
    responsablesValidos: string[];
}

const MultiSelectFilter: React.FC<{
    label: string;
    icon: React.ReactNode;
    selected: string[];
    options: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
}> = ({ label, icon, selected, options, onChange, placeholder = "Todos" }) => {
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
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                {icon} {label}
            </div>
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
                    transition: 'all 0.2s ease',
                    width: '100%'
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, maxWidth: 'calc(100% - 24px)' }}>
                    {selected.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{placeholder}</span>
                    ) : (
                        selected.slice(0, 1).map(val => (
                            <span key={val} style={{ 
                                background: 'var(--accent)', 
                                color: '#fff', 
                                padding: '2px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {val}
                                <X size={12} onClick={(e) => { e.stopPropagation(); toggleOption(val); }} style={{ cursor: 'pointer', flexShrink: 0 }} />
                            </span>
                        ))
                    )}
                    {selected.length > 1 && (
                        <span style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700 }}>+{selected.length - 1}</span>
                    )}
                </div>
                <ChevronDown size={16} style={{ 
                    color: 'var(--text-muted)', 
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0
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
                    zIndex: 1000,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    animation: 'page-enter 0.2s ease-out forwards',
                    minWidth: '220px'
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            autoFocus
                            placeholder={`Buscar ${label.toLowerCase()}...`}
                            value={searchTerm}
                            onClick={(e) => e.stopPropagation()}
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

                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '4px' }}>
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
                                        onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}
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
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                                style={{ 
                                    background: 'transparent', 
                                    color: 'var(--text-muted)', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600,
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                }}
                            >
                                Limpiar
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
            overflow: 'visible'
        }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', opacity: 0.5 }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem' }}>
                <Filter size={18} style={{ color: 'var(--accent)' }} /> Filtros de Búsqueda
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <Search size={14} /> Nombre / Local
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Buscar..." value={filters.nombre} onChange={e => updateFilter('nombre', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <Phone size={14} /> Teléfono
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Teléfono..." value={filters.telefono} onChange={e => updateFilter('telefono', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <MapPin size={14} /> Dirección
                    </div>
                    <div style={{ position: 'relative' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Dirección..." value={filters.direccion} onChange={e => updateFilter('direccion', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                </div>

                <MultiSelectFilter 
                    label="Rubros" 
                    icon={<Store size={14} />} 
                    selected={filters.rubro} 
                    options={rubrosValidos} 
                    onChange={(next) => updateFilter('rubro', next)} 
                    placeholder="Cualquier rubro"
                />

                <MultiSelectFilter 
                    label="Estados" 
                    icon={<ActivityIcon size={14} />} 
                    selected={filters.estado} 
                    options={[
                        "1 - Cliente relevado",
                        "2 - Local Visitado No Activo",
                        "3 - Primer ingreso",
                        "4 - Local Creado",
                        "5 - Local Visitado Activo",
                        "6 - Local No Interesado"
                    ]} 
                    onChange={(next) => updateFilter('estado', next)} 
                    placeholder="Todos los estados"
                />

                <MultiSelectFilter 
                    label="Situaciones" 
                    icon={<ActivityIcon size={14} />} 
                    selected={filters.situacion} 
                    options={[
                        "sin comunicacion nueva",
                        "en proceso",
                        "en funcionamiento"
                    ]} 
                    onChange={(next) => updateFilter('situacion', next)} 
                    placeholder="Todas las situaciones"
                />

                <MultiSelectFilter 
                    label="Tipos de Contacto" 
                    icon={<Phone size={14} />} 
                    selected={filters.tipoContacto} 
                    options={["Visita Presencial", "Llamada"]} 
                    onChange={(next) => updateFilter('tipoContacto', next)} 
                    placeholder="Todos los tipos"
                />

                <MultiSelectFilter 
                    label="Responsables" 
                    icon={<User size={14} />} 
                    selected={filters.responsable} 
                    options={responsablesValidos} 
                    onChange={(next) => updateFilter('responsable', next)} 
                    placeholder="Todos"
                />

                <MultiSelectFilter 
                    label="Interés" 
                    icon={<Tag size={14} />} 
                    selected={filters.interes} 
                    options={["Bajo", "Medio", "Alto"]} 
                    onChange={(next) => updateFilter('interes', next)} 
                    placeholder="Cualquier interés"
                />

                <MultiSelectFilter 
                    label="Estilos de Contacto" 
                    icon={<Building size={14} />} 
                    selected={filters.estilo} 
                    options={["Dueño", "Empleado", "Cerrado"]} 
                    onChange={(next) => updateFilter('estilo', next)} 
                    placeholder="Cualquier estilo"
                />

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <Calendar size={14} /> Fecha Alta (Desde)
                    </div>
                    <input type="date" className="input" value={filters.creadoDesde} onChange={e => updateFilter('creadoDesde', e.target.value)} style={{ width: '100%', borderRadius: '12px' }} />
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <Calendar size={14} /> Fecha Alta (Hasta)
                    </div>
                    <input type="date" className="input" value={filters.creadoHasta} onChange={e => updateFilter('creadoHasta', e.target.value)} style={{ width: '100%', borderRadius: '12px' }} />
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <Calendar size={14} /> Agenda (Desde)
                    </div>
                    <input type="date" className="input" value={filters.contactoDesde} onChange={e => { updateFilter('contactoDesde', e.target.value); updateFilter('proximos7', false); updateFilter('vencidos', false); }} style={{ width: '100%', borderRadius: '12px', borderColor: filters.contactoDesde ? 'var(--accent)' : 'var(--border)' }} />
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        <Calendar size={14} /> Agenda (Hasta)
                    </div>
                    <input type="date" className="input" value={filters.contactoHasta} onChange={e => { updateFilter('contactoHasta', e.target.value); updateFilter('proximos7', false); updateFilter('vencidos', false); }} style={{ width: '100%', borderRadius: '12px', borderColor: filters.contactoHasta ? 'var(--accent)' : 'var(--border)' }} />
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
                            height: '44px', borderRadius: '12px', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.85rem',
                            background: filters.vencidos ? '#ef4444' : 'var(--bg-elevated)',
                            color: filters.vencidos ? '#fff' : 'var(--text-muted)',
                            border: filters.vencidos ? '1px solid #ef4444' : '1px solid var(--border)',
                            boxShadow: filters.vencidos ? '0 4px 14px -4px rgba(239,68,68,0.5)' : 'none',
                            transition: 'all 0.2s ease',
                            justifyContent: 'center'
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
                            height: '44px', borderRadius: '12px', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.85rem',
                            background: filters.proximos7 ? 'var(--accent)' : 'var(--bg-elevated)',
                            color: filters.proximos7 ? '#fff' : 'var(--text-muted)',
                            border: filters.proximos7 ? '1px solid var(--accent)' : '1px solid var(--border)',
                            boxShadow: filters.proximos7 ? '0 4px 14px -4px rgba(37,99,235,0.5)' : 'none',
                            transition: 'all 0.2s ease',
                            justifyContent: 'center'
                        }}
                    >
                        <Calendar size={16} />
                        Próximos 7{filters.proximos7 ? ' ✓' : ''}
                    </button>
                </div>
            </div>
        </section>
    );
};
