import React from 'react';
import { Filter, Search, Phone, MapPin, Store, Activity as ActivityIcon, User, Tag, Building, Clock, Calendar } from 'lucide-react';
import { ClientFilters as ClientFiltersType } from '../../hooks/useClientsLogic';

interface Props {
    filters: ClientFiltersType;
    updateFilter: (name: keyof ClientFiltersType, value: any) => void;
    rubrosValidos: string[];
}

export const ClientFilters: React.FC<Props> = ({ filters, updateFilter, rubrosValidos }) => {
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

                <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <select className="input" value={filters.responsable} onChange={e => updateFilter('responsable', e.target.value)} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                        <option value="">Cualquier responsable</option>
                        <option value="Toto">Toto</option>
                        <option value="Ruben">Ruben</option>
                        <option value="Tincho(B)">Tincho(B)</option>
                        <option value="Fran">Fran</option>
                        <option value="Ari">Ari</option>
                        <option value="Nati">Nati</option>
                        <option value="Dani">Dani</option>
                        <option value="Otro">Otro</option>
                    </select>
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
