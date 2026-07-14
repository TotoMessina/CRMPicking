import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus, Trash2, X, Search, ChevronUp, ChevronDown,
    Route as RouteIcon, User, MessageSquare, Users, Map as MapIcon, Zap, List,
    GripVertical, Copy, Share2, Clock, TrendingDown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useAsignadorRutas } from '../hooks/useAsignadorRutas';
import { ESTADOS_COLORES, makeNumberedIcon } from '../utils/mapUtils';

// Helper: Centrar mapa en la ruta
function FitBounds({ points }: { points: L.LatLngExpression[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        if (points.length === 1) map.setView(points[0], 14);
        else map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
    }, [points, map]);
    return null;
}

// Helper: Forzar refresco de mapa al cambiar layouts
function MapResizer({ mobileTab, verMapa }: { mobileTab: string; verMapa: boolean }) {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 400); 
    }, [map, mobileTab, verMapa]);
    return null;
}

export default function AsignadorRutas() {
    const { t } = useTranslation();
    
    const {
        distanciaTotal,
        usuarios,
        usuarioSeleccionado,
        setUsuarioSeleccionado,
        fechaSeleccionada,
        setFechaSeleccionada,
        rutaActual,
        loadingRuta,
        tabActiva,
        setTabActiva,
        searchTerm,
        setSearchTerm,
        searchResults,
        sugerenciasRiesgo,
        editingComentario,
        setEditingComentario,
        verMapa,
        setVerMapa,
        mobileTab,
        setMobileTab,
        agregarAFila,
        quitarVisita,
        moverVisita,
        onDragEnd,
        vaciarRuta,
        clonarUltimaRuta,
        compartirWhatsApp,
        optimizarRuta,
        polylinePoints,
        guardarComentario
    } = useAsignadorRutas();

    return (
        <div className="asign-pro-container">
            <div className="asign-stats-bar">
                <div className="stat-card premium blue">
                    <div className="stat-squircle"><Users size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{rutaActual.length}</div>
                        <div className="stat-label">{t('asignador.stats.locales')}</div>
                    </div>
                </div>
                <div className="stat-card premium emerald">
                    <div className="stat-squircle"><TrendingDown size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{distanciaTotal.toFixed(1)} KM</div>
                        <div className="stat-label">{t('asignador.stats.distance')}</div>
                    </div>
                </div>
                <div className="stat-card premium amber">
                    <div className="stat-squircle"><Clock size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">~{rutaActual.length * 15} min</div>
                        <div className="stat-label">{t('asignador.stats.estimated_time')}</div>
                    </div>
                </div>
                <div className="stat-card premium black interactive" style={{ cursor: 'pointer' }} onClick={() => setVerMapa(!verMapa)}>
                    <div className="stat-squircle"><MapIcon size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value" style={{ fontSize: '1.2rem' }}>{verMapa ? t('asignador.stats.active') : t('asignador.stats.hidden')}</div>
                        <div className="stat-label">{t('asignador.stats.visual_map')}</div>
                    </div>
                </div>
            </div>

            <div className="mobile-tabs-switcher">
                <button className={`m-tab-btn ${mobileTab === 'buscar' ? 'active' : ''}`} onClick={() => setMobileTab('buscar')}>
                    <Plus size={18} /> <span>{t('asignador.mobile.add')}</span>
                </button>
                <button className={`m-tab-btn ${mobileTab === 'ruta' ? 'active' : ''}`} onClick={() => setMobileTab('ruta')}>
                    <RouteIcon size={18} /> <span>{t('asignador.mobile.my_route', { count: rutaActual.length })}</span>
                </button>
            </div>

            <div className={`asign-main-grid view-${verMapa ? 'split' : 'full'}`}>
                <div className={`control-panel ${mobileTab === 'buscar' ? 'mobile-visible' : 'mobile-hidden'}`}>
                    <div className="glass-card sticky-mobile-config">
                        <h3 className="asign-section-title" style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                            <User size={16} className="text-accent" /> 
                            <span>{t('asignador.config.title')}</span>
                        </h3>
                        <div className="config-inputs-grid">
                            <select className="input premium-select" value={usuarioSeleccionado} onChange={e => setUsuarioSeleccionado(e.target.value)}>
                                <option value="">— {t('asignador.config.choose_vendor')} —</option>
                                {usuarios.map(u => <option key={u.email} value={u.email}>{u.nombre}</option>)}
                            </select>
                            <input type="date" className="input premium-input" value={fechaSeleccionada} onChange={e => setFechaSeleccionada(e.target.value)} />
                        </div>
                    </div>

                    <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="tabs-header">
                            <button className={`tab-btn ${tabActiva === 'riesgo' ? 'active' : ''}`} onClick={() => setTabActiva('riesgo')}>
                                {t('asignador.tabs.risk')}
                            </button>
                            <button className={`tab-btn ${tabActiva === 'buscar' ? 'active' : ''}`} onClick={() => setTabActiva('buscar')}>
                                {t('asignador.tabs.search')}
                            </button>
                        </div>

                        <div className="suggestions-list">
                            {tabActiva === 'riesgo' ? (
                                sugerenciasRiesgo.length > 0 ? (
                                    sugerenciasRiesgo.map(s => (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={s.id} className="suggestion-item" onClick={() => agregarAFila(s)}>
                                            <div className="risk-badge" style={{ background: s.risk.color, color: '#fff' }}>{s.risk.level}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.clientes.nombre_local}</div>
                                            <div className="muted" style={{ fontSize: '0.75rem' }}>{t('asignador.risk_days', { count: s.risk.diasSinContacto })}</div>
                                        </motion.div>
                                    ))
                                ) : <div className="muted p-4 text-center">{t('asignador.no_alerts')} ✨</div>
                            ) : (
                                <div>
                                    <div className="asign-search-wrap">
                                        <Search size={15} className="asign-search-icon" />
                                        <input type="text" className="input" placeholder={t('asignador.search_placeholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '36px', width: '100%' }} />
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        {searchResults.map(r => (
                                            <div key={r.id} className="suggestion-item" onClick={() => agregarAFila(r)}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 600 }}>{r.clientes.nombre_local}</div>
                                                    <div style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>#{r.clientes.id}</div>
                                                </div>
                                                <div className="muted" style={{ fontSize: '0.7rem' }}>{r.clientes.direccion}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`route-panel ${mobileTab === 'ruta' ? 'mobile-visible' : 'mobile-hidden'}`}>
                    <div className="route-list-container">
                        <div className="route-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <List size={18} />
                                <strong>{t('asignador.route.header')}</strong>
                            </div>
                            {rutaActual.length > 0 && (
                                <button className="btn-link" onClick={vaciarRuta} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}>
                                    {t('asignador.route.empty_all')}
                                </button>
                            )}
                        </div>

                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="ruta">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="route-list" style={{ overflowY: 'auto', flex: 1, minHeight: '100px' }}>
                                        {loadingRuta ? <div className="p-8 text-center muted">{t('asignador.route.updating')}</div> :
                                         rutaActual.length === 0 ? (
                                            <div className="p-12 text-center muted">
                                                <RouteIcon size={40} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                                                <p>{t('asignador.route.empty_desc')}<br/>{t('asignador.route.empty_tip')}</p>
                                            </div>
                                         ) : (
                                            rutaActual.map((v, i) => (
                                                <Draggable key={v.id} draggableId={String(v.id)} index={i}>
                                                    {(provided, snapshot) => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} className="route-item" style={{ ...provided.draggableProps.style, filter: snapshot.isDragging ? 'brightness(1.05)' : 'none' }}>
                                                            <div {...provided.dragHandleProps} className="route-handle">
                                                                <GripVertical size={18} />
                                                            </div>
                                                            <div className="route-item-content">
                                                                <div className="route-item-info">
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div className="route-sorter-arrows" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                                                                            <button onClick={() => moverVisita(i, -1)} disabled={i === 0} className={`arrow-btn ${i === 0 ? 'disabled' : ''}`} title={t('common.actions.move_up')}><ChevronUp size={14} /></button>
                                                                            <button onClick={() => moverVisita(i, 1)} disabled={i === rutaActual.length - 1} className={`arrow-btn ${i === rutaActual.length - 1 ? 'disabled' : ''}`} title={t('common.actions.move_down')}><ChevronDown size={14} /></button>
                                                                        </div>
                                                                        <span style={{ background: 'var(--accent)', color: '#fff', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.clientes?.nombre_local}</div>
                                                                    </div>
                                                                    <div className="muted" style={{ fontSize: '0.75rem', marginLeft: 52 }}>{v.clientes?.direccion}</div>
                                                                    {v.comentarios_admin && (
                                                                        <div style={{ fontSize: '0.72rem', marginLeft: 52, color: 'var(--accent)', fontStyle: 'italic', marginTop: 1, background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: '4px', borderLeft: '2px solid var(--accent)' }}>
                                                                            💬 {v.comentarios_admin}
                                                                        </div>
                                                                    )}
                                                                    <div className="route-item-actions" style={{ display: 'flex', gap: '8px', paddingRight: '4px', marginLeft: 52, marginTop: 8 }}>
                                                                        <button onClick={() => setEditingComentario({ id: v.id, texto: v.comentarios_admin || '' })} className={`premium-pill-btn ${v.comentarios_admin ? 'active' : ''}`} title={v.comentarios_admin ? t('asignador.actions.edit_note') : t('asignador.actions.add_note')}>
                                                                            <MessageSquare size={14} /> <span>{v.comentarios_admin ? t('asignador.actions.view_note') : t('asignador.actions.add_note')}</span>
                                                                        </button>
                                                                        <button onClick={() => { if(window.confirm(t('asignador.confirm.remove_client', { name: v.clientes?.nombre_local || t('asignador.unnamed_local') }))) quitarVisita(v.id) }} className="premium-pill-btn danger" title={t('asignador.actions.remove_from_list')}>
                                                                            <Trash2 size={14} /> <span>{t('common.actions.remove')}</span>
                                                                        </button>
                                                                    </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    )}
                                                </Draggable>
                                            ))
                                         )
                                        }
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>

                    <AnimatePresence>
                        {editingComentario && (
                            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} onClick={() => setEditingComentario(null)}>
                                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="glass-card" style={{ width: '90%', maxWidth: '420px', padding: '24px', background: 'var(--bg)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '10px', display: 'flex' }}><MessageSquare size={18} className="text-accent" /></div>
                                            <strong style={{ fontSize: '1.1rem' }}>{t('asignador.modal.note_title')}</strong>
                                        </div>
                                        <button onClick={() => setEditingComentario(null)} className="premium-icon-btn" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
                                    </div>
                                    <textarea className="input premium-input" autoFocus value={editingComentario.texto} onChange={e => setEditingComentario({...editingComentario!, texto: e.target.value})} rows={4} style={{ width: '100%', marginBottom: 20, resize: 'none', fontSize: '0.95rem' }} placeholder={t('asignador.modal.note_placeholder')} />
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button className="btn-secundario" onClick={() => setEditingComentario(null)} style={{ flex: 1 }}>{t('common.actions.cancel')}</button>
                                        <button className="btn-primario" onClick={guardarComentario} style={{ flex: 1.5 }}>{t('common.actions.complete')}</button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {verMapa && (
                        <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: window.innerWidth < 768 ? '100%' : '400px' }} exit={{ opacity: 0, width: 0 }} className="map-panel">
                            <div className="glass-card" style={{ height: window.innerWidth < 768 ? '300px' : '600px', padding: 0, overflow: 'hidden' }}>
                                <MapContainer center={[-34.6, -58.4]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <FitBounds points={polylinePoints} />
                                    <MapResizer mobileTab={mobileTab} verMapa={verMapa} />
                                    {polylinePoints.length > 1 && <Polyline positions={polylinePoints} pathOptions={{ color: 'var(--accent)', weight: 3, opacity: 0.6, dashArray: '5, 10' }} />}
                                    {rutaActual.map((v, idx) => {
                                        if (!v.clientes?.lat || !v.clientes?.lng) return null;
                                        const col = (v.estado && ESTADOS_COLORES[v.estado]) || ESTADOS_COLORES['Pendiente'];
                                        return (
                                            <Marker key={v.id} position={[v.clientes.lat, v.clientes.lng]} icon={makeNumberedIcon(idx + 1, col.pin, v.estado === 'Visitado', false)}>
                                                <Popup><strong>{v.clientes.nombre_local}</strong><br/>{v.clientes.direccion}</Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="action-buttons-floating">
                <button className="btn-floating btn-secundario" onClick={clonarUltimaRuta} title={t('asignador.actions.clone_tip')}>
                    <Copy size={16} /> <span className="hide-mobile">{t('asignador.actions.clone_last')}</span>
                </button>
                <button className="btn-floating btn-secundario" onClick={optimizarRuta}>
                    <Zap size={16} /> <span className="hide-mobile">{t('common.actions.optimize')}</span>
                </button>
                <button className="btn-floating btn-primario" onClick={compartirWhatsApp} disabled={rutaActual.length === 0}>
                    <Share2 size={16} /> <span className="hide-mobile">WhatsApp</span>
                </button>
                <style>{`
                .arrow-btn { border: none; background: transparent; color: var(--text-muted); padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .arrow-btn:hover:not(.disabled) { color: var(--accent); transform: scale(1.1); }
                .arrow-btn.disabled { opacity: 0.1; cursor: not-allowed; }
                .premium-pill-btn { padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                .premium-pill-btn.active { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
                .premium-pill-btn:hover { background: var(--bg-hover); color: var(--text); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .premium-pill-btn.danger { color: #ef4444; background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.1); }
                .premium-pill-btn.danger:hover { background: #ef4444; color: white; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
            `}</style>
            </div>
        </div>
    );
}
