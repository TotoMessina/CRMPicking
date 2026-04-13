import React, { useState } from 'react';
import { Filter, Search, Activity as ActivityIcon, User, ChevronDown } from 'lucide-react';

export const RepartidorFilters = ({
    fSearch, setFSearch,
    fEstado, setFEstado,
    fResponsable, setFResponsable,
    setPage
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const activeCount = [
        fEstado !== 'Todos' ? fEstado : '', 
        fResponsable
    ].filter(Boolean).length;

    const handleSearchChange = (val) => {
        setFSearch(val);
        setPage(1);
    };

    return (
        <section style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.05)',
            position: 'relative',
        }}>
            {/* Minimal Header / Main Search */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        className="input" 
                        placeholder="Buscar por Nombre, Tel, Localidad..." 
                        value={fSearch} 
                        onChange={e => handleSearchChange(e.target.value)} 
                        style={{ 
                            width: '100%', 
                            padding: '12px 16px 12px 42px', 
                            borderRadius: '16px', 
                            fontSize: '1rem', 
                            background: 'var(--bg-card)', 
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s ease',
                        }} 
                    />
                </div>
                
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '16px',
                        background: activeCount > 0 ? 'var(--accent)' : 'var(--bg-card)',
                        border: activeCount > 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                        color: activeCount > 0 ? '#fff' : 'var(--text)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <Filter size={18} />
                    Filtros Avanzados
                    {activeCount > 0 && (
                        <span style={{ 
                            background: 'rgba(255,255,255,0.25)', 
                            color: '#fff', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.8rem', 
                            marginLeft: '4px' 
                        }}>
                            {activeCount}
                        </span>
                    )}
                    <ChevronDown size={18} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                </button>
            </div>

            {/* Collapsible Advanced Filters */}
            {isExpanded && (
                <div style={{ 
                    marginTop: '20px', 
                    paddingTop: '20px', 
                    borderTop: '1px dashed var(--border)', 
                    animation: 'page-enter 0.3s ease-out forwards' 
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                                <ActivityIcon size={14} /> Estado
                            </div>
                            <div style={{ position: 'relative' }}>
                                <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <select className="input" value={fEstado} onChange={e => { setFEstado(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                                    <option value="Todos">Todos los estados</option>
                                    <option value="Documentación sin gestionar">Documentación sin gestionar</option>
                                    <option value="Cuenta aun no confirmada">Cuenta aun no confirmada</option>
                                    <option value="Cuenta confirmada y repartiendo">Cuenta confirmada y repartiendo</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                                <User size={14} /> Responsable
                            </div>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <select className="input" value={fResponsable} onChange={e => { setFResponsable(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
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
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
