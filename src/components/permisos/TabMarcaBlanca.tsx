import { useState, useRef } from 'react';
import type { BrandingConfig } from '../../types/permisos';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Upload, Trash2, Loader2 } from 'lucide-react';

interface TabMarcaBlancaProps {
    branding: BrandingConfig;
    updateBranding: <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => void;
    setDirty: (v: boolean) => void;
    empresaId?: string;
}

const COLOR_PRESETS = [
    { name: 'InsideUp Violeta', color: '#7c3aed' },
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

export function TabMarcaBlanca({ branding, updateBranding, setDirty, empresaId }: TabMarcaBlancaProps) {
    const mark = <K extends keyof BrandingConfig>(key: K) => (value: BrandingConfig[K]) => { updateBranding(key, value); setDirty(true); };
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!empresaId) {
            toast.error('No se puede identificar la empresa activa.');
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('El archivo debe ser una imagen (PNG, JPG, SVG, etc)');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('La imagen no puede superar los 2MB');
            return;
        }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const filePath = `${empresaId}/logo_${Date.now()}.${ext}`;

            // 1. Subir al bucket 'logos'
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) {
                // Capturamos si el error es porque no existe el bucket y damos info
                if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
                    throw new Error('El contenedor de almacenamiento no existe. Por favor ejecuta el script SQL de creación del bucket.');
                }
                throw uploadError;
            }

            // 2. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            // 3. Cache-bust visual
            const finalUrl = `${publicUrl}?t=${Date.now()}`;
            updateBranding('logoUrl', finalUrl);
            setDirty(true);
            toast.success('¡Logo corporativo cargado!', { icon: '🖼️' });
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error('Error: ' + (err.message || 'Fallo al subir la imagen'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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

                    {/* Logo Component */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Logo de la Empresa</label>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
                            gap: '20px',
                            width: '100%' 
                        }}>
                            {/* Opción 1: Subir Archivo */}
                            <div style={{ 
                                border: '2px dashed var(--border)', 
                                borderRadius: '12px', 
                                padding: '24px 16px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'var(--bg)',
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                transition: 'border-color 0.2s',
                                textAlign: 'center'
                            }} 
                            className="logo-upload-zone"
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            onClick={() => !uploading && fileInputRef.current?.click()}>
                                <input 
                                    ref={fileInputRef} 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileUpload} 
                                    style={{ display: 'none' }} 
                                />
                                {uploading ? (
                                    <Loader2 size={26} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <Upload size={26} color="var(--text-muted)" />
                                )}
                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                    {uploading ? 'Subiendo Imagen...' : 'Subir Logo Corporativo'}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    PNG, JPG o WEBP (Transparente, Máx. 2MB)
                                </span>
                            </div>

                            {/* Opción 2: URL Manual */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>O pega una URL directa:</span>
                                <input 
                                    type="text" 
                                    placeholder="https://ejemplo.com/mi-logo.png" 
                                    className="input premium-input" 
                                    style={{ height: '42px' }}
                                    value={branding.logoUrl} 
                                    onChange={e => { updateBranding('logoUrl', e.target.value); setDirty(true); }} 
                                />
                                <p className="muted" style={{ margin: 0, fontSize: '0.7rem' }}>Usá preferentemente imágenes horizontales con fondo transparente.</p>
                            </div>
                        </div>
                        
                        {/* Previsualización Integrada */}
                        {branding.logoUrl && (
                            <div style={{ 
                                marginTop: '8px', 
                                padding: '12px', 
                                background: 'var(--bg)', 
                                borderRadius: '12px', 
                                border: '1px solid var(--border)', 
                                display: 'inline-flex', 
                                flexDirection: 'column', 
                                gap: '8px',
                                minWidth: '220px',
                                alignSelf: 'flex-start'
                            }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Vista Previa (Fondo Sidebar):</span>
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50px', position: 'relative' }}>
                                    <img src={branding.logoUrl} alt="Preview" style={{ maxHeight: '32px', maxWidth: '160px', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { updateBranding('logoUrl', ''); setDirty(true); }}
                                    style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '6px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: '8px', width: '100%' }}
                                >
                                    <Trash2 size={12} /> Quitar Logo
                                </button>
                            </div>
                        )}
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                    {/* Nombre Comercial */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Nombre Personalizado del CRM</label>
                        <input type="text" placeholder="InsideUp CRM" className="input premium-input" style={{ height: '42px', maxWidth: '350px' }}
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
