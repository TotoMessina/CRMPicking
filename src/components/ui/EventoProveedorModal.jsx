import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export function EventoProveedorModal({ isOpen, onClose, eventId, isIdea = false, onSaved, proveedores = [], sprints = [] }) {
    const { empresaActiva } = useAuth();
    const [loading, setLoading] = useState(false);
    const [historialLoading, setHistorialLoading] = useState(false);
    const [historyInput, setHistoryInput] = useState('');
    const [history, setHistory] = useState([]);

    const [formData, setFormData] = useState({
        proveedor_id: '',
        tipo: isIdea ? 'idea' : 'pedido',
        titulo: '',
        sprint_id: '',
        fecha_inicio: '',
        fecha_fin: '',
        fecha_real_cierre: '',
        estado: 'pendiente',
        descripcion: '',
        prioridad: 'media',
        depende_de_nosotros: true
    });

    useEffect(() => {
        if (isOpen) {
            if (eventId) {
                loadEvent(eventId);
                loadHistory(eventId);
            } else {
                setHistory([]);
                setHistoryInput('');

                const now = new Date();
                const pad = (n) => String(n).padStart(2, "0");
                const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

                setFormData({
                    proveedor_id: '',
                    tipo: isIdea ? 'idea' : 'pedido',
                    titulo: '',
                    sprint_id: '',
                    fecha_inicio: isIdea ? '' : localNow,
                    fecha_fin: '',
                    fecha_real_cierre: '',
                    estado: 'pendiente',
                    descripcion: '',
                    prioridad: 'media',
                    depende_de_nosotros: true
                });
            }
        }
    }, [isOpen, eventId, isIdea]);

    const loadEvent = async (id) => {
        setLoading(true);
        const { data, error } = await supabase.from('eventos_proveedores').select('*').eq('id', id).single();
        if (!error && data) {
            setFormData({
                proveedor_id: data.proveedor_id || '',
                tipo: data.tipo || 'pedido',
                titulo: data.titulo || '',
                sprint_id: data.sprint_id || '',
                fecha_inicio: toLocalInput(data.fecha_inicio),
                fecha_fin: toLocalInput(data.fecha_fin),
                fecha_real_cierre: toLocalInput(data.fecha_real_cierre),
                estado: data.estado || 'pendiente',
                descripcion: data.descripcion || '',
                prioridad: data.prioridad || 'media',
                depende_de_nosotros: data.depende_de_nosotros !== false
            });
        }
        setLoading(false);
    };

    const loadHistory = async (id) => {
        if (!empresaActiva?.id) return;
        setHistorialLoading(true);
        const { data } = await supabase
            .from('eventos_historial')
            .select('*')
            .eq('evento_id', id)
            .eq('empresa_id', empresaActiva.id)
            .order('created_at', { ascending: false });
        setHistory(data || []);
        setHistorialLoading(false);
    };

    const toLocalInput = (isoStr) => {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const toISO = (localStr) => {
        if (!localStr) return null;
        return new Date(localStr).toISOString();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.proveedor_id) return toast.error("Selecciona un proveedor");
        if (!formData.titulo.trim()) return toast.error("El título es obligatorio");

        setLoading(true);

        // Find selected sprint name if any, to keep 'seccion' string in sync (legacy support)
        const selectedSprint = sprints.find(s => s.id === formData.sprint_id);
        const sprintName = selectedSprint ? selectedSprint.nombre : null;

        const payload = {
            proveedor_id: formData.proveedor_id,
            tipo: formData.tipo,
            sprint_id: formData.sprint_id || null,
            seccion: sprintName, // Keep name sync
            titulo: formData.titulo.trim(),
            fecha_inicio: toISO(formData.fecha_inicio),
            fecha_fin: toISO(formData.fecha_fin),
            fecha_real_cierre: toISO(formData.fecha_real_cierre),
            estado: formData.estado,
            descripcion: formData.descripcion.trim() || null,
            prioridad: formData.prioridad,
            depende_de_nosotros: formData.depende_de_nosotros,
            empresa_id: empresaActiva?.id
        };

        if (eventId) {
            const { error } = await supabase.from('eventos_proveedores').update(payload).eq('id', eventId);
            if (error) toast.error(error.message);
            else {
                toast.success('Evento/Idea actualizado');
                onSaved();
            }
        } else {
            const { error } = await supabase.from('eventos_proveedores').insert([payload]);
            if (error) toast.error(error.message);
            else {
                toast.success('Creado correctamente');
                onSaved();
            }
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!window.confirm("¿Eliminar este evento/idea?")) return;
        setLoading(true);
        const { error } = await supabase.from('eventos_proveedores').delete().eq('id', eventId);
        if (error) toast.error("Error al eliminar");
        else {
            toast.success("Eliminado");
            onSaved();
        }
        setLoading(false);
    };

    const handleAddHistory = async () => {
        if (!historyInput.trim() || !eventId || !empresaActiva?.id) return;

        const user = (await supabase.auth.getSession()).data.session?.user;
        const userEmail = user?.email || null;

        const { error } = await supabase.from('eventos_historial').insert([{
            evento_id: eventId,
            comentario: historyInput.trim(),
            usuario_email: userEmail,
            empresa_id: empresaActiva.id
        }]);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Nota agregada");
            setHistoryInput('');
            loadHistory(eventId);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{eventId ? 'Editar ' : 'Nuevo '}{isIdea ? 'Idea' : 'Evento'}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                {loading && eventId && !formData.titulo ? <div style={{ opacity: 0.5 }}>Cargando datos...</div> : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label className="field">
                                <span className="field-label">Proveedor *</span>
                                <select name="proveedor_id" className="input" value={formData.proveedor_id} onChange={handleChange} required>
                                    <option value="">Seleccione...</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="field">
                                <span className="field-label">Título *</span>
                                <input name="titulo" className="input" placeholder="Ej: Pedido de gaseosas" value={formData.titulo} onChange={handleChange} required />
                            </label>

                            <label className="field">
                                <span className="field-label">Tipo</span>
                                <select name="tipo" className="input" value={formData.tipo} onChange={handleChange}>
                                    <option value="pedido">Pedido</option>
                                    <option value="plazo">Plazo / Vencimiento</option>
                                    <option value="idea">Idea / Proyecto</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </label>

                            <label className="field">
                                <span className="field-label">Planificación (Sprint / Fase)</span>
                                <select name="sprint_id" className="input" value={formData.sprint_id} onChange={handleChange}>
                                    <option value="">Sin Sprint / Ideas Sueltas</option>
                                    {sprints.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </label>

                            {formData.tipo === 'idea' && (
                                <label className="field">
                                    <span className="field-label">Prioridad</span>
                                    <select name="prioridad" className="input" value={formData.prioridad} onChange={handleChange}>
                                        <option value="alta">🔥 Alta</option>
                                        <option value="media">⭐ Media</option>
                                        <option value="baja">☕ Baja</option>
                                    </select>
                                </label>
                            )}

                            {formData.tipo === 'idea' && (
                                <label className="field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span className="field-label">¿Depende de nosotros?</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                        <input 
                                            type="checkbox" 
                                            name="depende_de_nosotros"
                                            checked={formData.depende_de_nosotros} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, depende_de_nosotros: e.target.checked }))} 
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                                        />
                                        <span style={{ fontSize: '0.9rem', color: formData.depende_de_nosotros ? 'var(--text)' : 'var(--text-muted)' }}>
                                            {formData.depende_de_nosotros ? "Sí, está en nuestra cancha" : "No, esperando proveedor"}
                                        </span>
                                    </div>
                                </label>
                            )}

                            <label className="field">
                                <span className="field-label">{formData.tipo === 'idea' ? 'Fecha de Lanzamiento (Aparecerá en el Calendario)' : 'Inicio (Fecha Pedido)'}</span>
                                <input name="fecha_inicio" type="datetime-local" className="input premium-input" value={formData.fecha_inicio} onChange={handleChange} />
                            </label>

                            <label className="field">
                                <span className="field-label">Fin (Deadline Estimado)</span>
                                <input name="fecha_fin" type="datetime-local" className="input" value={formData.fecha_fin} onChange={handleChange} />
                            </label>

                            <label className="field">
                                <span className="field-label">Cierre Real</span>
                                <input name="fecha_real_cierre" type="datetime-local" className="input" value={formData.fecha_real_cierre} onChange={handleChange} />
                            </label>

                            <label className="field">
                                <span className="field-label">Estado</span>
                                <select name="estado" className="input" value={formData.estado} onChange={handleChange}>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="completado">Completado / Recibido</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                            </label>
                        </div>

                        <label className="field">
                            <span className="field-label">Descripción</span>
                            <textarea name="descripcion" className="input" rows="2" value={formData.descripcion} onChange={handleChange}></textarea>
                        </label>

                        {eventId && (
                            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>📝 Historial / Avances</div>

                                <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', marginBottom: '10px' }}>
                                    {historialLoading ? <div className="muted">Cargando...</div> : history.length === 0 ? <div className="muted text-center" style={{ fontSize: '0.85rem' }}>Sin historial.</div> : history.map(h => (
                                        <div key={h.id} style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                                            <div className="muted" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                                                {new Date(h.created_at).toLocaleString('es-AR')} {h.usuario_email && <span>• <strong>{h.usuario_email.split('@')[0]}</strong></span>}
                                            </div>
                                            <div style={{ fontSize: '0.9rem' }}>{h.comentario}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="input" placeholder="Escribe una nota de avance aquí..." value={historyInput} onChange={(e) => setHistoryInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHistory())} />
                                    <Button variant="primary" type="button" onClick={handleAddHistory}>Enviar</Button>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions" style={{ marginTop: '24px' }}>
                            {eventId && (
                                <Button variant="secondary" type="button" onClick={handleDelete} style={{ color: 'var(--danger)', marginRight: 'auto' }} disabled={loading}>
                                    Eliminar
                                </Button>
                            )}
                            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
