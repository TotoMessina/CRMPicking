import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, Phone, MapPin, Store, Activity as ActivityIcon, User, Tag, Building, Clock, Calendar, Users, ChevronDown, Check } from 'lucide-react';
import { ClientFilters as ClientFiltersType } from '../../hooks/useClientsLogic';

interface Props {
    filters: ClientFiltersType;
    updateFilter: (name: keyof ClientFiltersType, value: any) => void;
    rubrosValidos: string[];
    activators?: { email: string, nombre: string }[];
}

export const ClientFilters: React.FC<Props> = ({ filters, updateFilter, rubrosValidos, activators = [] }) => {
    const [openResponsables, setOpenResponsables] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenResponsables(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
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

                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button 
                        className="input" 
                        style={{ 
                            width: '100%', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: filters.responsable.length > 0 ? 'var(--accent-soft, rgba(99, 102, 241, 0.1))' : 'var(--bg)',
                            borderColor: filters.responsable.length > 0 ? 'var(--accent, #6366f1)' : 'var(--border)',
                            color: filters.responsable.length > 0 ? 'var(--accent, #6366f1)' : 'var(--text)',
                            transition: 'all 0.2s ease',
                            padding: '8px 12px 8px 36px',
                            minHeight: '40px',
                            borderRadius: '12px'
                        }} 
                        onClick={() => setOpenResponsables(!openResponsables)}
                    >
                        <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: filters.responsable.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.95rem', fontWeight: filters.responsable.length > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {filters.responsable.length === 0 
                                ? 'Cualquier responsable' 
                                : filters.responsable.length === 1 
                                    ? filters.responsable[0] 
                                    : `${filters.responsable.length} seleccionados`}
                        </span>
                        <ChevronDown size={14} style={{ opacity: 0.7, transform: openResponsables ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>
                    {openResponsables && (
                        <div style={{ 
                            position: 'absolute', top: '100%', left: 0, marginTop: '8px', 
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
                            borderRadius: '12px', padding: '8px', zIndex: 50, minWidth: '100%', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxHeight: '320px', 
                            overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px'
                        }}>
                            <div 
                                onClick={() => { updateFilter('responsable', []); setOpenResponsables(false); }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', 
                                    background: filters.responsable.length === 0 ? 'var(--accent-soft, rgba(99, 102, 241, 0.15))' : 'transparent',
                                    color: filters.responsable.length === 0 ? 'var(--accent, #6366f1)' : 'var(--text)',
                                    fontWeight: filters.responsable.length === 0 ? 700 : 500,
                                    borderBottom: '1px solid var(--border)', marginBottom: '4px',
                                    transition: 'background 0.15s ease'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Cualquier responsable
                                </span>
                                {filters.responsable.length === 0 && <Check size={16} />}
                            </div>

                            {activators.map(a => {
                                const isSelected = filters.responsable.includes(a.nombre);
                                return (
                                    <div 
                                        key={a.email} 
                                        onClick={() => {
                                            if (isSelected) {
                                                updateFilter('responsable', filters.responsable.filter(f => f !== a.nombre));
                                            } else {
                                                updateFilter('responsable', [...filters.responsable, a.nombre]);
                                            }
                                        }}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px', 
                                            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', 
                                            background: isSelected ? 'var(--accent-soft, rgba(99, 102, 241, 0.08))' : 'transparent',
                                            color: isSelected ? 'var(--accent, #6366f1)' : 'var(--text)',
                                            fontWeight: isSelected ? 600 : 500,
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.05))';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '4px',
                                            border: `2px solid ${isSelected ? 'var(--accent, #6366f1)' : 'var(--text-muted)'}`,
                                            background: isSelected ? 'var(--accent, #6366f1)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s ease', flexShrink: 0
                                        }}>
                                            {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                                        </div>
                                        <span>{a.nombre}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
