import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Plus, Trash2, X, Search, ChevronUp, ChevronDown,
    Route, User, Calendar, MessageSquare, Save, Users
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AsignadorRutas() {
    const { empresaActiva } = useAuth();

    // State: usuarios del sistema
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date().toISOString().split('T')[0]);

    // State: buscador de clientes
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // State: visitas actuales del usuario+día
    const [rutaActual, setRutaActual] = useState([]);
    const [loadingRuta, setLoadingRuta] = useState(false);

    // State: comentario en edición
    const [editingComentario, setEditingComentario] = useState(null); // { id, texto }
    const [savingComentario, setSavingComentario] = useState(false);

    // Cargar usuarios de la empresa
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsuarios = async () => {
            // Step 1: get emails of users in this empresa
            const { data: euData } = await supabase
                .from('empresa_usuario')
                .select('usuario_email')
                .eq('empresa_id', empresaActiva.id);

            const emails = (euData || []).map(e => e.usuario_email);
            if (emails.length === 0) { setUsuarios([]); return; }

            // Step 2: get user details from usuarios table
            const { data: usersData } = await supabase
                .from('usuarios')
                .select('email, nombre')
                .in('email', emails)
                .order('nombre');

            setUsuarios((usersData || []).map(u => ({
                email: u.email,
                nombre: u.nombre || u.email
            })));
        };
        fetchUsuarios();
    }, [empresaActiva]);

    // Cargar ruta del usuario seleccionado para la fecha
    const fetchRuta = useCallback(async () => {
        if (!usuarioSeleccionado || !fechaSeleccionada || !empresaActiva?.id) {
            setRutaActual([]);
            return;
        }
        setLoadingRuta(true);
        try {
            // Step 1: fetch route entries (no join)
            const { data: visitasRaw, error } = await supabase
                .from('visitas_diarias')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', usuarioSeleccionado)
                .eq('fecha_asignada', fechaSeleccionada)
                .order('orden', { ascending: true });

            if (error) throw error;
            if (!visitasRaw || visitasRaw.length === 0) { setRutaActual([]); return; }

            // Step 2: fetch client details
            const clienteIds = [...new Set(visitasRaw.map(v => v.cliente_id))];
            const { data: clientesRaw } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion')
                .in('id', clienteIds);

            // Step 3: merge
            const clienteMap = {};
            (clientesRaw || []).forEach(c => { clienteMap[c.id] = c; });
            setRutaActual(visitasRaw.map(v => ({ ...v, clientes: clienteMap[v.cliente_id] || null })));
        } catch (e) {
            console.error(e);
            toast.error('Error al cargar la ruta');
        } finally {
            setLoadingRuta(false);
        }
    }, [usuarioSeleccionado, fechaSeleccionada, empresaActiva]);

    useEffect(() => { fetchRuta(); }, [fetchRuta]);

    // Buscador de clientes — búsqueda en dos pasos para evitar limitaciones de PostgREST
    useEffect(() => {
        if (searchTerm.length < 2) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);

            // Step 1: buscar en la tabla clientes por nombre
            const { data: clientesRaw } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion')
                .ilike('nombre_local', `%${searchTerm}%`)
                .limit(20);

            if (!clientesRaw || clientesRaw.length === 0) {
                setSearchResults([]);
                setSearching(false);
                return;
            }

            // Step 2: filtrar solo los que pertenecen a esta empresa y están activos
            const clienteIds = clientesRaw.map(c => c.id);
            const { data: ecData } = await supabase
                .from('empresa_cliente')
                .select('id, cliente_id')
                .eq('empresa_id', empresaActiva?.id)
                .eq('activo', true)
                .in('cliente_id', clienteIds);

            // Armar resultado final en el formato esperado por agregarCliente()
            const merged = (ecData || []).map(ec => ({
                id: ec.id,
                clientes: clientesRaw.find(c => c.id === ec.cliente_id)
            })).filter(x => x.clientes).slice(0, 8);

            setSearchResults(merged);
            setSearching(false);
        }, 350);
        return () => clearTimeout(t);
    }, [searchTerm, empresaActiva]);

    const agregarCliente = async (ec) => {
        if (!usuarioSeleccionado) { toast.error('Seleccioná un usuario primero'); return; }
        const yaExiste = rutaActual.find(v => v.cliente_id === ec.clientes.id);
        if (yaExiste) { toast.error('Este local ya está en la ruta'); return; }

        const orden = rutaActual.length;
        const { data, error } = await supabase
            .from('visitas_diarias')
            .insert([{
                empresa_id: empresaActiva.id,
                cliente_id: ec.clientes.id,
                usuario_asignado_email: usuarioSeleccionado,
                fecha_asignada: fechaSeleccionada,
                estado: 'Pendiente',
                orden,
                comentarios_admin: null
            }])
            .select('*')
            .single();

        if (error) { toast.error('Error al agregar el local'); console.error(error); return; }
        // Attach client data from the search result (no need for another query)
        setRutaActual(prev => [...prev, { ...data, clientes: ec.clientes }]);
        setSearchTerm('');
        setSearchResults([]);
        toast.success(`${ec.clientes.nombre_local} agregado a la ruta`);
    };

    const quitarCliente = async (visitaId) => {
        const { error } = await supabase.from('visitas_diarias').delete().eq('id', visitaId);
        if (error) { toast.error('Error al quitar el local'); return; }
        setRutaActual(prev => prev.filter(v => v.id !== visitaId));
        toast.success('Local removido de la ruta');
    };

    const moverVisita = async (idx, direccion) => {
        const nueva = [...rutaActual];
        const destIdx = idx + direccion;
        if (destIdx < 0 || destIdx >= nueva.length) return;
        [nueva[idx], nueva[destIdx]] = [nueva[destIdx], nueva[idx]];

        // Actualizar orden en UI inmediatamente
        setRutaActual(nueva);

        // Persistir en DB
        try {
            await Promise.all(
                nueva.map((v, i) =>
                    supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id)
                )
            );
        } catch {
            toast.error('Error guardando el orden');
            fetchRuta(); // revertir
        }
    };

    const guardarComentario = async () => {
        if (!editingComentario) return;
        setSavingComentario(true);
        const { error } = await supabase
            .from('visitas_diarias')
            .update({ comentarios_admin: editingComentario.texto || null })
            .eq('id', editingComentario.id);

        if (error) {
            toast.error('Error al guardar comentario');
        } else {
            setRutaActual(prev =>
                prev.map(v => v.id === editingComentario.id
                    ? { ...v, comentarios_admin: editingComentario.texto }
                    : v
                )
            );
            toast.success('Comentario guardado');
            setEditingComentario(null);
        }
        setSavingComentario(false);
    };

    const usuarioInfo = usuarios.find(u => u.email === usuarioSeleccionado);

    return (
        <div className="asign-page">
            {/* Header */}
            <header className="asign-header">
                <div className="asign-title-group">
                    <Route size={22} color="var(--accent)" />
                    <div>
                        <h1>Asignador de Rutas</h1>
                        <p className="muted">Organizá la ruta de cada usuario</p>
                    </div>
                </div>
            </header>

            <div className="asign-layout">
                {/* Panel izquierdo: selectores + buscador */}
                <div className="asign-panel-left">
                    <div className="asign-section-card">
                        <h3 className="asign-section-title"><User size={16} /> Usuario</h3>
                        <select
                            className="input"
                            value={usuarioSeleccionado}
                            onChange={e => setUsuarioSeleccionado(e.target.value)}
                        >
                            <option value="">— Seleccionar usuario —</option>
                            {usuarios.map(u => (
                                <option key={u.email} value={u.email}>{u.nombre || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="asign-section-card">
                        <h3 className="asign-section-title"><Calendar size={16} /> Fecha</h3>
                        <input
                            type="date"
                            className="input"
                            value={fechaSeleccionada}
                            onChange={e => setFechaSeleccionada(e.target.value)}
                        />
                    </div>

                    {/* Buscador de clientes */}
                    <div className="asign-section-card asign-search-card">
                        <h3 className="asign-section-title"><Search size={16} /> Agregar Local</h3>
                        <div className="asign-search-wrap">
                            <Search size={15} className="asign-search-icon" />
                            <input
                                type="text"
                                className="input"
                                placeholder="Buscar local por nombre..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                        {searchTerm.length >= 2 && (
                            <div className="asign-search-results">
                                {searching ? (
                                    <div className="asign-search-empty">Buscando...</div>
                                ) : searchResults.length === 0 ? (
                                    <div className="asign-search-empty">Sin resultados</div>
                                ) : searchResults.map(ec => (
                                    <button
                                        key={ec.id}
                                        className="asign-search-item"
                                        onClick={() => agregarCliente(ec)}
                                    >
                                        <div className="asign-search-item-name">{ec.clientes?.nombre_local}</div>
                                        {ec.clientes?.direccion && (
                                            <div className="asign-search-item-dir">{ec.clientes.direccion}</div>
                                        )}
                                        <Plus size={16} className="asign-search-item-icon" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel derecho: ruta armada */}
                <div className="asign-panel-right">
                    <div className="asign-ruta-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={16} color="var(--accent)" />
                            <strong>{usuarioInfo?.nombre || 'Sin usuario'}</strong>
                        </div>
                        <span className="asign-ruta-count">{rutaActual.length} locales</span>
                    </div>

                    {loadingRuta ? (
                        <div className="asign-loading">Cargando ruta...</div>
                    ) : !usuarioSeleccionado ? (
                        <div className="asign-empty-state">
                            <Route size={40} style={{ opacity: 0.3 }} />
                            <p>Seleccioná un usuario para ver o armar su ruta</p>
                        </div>
                    ) : rutaActual.length === 0 ? (
                        <div className="asign-empty-state">
                            <Plus size={40} style={{ opacity: 0.3 }} />
                            <p>Buscá locales a la izquierda para agregarlos a la ruta</p>
                        </div>
                    ) : (
                        <div className="asign-ruta-list">
                            {rutaActual.map((visita, idx) => {
                                const cliente = visita.clientes;
                                const isEditando = editingComentario?.id === visita.id;

                                return (
                                    <div key={visita.id} className={`asign-ruta-item ${visita.estado === 'Visitado' ? 'asign-ruta-item--done' : ''}`}>
                                        <div className="asign-item-orden">
                                            <span>{idx + 1}</span>
                                            <div className="asign-ordem-arrows">
                                                <button onClick={() => moverVisita(idx, -1)} disabled={idx === 0} className="asign-arrow-btn">
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button onClick={() => moverVisita(idx, 1)} disabled={idx === rutaActual.length - 1} className="asign-arrow-btn">
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="asign-item-info">
                                            <div className="asign-item-name">{cliente?.nombre_local}</div>
                                            {cliente?.direccion && <div className="asign-item-dir">{cliente.direccion}</div>}

                                            {/* Comentario */}
                                            {!isEditando ? (
                                                <button
                                                    className="asign-comentario-trigger"
                                                    onClick={() => setEditingComentario({ id: visita.id, texto: visita.comentarios_admin || '' })}
                                                >
                                                    <MessageSquare size={12} />
                                                    {visita.comentarios_admin
                                                        ? <span className="asign-comentario-text">"{visita.comentarios_admin}"</span>
                                                        : <span className="asign-comentario-empty">Agregar nota de visita...</span>
                                                    }
                                                </button>
                                            ) : (
                                                <div className="asign-comentario-edit">
                                                    <textarea
                                                        autoFocus
                                                        className="input asign-comentario-textarea"
                                                        value={editingComentario.texto}
                                                        onChange={e => setEditingComentario(prev => ({ ...prev, texto: e.target.value }))}
                                                        placeholder="Ej: Preguntar por la oferta del miércoles..."
                                                        rows={2}
                                                    />
                                                    <div className="asign-comentario-actions">
                                                        <button className="btn-link asign-btn-cancel" onClick={() => setEditingComentario(null)}>
                                                            <X size={13} /> Cancelar
                                                        </button>
                                                        <button className="asign-btn-save" onClick={guardarComentario} disabled={savingComentario}>
                                                            <Save size={13} /> {savingComentario ? 'Guardando...' : 'Guardar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="asign-item-estado">
                                            <span className={`asign-estado-pill asign-estado-${visita.estado?.toLowerCase()}`}>
                                                {visita.estado}
                                            </span>
                                        </div>

                                        <button
                                            className="asign-btn-remove"
                                            onClick={() => quitarCliente(visita.id)}
                                            title="Quitar de la ruta"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
