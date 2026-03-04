import { Building2 } from 'lucide-react';

export function EmpresaSelector({ empresas, onSelect }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'var(--bg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, gap: '24px', padding: '24px'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'var(--accent)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <Building2 size={28} color="#fff" />
                </div>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 800 }}>
                    Seleccioná una empresa
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Pertenecés a varias empresas. ¿Con cuál vas a trabajar hoy?
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px',
                width: '100%',
                maxWidth: '700px'
            }}>
                {empresas.map(emp => (
                    <button
                        key={emp.id}
                        onClick={() => onSelect(emp)}
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '2px solid var(--border)',
                            borderRadius: '16px',
                            padding: '28px 20px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {emp.logo_url ? (
                            <img
                                src={emp.logo_url}
                                alt={emp.nombre}
                                style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '10px',
                                background: 'var(--accent)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Building2 size={24} color="#fff" />
                            </div>
                        )}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
                                {emp.nombre}
                            </div>
                            {emp.role_en_empresa && (
                                <div style={{
                                    fontSize: '0.75rem', color: 'var(--text-muted)',
                                    marginTop: '4px', textTransform: 'capitalize'
                                }}>
                                    {emp.role_en_empresa}
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
