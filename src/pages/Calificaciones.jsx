import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { Search, Star, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Calificaciones() {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [scoreFilter, setScoreFilter] = useState('todos');
    const [statusFilter, setStatusFilter] = useState('Nuevo');

    // Modal View State
    const [selectedRating, setSelectedRating] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [saving, setSaving] = useState(false);

    // Modal Create State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        nombre_local: '',
        puntaje: 5,
        aspecto: 'General',
        comentario: ''
    });

    useEffect(() => {
        fetchRatings();
    }, [scoreFilter, statusFilter]);

    const fetchRatings = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('calificaciones')
                .select('*')
                .order('created_at', { ascending: false });

            if (scoreFilter !== 'todos') query = query.eq('puntaje', scoreFilter);
            if (statusFilter !== 'todos') query = query.eq('estado', statusFilter);

            const { data, error } = await query;
            if (error) throw error;
            setRatings(data || []);
        } catch (error) {
            console.error('Error fetching ratings:', error);
            toast.error('Error al cargar calificaciones');
        } finally {
            setLoading(false);
        }
    };

    const filteredRatings = useMemo(() => {
        if (!searchTerm) return ratings;
        const lower = searchTerm.toLowerCase();
        return ratings.filter(r =>
            (r.nombre_local && r.nombre_local.toLowerCase().includes(lower)) ||
            (r.comentario && r.comentario.toLowerCase().includes(lower))
        );
    }, [ratings, searchTerm]);

    // View Modal Handlers
    const handleOpenViewModal = (item) => {
        setSelectedRating(item);
        setNewStatus(item.estado || 'Nuevo');
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedRating(null);
    };

    const handleSaveStatus = async () => {
        if (!selectedRating) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('calificaciones')
                .update({ estado: newStatus })
                .eq('id', selectedRating.id);

            if (error) throw error;

            toast.success('Estado actualizado');
            handleCloseViewModal();
            fetchRatings();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Error al actualizar estado');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRating) return;
        if (!window.confirm('¿Eliminar calificación permanentemente?')) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('calificaciones')
                .delete()
                .eq('id', selectedRating.id);

            if (error) throw error;

            toast.success('Calificación eliminada');
            handleCloseViewModal();
            fetchRatings();
        } catch (error) {
            console.error('Error deleting rating:', error);
            toast.error('Error al eliminar calificación');
        } finally {
            setSaving(false);
        }
    };

    // Create Modal Handlers
    const handleOpenCreateModal = () => {
        setCreateForm({ nombre_local: '', puntaje: 5, aspecto: 'General', comentario: '' });
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('calificaciones')
                .insert([{
                    nombre_local: createForm.nombre_local,
                    puntaje: parseInt(createForm.puntaje),
                    aspecto: createForm.aspecto,
                    comentario: createForm.comentario,
                    estado: 'Nuevo',
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            toast.success('Calificación creada');
            setIsCreateModalOpen(false);
            fetchRatings();
        } catch (error) {
            console.error('Error creating rating:', error);
            toast.error('Error al crear calificación');
        } finally {
            setSaving(false);
        }
    };

    const renderStars = (count) => {
        return (
            <div style={{ color: '#f59e0b', fontSize: '1.1em', display: 'flex', alignItems: 'center' }}>
                {'⭐'.repeat(count)}
                <span className="muted" style={{ fontSize: '0.8em', marginLeft: '6px' }}>({count}/5)</span>
            </div>
        );
    };

    const getStatusColor = (status) => {
        if (status === 'Nuevo') return '#3b82f6'; // Blue
        if (status === 'Leído') return '#10b981'; // Green
        return '#9ca3af'; // Gray for Archivado or other
    };

    return (
        <div className="container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Calificaciones y Feedback</h1>
                    <p className="muted" style={{ margin: '4px 0 0 0' }}>Puntuaciones recibidas de los kioscos.</p>
                </div>
                <Button variant="secondary" onClick={fetchRatings}>🔄 Actualizar</Button>
            </header>

            <section className="controls" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select
                        className="input"
                        value={scoreFilter}
                        onChange={(e) => setScoreFilter(e.target.value)}
                    >
                        <option value="todos">Todos los puntajes</option>
                        <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                        <option value="4">⭐⭐⭐⭐ (4)</option>
                        <option value="3">⭐⭐⭐ (3)</option>
                        <option value="2">⭐⭐ (2)</option>
                        <option value="1">⭐ (1)</option>
                    </select>
                    <select
                        className="input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="Nuevo">Nuevos</option>
                        <option value="Leído">Leídos</option>
                        <option value="Archivado">Archivados</option>
                    </select>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar kiosco..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '38px', minWidth: '250px' }}
                        />
                    </div>
                </div>
                <Button variant="primary" onClick={handleOpenCreateModal}>+ Nueva Calificación</Button>
            </section>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <p className="muted">Cargando calificaciones...</p>
                </div>
            ) : filteredRatings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <p className="muted">No se encontraron calificaciones.</p>
                </div>
            ) : (
                <div className="bento-grid">
                    {filteredRatings.map(r => (
                        <div key={r.id} className="bento-card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span className="badge" style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border)' }}>
                                    {r.aspecto || 'General'}
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: getStatusColor(r.estado) }}>
                                    {r.estado}
                                </span>
                            </div>

                            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                Atendido por: <strong>{r.atendido_por || '-'}</strong>
                            </div>

                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{r.nombre_local || 'Kiosco'}</h3>

                            <div style={{ marginBottom: '8px' }}>{renderStars(r.puntaje)}</div>

                            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '16px', fontStyle: 'italic', flex: 1 }}>
                                "{r.comentario ? (r.comentario.length > 60 ? r.comentario.substring(0, 60) + '...' : r.comentario) : 'Sin comentario'}"
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: 'auto' }}>
                                <div style={{ fontSize: '0.8rem' }} className="muted">
                                    {r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : ''}
                                </div>
                                <Button variant="secondary" className="btn-sm" onClick={() => handleOpenViewModal(r)}>Ver Detalle</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Ver Calificación */}
            {isViewModalOpen && selectedRating && (
                <div className="modal active">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <button className="modal-close" onClick={handleCloseViewModal}><X size={24} /></button>
                        <div className="modal-header" style={{ padding: 0, border: 'none' }}>
                            <h2>Detalle de Calificación</h2>
                        </div>

                        <div className="modal-body" style={{ padding: '16px 0' }}>
                            <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-body)', borderRadius: '8px' }}>
                                <p style={{ margin: '0 0 8px 0' }}><strong>Kiosco:</strong> {selectedRating.nombre_local || 'Desconocido'}</p>
                                <div style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong>Puntaje:</strong> {renderStars(selectedRating.puntaje)}
                                </div>
                                <p style={{ margin: '0 0 8px 0' }}><strong>Aspecto:</strong> <span className="badge">{selectedRating.aspecto || 'General'}</span></p>
                                <p style={{ margin: '0 0 8px 0' }}><strong>Atendido por:</strong> {selectedRating.atendido_por || '-'}</p>
                                <p style={{ margin: 0, fontSize: '0.85rem' }} className="muted">
                                    {selectedRating.created_at ? format(new Date(selectedRating.created_at), "dd 'de' MMMM, yyyy HH:mm", { locale: es }) : ''}
                                </p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Comentario:</label>
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontStyle: 'italic', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    {selectedRating.comentario || '(Sin comentario)'}
                                </div>
                            </div>

                            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '20px 0' }} />

                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Estado:</label>
                                <select
                                    className="input"
                                    style={{ width: '100%' }}
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    <option value="Nuevo">Nuevo</option>
                                    <option value="Leído">Leído</option>
                                    <option value="Archivado">Archivado</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                            <Button variant="secondary" onClick={handleDelete} disabled={saving} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                                <Trash2 size={16} style={{ marginRight: '8px' }} /> Eliminar
                            </Button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" onClick={handleCloseViewModal} disabled={saving}>Cerrar</Button>
                                <Button variant="primary" onClick={handleSaveStatus} disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Calificación */}
            {isCreateModalOpen && (
                <div className="modal active">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <button className="modal-close" onClick={() => setIsCreateModalOpen(false)}><X size={24} /></button>
                        <h2 style={{ marginTop: 0 }}>Nueva Calificación</h2>

                        <form onSubmit={handleCreateSubmit} style={{ marginTop: '16px' }}>
                            <div className="field" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre del Kiosco/Cliente *</label>
                                <input
                                    type="text"
                                    className="input"
                                    required
                                    placeholder="Ej: Kiosco Pepe"
                                    style={{ width: '100%' }}
                                    value={createForm.nombre_local}
                                    onChange={e => setCreateForm({ ...createForm, nombre_local: e.target.value })}
                                />
                            </div>

                            <div className="field" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Puntaje *</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {[1, 2, 3, 4, 5].map(score => (
                                        <label key={score} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="newScore"
                                                value={score}
                                                checked={createForm.puntaje === score}
                                                onChange={() => setCreateForm({ ...createForm, puntaje: score })}
                                            />
                                            {score}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="field" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Aspecto (Opcional)</label>
                                <select
                                    className="input"
                                    style={{ width: '100%' }}
                                    value={createForm.aspecto}
                                    onChange={e => setCreateForm({ ...createForm, aspecto: e.target.value })}
                                >
                                    <option value="General">General</option>
                                    <option value="Atención">Atención</option>
                                    <option value="Limpieza">Limpieza</option>
                                    <option value="Stock">Stock</option>
                                    <option value="Precio">Precio</option>
                                </select>
                            </div>

                            <div className="field" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Comentario</label>
                                <textarea
                                    className="input"
                                    rows="3"
                                    style={{ width: '100%', resize: 'vertical' }}
                                    value={createForm.comentario}
                                    onChange={e => setCreateForm({ ...createForm, comentario: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)} disabled={saving}>Cancelar</Button>
                                <Button type="submit" variant="primary" disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
