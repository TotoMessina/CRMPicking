import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Search, History, User, MapPin, Phone, 
    Calendar, ArrowLeft, Loader2, Info
} from 'lucide-react';
import HistoryTimeline from '../components/historial/HistoryTimeline';
import toast from 'react-hot-toast';

export default function Historial() {
    const { empresaActiva } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    
    const [selectedClient, setSelectedClient] = useState(null);
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    // If there's an ID in the URL, load it immediately
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('id');
        if (clientId && empresaActiva?.id) {
            handleSelectClient({ id: clientId });
        }
    }, [empresaActiva]);

    const handleSearch = async (val) => {
        setSearchTerm(val);
        if (val.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const { data } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion, telefono')
                .ilike('nombre_local', `%${val}%`)
                .limit(8);
            setSearchResults(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectClient = async (client) => {
        setSearchTerm('');
        setSearchResults([]);
        setLoadingEvents(true);
        
        try {
            // 1. Fetch Client Details in current company
            const { data: ecData, error: ecError } = await supabase
                .from('empresa_cliente')
                .select('*, clientes!inner(*)')
                .eq('cliente_id', client.id)
                .eq('empresa_id', empresaActiva.id)
                .single();

            if (ecError) throw ecError;
            setSelectedClient(ecData);

            // 2. Fetch all history sources
            const [activitiesRes, eventsRes, auditRes] = await Promise.all([
                // Activities table
                supabase.from('actividades')
                    .select('*')
                    .eq('cliente_id', client.id)
                    .eq('empresa_id', empresaActiva.id)
                    .order('fecha', { ascending: false }),
                
                // Calendar Events
                supabase.from('eventos')
                    .select('*')
                    .eq('cliente_id', client.id)
                    .eq('empresa_id', empresaActiva.id)
                    .order('fecha_inicio', { ascending: false }),
                
                // Audit Logs (specifically creation)
                supabase.from('audit_logs')
                    .select('*')
                    .eq('record_id', String(client.id))
                    .eq('table_name', 'clientes')
                    .eq('action_type', 'INSERT')
            ]);

            const consolidatedEvents = [];

            // Process Status History (from ecData)
            if (ecData.status_history && Array.isArray(ecData.status_history)) {
                ecData.status_history.forEach((sh, i) => {
                    consolidatedEvents.push({
                        type: 'status_change',
                        typeLabel: 'Cambio de Estado',
                        at: sh.at || ecData.updated_at || ecData.created_at,
                        from: sh.from,
                        to: sh.to,
                        by: sh.by,
                        userName: sh.userName,
                        description: `Cambio de estado: ${sh.from} -> ${sh.to}`
                    });
                });
            }

            // Process Activities
            activitiesRes.data?.forEach(act => {
                const isVisit = act.descripcion === 'Visita realizada';
                consolidatedEvents.push({
                    type: isVisit ? 'visit' : 'activity',
                    typeLabel: isVisit ? 'Visita' : 'Actividad',
                    at: act.fecha || new Date().toISOString(),
                    description: act.descripcion,
                    by: act.usuario,
                    details: act.user_id ? `ID Usuario: ${act.user_id}` : null
                });
            });

            // Process Calendar Events
            eventsRes.data?.forEach(evt => {
                consolidatedEvents.push({
                    type: 'event',
                    typeLabel: 'Evento Calendario',
                    at: evt.fecha_inicio || new Date().toISOString(),
                    description: evt.titulo,
                    details: evt.descripcion,
                    by: evt.creado_por || evt.usuario
                });
            });

            // Process Creation Audit
            auditRes.data?.forEach(log => {
                consolidatedEvents.push({
                    type: 'creation',
                    typeLabel: 'Creación de Ficha',
                    at: log.created_at || new Date().toISOString(),
                    description: 'Cliente registrado en el sistema base',
                    by: log.changed_by
                });
            });

            setEvents(consolidatedEvents);
            
        } catch (error) {
            console.error("Error loading client history:", error);
            toast.error("Error al cargar el historial");
        } finally {
            setLoadingEvents(false);
        }
    };

    return (
        <div className="historial-page">
            <header className="page-header-premium">
                <div className="header-top">
                    <div className="title-group">
                        <div className="icon-badge">
                            <History size={24} />
                        </div>
                        <div>
                            <h1>Buscador de Historial</h1>
                            <p className="muted">Línea de tiempo de interacciones y eventos</p>
                        </div>
                    </div>
                </div>

                <div className="search-container-large">
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscá un local por nombre para ver su pasado..."
                            className="input-premium"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {searching && <Loader2 className="spinner" size={20} />}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="floating-results">
                            {searchResults.map(r => (
                                <button key={r.id} className="result-item" onClick={() => handleSelectClient(r)}>
                                    <div className="result-icon"><User size={16} /></div>
                                    <div className="result-text">
                                        <div className="result-title">{r.nombre_local}</div>
                                        <div className="result-meta">{r.direccion} | {r.telefono}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="historial-content">
                {selectedClient ? (
                    <div className="client-history-view">
                        <div className="client-summary-card">
                            <div className="summary-section">
                                <div className="client-avatar">
                                    {selectedClient.clientes?.nombre_local?.charAt(0) || 'L'}
                                </div>
                                <div className="client-details">
                                    <h2>{selectedClient.clientes?.nombre_local}</h2>
                                    <div className="meta-grid">
                                        <div className="meta-item"><MapPin size={14} /> {selectedClient.clientes?.direccion || 'Sin dirección'}</div>
                                        <div className="meta-item"><Phone size={14} /> {selectedClient.clientes?.telefono || 'Sin teléfono'}</div>
                                        <div className="meta-item"><Calendar size={14} /> Creado: {format(new Date(selectedClient.created_at), 'dd/MM/yyyy')}</div>
                                    </div>
                                </div>
                                <div className="client-status-badge">
                                    {selectedClient.estado}
                                </div>
                            </div>
                        </div>

                        <div className="timeline-section">
                            <div className="section-title-premium">
                                <Activity size={18} />
                                <h3>Traza de Eventos</h3>
                            </div>
                            <HistoryTimeline events={events} loading={loadingEvents} />
                        </div>
                    </div>
                ) : (
                    <div className="empty-state-view">
                        <div className="empty-illustration">
                            <Search size={64} className="muted" />
                        </div>
                        <h2>¿Qué querés investigar hoy?</h2>
                        <p className="muted">Buscá un cliente arriba para ver toda su historia, desde su creación hasta su última conversación.</p>
                        <div className="empty-tips">
                            <div className="tip-item"><Info size={16} /> Verás cambios de estado automáticos</div>
                            <div className="tip-item"><Info size={16} /> Todas las notas cargadas por activadores</div>
                            <div className="tip-item"><Info size={16} /> Visitas realizadas presencialmente</div>
                        </div>
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                .historial-page {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 24px 20px;
                }
                .page-header-premium {
                    margin-bottom: 32px;
                }
                .title-group {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .icon-badge {
                    width: 48px;
                    height: 48px;
                    background: var(--accent);
                    color: white;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .search-container-large {
                    position: relative;
                }
                .search-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .search-icon {
                    position: absolute;
                    left: 16px;
                    color: var(--text-muted);
                }
                .input-premium {
                    width: 100%;
                    padding: 16px 48px;
                    font-size: 1.1rem;
                    border-radius: 16px;
                    border: 1px solid var(--border);
                    background: var(--bg-elevated);
                    box-shadow: var(--shadow-sm);
                    transition: border-color 0.2s, box-shadow 0.2s;
                    outline: none;
                }
                .input-premium:focus {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                .spinner {
                    position: absolute;
                    right: 16px;
                    animation: spin 1s linear infinite;
                    color: var(--accent);
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .floating-results {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    box-shadow: var(--shadow-lg);
                    z-index: 100;
                    overflow: hidden;
                }
                .result-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border: none;
                    background: none;
                    text-align: left;
                    cursor: pointer;
                    transition: background 0.2s;
                    border-bottom: 1px solid var(--border);
                }
                .result-item:hover {
                    background: var(--accent-soft);
                }
                .result-icon {
                    width: 32px;
                    height: 32px;
                    background: var(--bg);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                }
                .result-title {
                    font-weight: 600;
                    color: var(--text);
                }
                .result-meta {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }
                .client-summary-card {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 32px;
                    box-shadow: var(--shadow-sm);
                }
                .summary-section {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .client-avatar {
                    width: 64px;
                    height: 64px;
                    background: var(--accent);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: 800;
                }
                .client-details {
                    flex: 1;
                }
                .meta-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-top: 8px;
                }
                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .client-status-badge {
                    padding: 6px 12px;
                    background: var(--accent-soft);
                    color: var(--accent);
                    border-radius: 99px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }
                .section-title-premium {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                    color: var(--text);
                }
                .section-title-premium h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .empty-state-view {
                    padding: 60px 20px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .empty-illustration {
                    margin-bottom: 24px;
                    opacity: 0.5;
                }
                .empty-tips {
                    margin-top: 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    text-align: left;
                }
                .tip-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }
                @media (max-width: 600px) {
                    .summary-section {
                        flex-direction: column;
                        text-align: center;
                    }
                    .meta-grid {
                        justify-content: center;
                    }
                }
            ` }} />
        </div>
    );
}
