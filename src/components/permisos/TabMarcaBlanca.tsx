import type { BrandingConfig } from '../../types/permisos';

interface TabMarcaBlancaProps {
    branding: BrandingConfig;
    updateBranding: <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => void;
    setDirty: (v: boolean) => void;
}

const COLOR_PRESETS = [
    { name: 'PickingUp Violeta', color: '#7c3aded' },
    { name: 'Azul Eléctrico',   color: '#3b82f6' },
    { name: 'Esmeralda Natural', color: '#10b981' },
    { name: 'Oro Oscuro',        color: '#d97706' },
    { name: 'Rojo Carmesí',      color: '#ef4444' },
    { name: 'Gris Grafito',      color: '#4b5563' },
];

function ColorRow({ label, value, onChange, onReset }: { label: string; value: string; onChange: (v: string) => void; onReset: () => void; }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="color" style={{ width: '46px', height: '36px', border: 'none', borderRadius: '6px', padding: 0, cursor: 'pointer', background: 'transparent' }}
                    value={value || '#f8fafc'} onChange={e => onChange(e.target.value)} />
                <input type="text" placeholder="Por defecto" className="input premium-input"
                    style={{ flex: 1, height: '36px', fontSize: '0.82rem', textTransform: 'uppercase', textAlign: 'center' }}
                    value={value} onChange={e => onChange(e.target.value)} />
                {value && <button type="button" onClick={onReset} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Reset</button>}
            </div>
        </div>
    );
}

export function TabMarcaBlanca({ branding, updateBranding, setDirty }: TabMarcaBlancaProps) {
    const mark = <K extends keyof BrandingConfig>(key: K) => (value: BrandingConfig[K]) => { updateBranding(key, value); setDirty(true); };

    return (
        <div className="personalizacion-management" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>🎨 Personalización Visual y Marca Blanca</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem', marginBottom: '24px' }}>
                    Configurá los colores corporativos, logos e identidad de tu empresa para white-labelizar todo el CRM.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Color de Acento */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Color de Acento Corporativo</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <input type="color" style={{ width: '60px', height: '42px', border: 'none', borderRadius: '8px', padding: 0, cursor: 'pointer', background: 'transparent' }}
                                value={branding.brandColor} onChange={e => { updateBranding('brandColor', e.target.value); setDirty(true); }} />
                            <input type="text" className="input premium-input" style={{ width: '120px', height: '42px', textTransform: 'uppercase', textAlign: 'center' }}
                                value={branding.brandColor} onChange={e => { updateBranding('brandColor', e.target.value); setDirty(true); }} />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Paletas Recomendadas:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {COLOR_PRESETS.map(preset => (
                                    <button key={preset.color} type="button" onClick={() => { updateBranding('brandColor', preset.color); setDirty(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--bg)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: preset.color, display: 'inline-block' }}></span>
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                    {/* Logo URL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>URL del Logo de la Empresa</label>
                        <input type="text" placeholder="https://ejemplo.com/mi-logo.png" className="input premium-input" style={{ height: '42px' }}
                            value={branding.logoUrl} onChange={e => { updateBranding('logoUrl', e.target.value); setDirty(true); }} />
                        <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>Ingresá una URL de imagen con fondo transparente.</p>
                        {branding.logoUrl && (
                            <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '12px', maxWidth: '300px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Previsualización:</span>
                                <img src={branding.logoUrl} alt="Logo" style={{ maxHeight: '36px', maxWidth: '140px', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                        )}
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                    {/* Nombre Comercial */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Nombre Personalizado del CRM</label>
                        <input type="text" placeholder="PickingUp CRM" className="input premium-input" style={{ height: '42px', maxWidth: '350px' }}
                            value={branding.systemName} onChange={e => { updateBranding('systemName', e.target.value); setDirty(true); }} />
                        <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>Personaliza el nombre de la plataforma en la barra lateral.</p>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                    {/* Paleta de Colores */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>🎨 Paleta de Colores de Interfaz</h4>
                        <p className="muted" style={{ margin: 0, fontSize: '0.78rem', marginBottom: '8px' }}>
                            Personalizá los colores de fondo, paneles, textos y bordes (dejá en blanco para usar el tema del sistema).
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                            <ColorRow label="Fondo General (Background)" value={branding.bgColor} onChange={mark('bgColor')} onReset={() => mark('bgColor')('')} />
                            <ColorRow label="Fondo de Paneles/Tarjetas (Elevated)" value={branding.bgElevatedColor} onChange={mark('bgElevatedColor')} onReset={() => mark('bgElevatedColor')('')} />
                            <ColorRow label="Texto Principal" value={branding.textColor} onChange={mark('textColor')} onReset={() => mark('textColor')('')} />
                            <ColorRow label="Texto Secundario (Muted)" value={branding.textMutedColor} onChange={mark('textMutedColor')} onReset={() => mark('textMutedColor')('')} />
                            <ColorRow label="Color de Bordes (Borders)" value={branding.borderColor} onChange={mark('borderColor')} onReset={() => mark('borderColor')('')} />
                        </div>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                    {/* Tipografía, Bordes y Sombras */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>📐 Tipografía, Bordes y Sombras</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tipografía (Google Fonts)</label>
                                <select className="input premium-input" style={{ height: '36px', fontSize: '0.85rem', padding: '0 12px', width: '100%', cursor: 'pointer' }}
                                    value={branding.fontFamily} onChange={e => { updateBranding('fontFamily', e.target.value); setDirty(true); }}>
                                    <option value="Outfit">Outfit (Predeterminada)</option>
                                    <option value="Inter">Inter (Limpia &amp; Tech)</option>
                                    <option value="Roboto">Roboto (Clásica)</option>
                                    <option value="Poppins">Poppins (Moderna &amp; Amigable)</option>
                                    <option value="Montserrat">Montserrat (Elegante)</option>
                                    <option value="Playfair Display">Playfair Display (Premium/Socio)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Redondeado de Bordes</label>
                                <select className="input premium-input" style={{ height: '36px', fontSize: '0.85rem', padding: '0 12px', width: '100%', cursor: 'pointer' }}
                                    value={branding.borderRadius} onChange={e => { updateBranding('borderRadius', e.target.value); setDirty(true); }}>
                                    <option value="0px">Cuadrado (0px)</option>
                                    <option value="6px">Sutil (6px)</option>
                                    <option value="12px">Estándar (12px)</option>
                                    <option value="16px">Moderno / Redondeado (16px)</option>
                                    <option value="24px">Muy Redondeado (24px)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Estilo de Sombras</label>
                                <select className="input premium-input" style={{ height: '36px', fontSize: '0.85rem', padding: '0 12px', width: '100%', cursor: 'pointer' }}
                                    value={branding.shadowStyle} onChange={e => { updateBranding('shadowStyle', e.target.value as any); setDirty(true); }}>
                                    <option value="flat">Plano (Sin Sombras)</option>
                                    <option value="soft">Sutil / Soft (Predeterminado)</option>
                                    <option value="elevated">Elevado / 3D (Sombras marcadas)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
