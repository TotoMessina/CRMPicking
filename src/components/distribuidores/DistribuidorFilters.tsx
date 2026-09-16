import React from 'react';
import { Search, Filter, X, Building2, User, MapPin } from 'lucide-react';
import { DistribuidorFiltersState } from '../../types/distribuidor';

interface DistribuidorFiltersProps {
    filters: DistribuidorFiltersState;
    setFilters: React.Dispatch<React.SetStateAction<DistribuidorFiltersState>>;
    ejecutivosDisponibles: string[];
    zonasDisponibles: string[];
    onReset: () => void;
}

export const DistribuidorFilters: React.FC<DistribuidorFiltersProps> = ({
    filters,
    setFilters,
    ejecutivosDisponibles,
    zonasDisponibles,
    onReset
}) => {
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const hasActiveFilters = Boolean(
        filters.search || 
        filters.estado !== 'Todos' || 
        filters.ejecutivo !== 'Todos' || 
        filters.zona !== 'Todos'
    );

    return (
        <div 
            className="filter-bar" 
            style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border)', 
                borderRadius: '16px', 
                padding: '16px 20px', 
                marginBottom: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '14px',
                boxShadow: 'var(--shadow-sm)'
            }}
        >
            {/* Buscador de texto reactivo */}
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
                <Search 
                    size={18} 
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
                />
                <input
                    type="text"
                    value={filters.search}
                    onChange={handleSearchChange}
                    placeholder="Buscar por nombre, categorías, zona, ERP..."
                    className="input"
                    style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px', height: '42px', fontSize: '0.9rem' }}
                />
                {filters.search && (
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Filtro por Estado */}
            <div style={{ minWidth: '150px' }}>
                <select
                    name="estado"
                    value={filters.estado}
                    onChange={handleSelectChange}
                    className="input"
                    style={{ width: '100%', height: '42px', borderRadius: '12px', fontSize: '0.88rem' }}
                >
                    <option value="Todos">Todos los Estados</option>
                    <option value="Activo">Activo</option>
                    <option value="Prospecto">Prospecto</option>
                    <option value="En negociación">En negociación</option>
                    <option value="Inactivo">Inactivo</option>
                </select>
            </div>

            {/* Filtro por Ejecutivo */}
            <div style={{ minWidth: '170px' }}>
                <select
                    name="ejecutivo"
                    value={filters.ejecutivo}
                    onChange={handleSelectChange}
                    className="input"
                    style={{ width: '100%', height: '42px', borderRadius: '12px', fontSize: '0.88rem' }}
                >
                    <option value="Todos">Todos los Ejecutivos</option>
                    {ejecutivosDisponibles.map(ej => (
                        <option key={ej} value={ej}>{ej}</option>
                    ))}
                </select>
            </div>

            {/* Filtro por Zona */}
            <div style={{ minWidth: '160px' }}>
                <select
                    name="zona"
                    value={filters.zona}
                    onChange={handleSelectChange}
                    className="input"
                    style={{ width: '100%', height: '42px', borderRadius: '12px', fontSize: '0.88rem' }}
                >
                    <option value="Todos">Todas las Zonas</option>
                    {zonasDisponibles.map(z => (
                        <option key={z} value={z}>{z}</option>
                    ))}
                </select>
            </div>

            {/* Botón Reset */}
            {hasActiveFilters && (
                <button
                    onClick={onReset}
                    className="btn btn-secondary"
                    style={{ 
                        height: '42px', 
                        padding: '0 14px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        fontSize: '0.85rem'
                    }}
                >
                    <X size={15} />
                    <span>Limpiar filtros</span>
                </button>
            )}
        </div>
    );
};
