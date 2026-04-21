import React from 'react';
import { AlertCircle, MapPin, Phone, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IntegrityAuditCardsProps {
    integrityData: {
        missing_coords: number;
        missing_contact: number;
        missing_rubro: number;
    } | null;
}

const IntegrityAuditCards: React.FC<IntegrityAuditCardsProps> = ({ integrityData }) => {
    const navigate = useNavigate();

    if (!integrityData) return null;

    const cards = [
        {
            title: 'Sin Geocoordenadas',
            count: integrityData.missing_coords,
            icon: <MapPin color="#f97316" />,
            description: 'Locales que no aparecerán en el mapa.',
            background: 'rgba(249, 115, 22, 0.1)',
            borderColor: 'rgba(249, 115, 22, 0.2)',
            filterKey: 'fMissingCoords'
        },
        {
            title: 'Sin Contacto',
            count: integrityData.missing_contact,
            icon: <Phone color="#ef4444" />,
            description: 'Sin teléfono ni correo electrónico.',
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
            filterKey: 'fMissingContact'
        },
        {
            title: 'Sin Rubro Definido',
            count: integrityData.missing_rubro,
            icon: <Hash color="#3b82f6" />,
            description: 'Categorización incompleta.',
            background: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.2)',
            filterKey: 'fMissingRubro'
        }
    ];

    const handleCardClick = (filterKey: string, count: number) => {
        if (count === 0) return;
        navigate('/clientes', { state: { [filterKey]: true } });
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {cards.map((card, i) => (
                <div 
                    key={i} 
                    onClick={() => handleCardClick(card.filterKey, card.count)}
                    style={{ 
                        padding: '16px', 
                        borderRadius: '12px', 
                        border: `1px solid ${card.borderColor}`, 
                        background: card.background, 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '16px',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: card.count > 0 ? 'pointer' : 'default',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={(e) => {
                        if (card.count > 0) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (card.count > 0) {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                        }
                    }}
                >
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        {card.icon}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
                                {card.count}
                            </span>
                            <AlertCircle size={14} color={card.count > 0 ? '#94a3b8' : '#cbd5e1'} />
                        </div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: '4px 0 0 0' }}>{card.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{card.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default IntegrityAuditCards;
