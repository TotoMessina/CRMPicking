import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon, Video, Download, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface LightboxProps {
    mediaUrl: string;
    onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ mediaUrl, onClose }) => {
    const isVideo = mediaUrl.match(/\.(mp4|webm|ogg)$/i) || mediaUrl.includes('video');
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloading(true);
        try {
            const response = await fetch(mediaUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            
            const extension = mediaUrl.split('.').pop()?.split('?')[0] || (isVideo ? 'mp4' : 'jpg');
            link.download = `insideup_media_${Date.now()}.${extension}`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed, fallback to new tab:", error);
            window.open(mediaUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    return createPortal(
        <motion.div 
            className="nov-lightbox-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)',
                zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'
            }}
        >
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 16, zIndex: 10 }}>
                <button 
                    onClick={handleDownload} 
                    style={{ 
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                        color: 'white', borderRadius: '30px', padding: '8px 16px', display: 'flex', alignItems: 'center', 
                        gap: 8, cursor: 'pointer', fontSize: '0.9rem' 
                    }}
                >
                    <Download size={18} /> {downloading ? 'Guardando...' : 'Descargar Original'}
                </button>
                <button 
                    onClick={onClose} 
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>
            </div>

            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '90%', maxHeight: '85%', display: 'flex', justifyContent: 'center' }}
            >
                {isVideo ? (
                    <video src={mediaUrl} controls autoPlay className="nov-lightbox-media" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                ) : (
                    <img src={mediaUrl} alt="Full size" className="nov-lightbox-media" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                )}
            </motion.div>
        </motion.div>,
        document.body
    );
};

interface CreatePostModalProps {
    onClose: () => void;
    user: any;
    empresaActiva: any;
    refresh: () => void;
    avatarUrl: string | null;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, user, empresaActiva, refresh, avatarUrl }) => {
    const { t } = useTranslation();
    const [createTipo, setCreateTipo] = useState<'post' | 'historia'>('post');
    const [contenido, setContenido] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isEncuesta, setIsEncuesta] = useState(false);
    const [encuestaOptions, setEncuestaOptions] = useState(['', '']);
    const [isPreview, setIsPreview] = useState(false);
    const [roles, setRoles] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchRoles = async () => {
            const { data } = await supabase
                .from('crm_roles')
                .select('nombre')
                .or(`empresa_id.eq.${empresaActiva.id},empresa_id.is.null`);
            
            if (data) {
                const disabledRoles = empresaActiva.config?.disabledRoles || [];
                const activeRoles = data
                    .filter((r: any) => !disabledRoles.includes(r.nombre.toLowerCase()))
                    .map((r: any) => r.nombre.toLowerCase());
                
                setRoles(Array.from(new Set(activeRoles)));
            }
        };
        fetchRoles();
    }, [empresaActiva?.id, empresaActiva?.config?.disabledRoles]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleCreate = async () => {
        if (!empresaActiva || !user) return;
        if (!contenido.trim() && files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = files.map(async (file) => {
                const isVideo = file.type.startsWith('video/');

                if (isVideo && file.size > 20 * 1024 * 1024) {
                    throw new Error(`El video "${file.name}" supera el máximo de 20MB`);
                }

                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${file.name.split('.').pop()}`;
                const filePath = `${empresaActiva.id}/${fileName}`;
                
                const { error } = await supabase.storage.from('novedades_media').upload(filePath, file);
                if (error) throw error;

                return supabase.storage.from('novedades_media').getPublicUrl(filePath).data.publicUrl;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            let encuestaPayload = null;
            if (isEncuesta && encuestaOptions.filter(o => o.trim() !== '').length >= 2) {
                encuestaPayload = encuestaOptions
                    .filter(o => o.trim() !== '')
                    .map((o, idx) => ({ id: idx.toString(), texto: o.trim() }));
            }

            await supabase.from('novedades').insert({
                empresa_id: empresaActiva.id,
                creador_id: user.id,
                creador_nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
                creador_avatar: user.user_metadata?.avatar_emoji || '👤',
                creador_avatar_url: avatarUrl || null,
                tipo: createTipo,
                contenido: contenido.trim(),
                media_urls: uploadedUrls,
                encuesta: encuestaPayload,
                roles_permitidos: selectedRoles.length > 0 ? selectedRoles : null
            });

            onClose();
            refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al subir publicación");
        } finally {
            setUploading(false);
        }
    };

    return createPortal(
        <motion.div className="nov-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 2500 }}>
            <motion.div className="nov-modal" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
                <div className="nov-modal-header">
                    <h3>{isPreview ? 'Vista Previa' : 'Crear Publicación'}</h3>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="nov-modal-body">
                    {isPreview ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {createTipo === 'historia' && (
                                <div style={{ textAlign: 'center', padding: '8px', background: 'linear-gradient(45deg, #f09433, #bc1888)', color: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                                    ⚡ Se publicará en las Historias (24hs)
                                </div>
                            )}
                            <div className="nov-post" style={{ borderStyle: 'dashed', padding: '16px', background: 'var(--bg)', pointerEvents: 'none' }}>
                                <div className="nov-post-header">
                                    <div className="nov-post-avatar">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            user.user_metadata?.avatar_emoji || '👤'
                                        )}
                                    </div>
                                    <div className="nov-post-meta">
                                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario'}
                                        </h4>
                                        <span>Ahora mismo</span>
                                    </div>
                                </div>
                                {contenido && <div className="nov-post-content" style={{ fontSize: '0.95rem', margin: '12px 0', color: 'var(--text-primary)' }}>{contenido}</div>}
                                
                                {isEncuesta && encuestaOptions.filter(o => o.trim()).length > 0 && (
                                    <div className="nov-poll-container" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: 8 }}>
                                        {encuestaOptions.filter(o => o.trim()).map((opt, idx) => (
                                            <div key={idx} style={{ marginBottom: 8 }}>
                                                <div style={{ padding: '10px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                                    {opt}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {files.length > 0 && !isEncuesta && (
                                    <div className={`nov-post-media grid-${Math.min(files.length, 4)}`} style={{ marginTop: 12, borderRadius: '12px', overflow: 'hidden' }}>
                                        {files.slice(0, 4).map((f, i) => (
                                            f.type.startsWith('video/') ? (
                                                <video key={i} src={URL.createObjectURL(f)} className="nov-media-item" style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <img key={i} src={URL.createObjectURL(f)} className="nov-media-item" alt="preview" style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }} />
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="nov-type-selector">
                                <button className={`nov-type-btn ${createTipo === 'post' && !isEncuesta ? 'active' : ''}`} onClick={() => { setCreateTipo('post'); setIsEncuesta(false); }}>Muro</button>
                                <button className={`nov-type-btn ${isEncuesta ? 'active' : ''}`} onClick={() => { setCreateTipo('post'); setIsEncuesta(true); }}>Encuesta</button>
                                <button className={`nov-type-btn ${createTipo === 'historia' ? 'active' : ''}`} onClick={() => { setCreateTipo('historia'); setIsEncuesta(false); }}>Historia</button>
                            </div>
                            <textarea className="nov-textarea" placeholder={isEncuesta ? "¿Cuál es tu pregunta?" : "¿Qué hay de nuevo?"} value={contenido} onChange={e => setContenido(e.target.value)} />
                            
                            {isEncuesta && (
                                <div className="nov-poll-creator" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                    {encuestaOptions.map((opt, idx) => (
                                        <input 
                                            key={idx}
                                            type="text" 
                                            className="nov-poll-input" 
                                            placeholder={`Opción ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...encuestaOptions];
                                                newOpts[idx] = e.target.value;
                                                setEncuestaOptions(newOpts);
                                            }}
                                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    ))}
                                    {encuestaOptions.length < 4 && (
                                        <button 
                                            onClick={() => setEncuestaOptions([...encuestaOptions, ''])}
                                            style={{ padding: '6px', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer' }}
                                        >
                                            + Añadir opción
                                        </button>
                                    )}
                                </div>
                            )}

                            {files.length > 0 && !isEncuesta && (
                                <div className="nov-files-preview">
                                    {files.map((f, i) => (
                                        <div key={i} className="nov-file-preview-item">
                                            {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="preview" /> : <div className="nov-file-badge">{f.name}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    <Eye size={14} /> ¿Quiénes pueden ver esta publicación?
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedRoles([])}
                                        style={{ 
                                            padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                            border: '1px solid',
                                            background: selectedRoles.length === 0 ? 'var(--accent)' : 'transparent',
                                            color: selectedRoles.length === 0 ? 'white' : 'var(--text-secondary)',
                                            borderColor: selectedRoles.length === 0 ? 'var(--accent)' : 'var(--border-color)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        Todos (Público)
                                    </button>
                                    {roles.map(r => {
                                        const isSelected = selectedRoles.includes(r);
                                        return (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedRoles(selectedRoles.filter(sr => sr !== r));
                                                    } else {
                                                        setSelectedRoles([...selectedRoles, r]);
                                                    }
                                                }}
                                                style={{ 
                                                    padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                                    border: '1px solid',
                                                    background: isSelected ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                                    color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {r.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedRoles.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>
                                        Visible únicamente para los roles seleccionados.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="nov-modal-actions">
                    {isPreview ? (
                        <button className="btn-secondary" style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 99, cursor: 'pointer', fontWeight: 600 }} onClick={() => setIsPreview(false)}>
                            Volver a Editar
                        </button>
                    ) : (
                        <div className="nov-media-buttons">
                            {!isEncuesta && <label className="nov-media-btn"><ImageIcon size={18} /> Foto <input type="file" hidden accept="image/*" multiple onChange={handleFileChange} /></label>}
                            {!isEncuesta && <label className="nov-media-btn"><Video size={18} /> Video <input type="file" hidden accept="video/*" multiple onChange={handleFileChange} /></label>}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                        {!isPreview && (
                            <button 
                                className="btn-secondary" 
                                style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 99, cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => setIsPreview(true)}
                                disabled={!contenido.trim() && files.length === 0}
                            >
                                Vista Previa
                            </button>
                        )}
                        <button className="btn-primary" disabled={uploading} onClick={handleCreate}>
                            {uploading ? 'Publicando...' : 'Compartir'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

interface ShareModalProps {
    post: any;
    companyUsers: any[];
    currentUserEmail?: string;
    empresaId?: string;
    onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ post, companyUsers, currentUserEmail, empresaId, onClose }) => {
    const [query, setQuery] = useState('');
    const [sendingTo, setSendingTo] = useState<string | null>(null);

    const filtered = (companyUsers || []).filter((u: any) => {
        if (u.email === currentUserEmail) return false;
        const text = `${u.nombre || ''} ${u.email || ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
    });

    const handleSend = async (targetEmail: string) => {
        if (!currentUserEmail || !targetEmail) return;
        setSendingTo(targetEmail);

        try {
            const textPreview = post.contenido ? post.contenido.substring(0, 60).trim() : '[Multimedia]';
            const creadorName = post.creador?.nombre || 'Usuario';
            const finalMessage = `[POST_NOVEDADES]|${post.id}|${creadorName}|${textPreview}`;

            const { error } = await supabase.from('mensajes_chat').insert([{
                de_usuario: currentUserEmail,
                para_usuario: targetEmail,
                mensaje: finalMessage,
                empresa_id: empresaId || ''
            }]);

            if (error) throw error;
            
            toast.success("¡Compartido con éxito!");
            onClose();
        } catch (err) {
            console.error("Error sharing:", err);
            toast.error("No se pudo compartir");
        } finally {
            setSendingTo(null);
        }
    };

    return createPortal(
        <motion.div className="nov-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 2500 }}>
            <motion.div className="nov-modal" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ maxWidth: '400px' }}>
                <div className="nov-modal-header">
                    <h3>Compartir Post</h3>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="nov-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar compañero..." 
                        style={{ height: '45px', padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />

                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }} className="nov-share-list">
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                                No se encontraron compañeros
                            </div>
                        ) : (
                            filtered.map((u: any) => (
                                <div 
                                    key={u.id} 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="nov-post-avatar" style={{ width: 32, height: 32, fontSize: '1rem' }}>
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                u.avatar_emoji || '👤'
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{u.nombre}</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{u.email}</div>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn-primary" 
                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                                        disabled={sendingTo !== null}
                                        onClick={() => handleSend(u.email)}
                                    >
                                        {sendingTo === u.email ? 'Enviando...' : 'Compartir'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};
