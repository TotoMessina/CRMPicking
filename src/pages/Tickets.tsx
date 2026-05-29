import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { Search, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface Ticket {
    id: number;
    asunto: string | null;
    mensaje: string | null;
    nombre: string | null;
    email: string | null;
    telefono: string | null;
    tipo: string | null;
    estado: string;
    created_at: string | null;
}

export default function Tickets() {
    const { t, i18n } = useTranslation();
    const { isDemoMode } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Pendiente');

    // Modal state
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, [statusFilter]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'todos') {
                query = query.eq('estado', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTickets((data as Ticket[]) || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            toast.error(t('tickets.toast.load_error'));
        } finally {
            setLoading(false);
        }
    };

    const filteredTickets = useMemo(() => {
        if (!searchTerm) return tickets;
        const lower = searchTerm.toLowerCase();
        return tickets.filter(t =>
            (t.asunto && t.asunto.toLowerCase().includes(lower)) ||
            (t.email && t.email.toLowerCase().includes(lower)) ||
            (t.nombre && t.nombre.toLowerCase().includes(lower))
        );
    }, [tickets, searchTerm]);

    const handleOpenModal = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setNewStatus(ticket.estado || 'Pendiente');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTicket(null);
    };

    const handleSaveStatus = async () => {
        if (!selectedTicket) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ estado: newStatus })
                .eq('id', selectedTicket.id);

            if (error) throw error;

            toast.success(t('tickets.toast.status_updated'));
            handleCloseModal();
            fetchTickets();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(t('tickets.toast.status_error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedTicket) return;
        if (!window.confirm(t('tickets.confirm_delete'))) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('tickets')
                .delete()
                .eq('id', selectedTicket.id);

            if (error) throw error;

            toast.success(t('tickets.toast.delete_success'));
            handleCloseModal();
            fetchTickets();
        } catch (error) {
            console.error('Error deleting ticket:', error);
            toast.error(t('tickets.toast.delete_error'));
        } finally {
            setSaving(false);
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'Pendiente') return '#ef4444'; // Red
        if (status === 'En Proceso') return '#f59e0b'; // Amber
        if (status === 'Resuelto') return '#10b981'; // Green
        return 'var(--text-muted)';
    };

    return (
        <div className="container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>{t('tickets.title')}</h1>
                    <p className="muted" style={{ margin: '4px 0 0 0' }}>{t('tickets.subtitle')}</p>
                </div>
                <Button variant="secondary" onClick={fetchTickets}>🔄 {t('common.actions.refresh')}</Button>
            </header>

            <section className="controls" style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            className="input"
                            placeholder={t('tickets.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', paddingLeft: '38px' }}
                        />
                    </div>
                    <select
                        className="input"
                        style={{ width: 'auto' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="todos">{t('tickets.filters.all')}</option>
                        <option value="Pendiente">{t('tickets.status.pending')}</option>
                        <option value="En Proceso">{t('tickets.status.in_progress')}</option>
                        <option value="Resuelto">{t('tickets.status.resolved')}</option>
                    </select>
                </div>
            </section>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <p className="muted">{t('common.loading')}</p>
                </div>
            ) : filteredTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <p className="muted">{t('tickets.no_tickets')}</p>
                </div>
            ) : (
                <div className="bento-grid">
                    {filteredTickets.map(ticket => (
                        <div key={ticket.id} className="bento-card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span className="badge" style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border)' }}>
                                    {ticket.tipo || t('common.general')}
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: getStatusColor(ticket.estado) }}>
                                    {ticket.estado === 'Pendiente' ? t('tickets.status.pending') : 
                                     ticket.estado === 'En Proceso' ? t('tickets.status.in_progress') : 
                                     ticket.estado === 'Resuelto' ? t('tickets.status.resolved') : ticket.estado}
                                </span>
                            </div>

                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{ticket.asunto || `(${t('tickets.no_subject')})`}</h3>

                            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '16px', flex: 1 }}>
                                {ticket.mensaje ? (ticket.mensaje.length > 80 ? ticket.mensaje.substring(0, 80) + '...' : ticket.mensaje) : ''}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: 'auto' }}>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <div><strong>{ticket.nombre || t('common.anonymous')}</strong></div>
                                    <div className="muted">{ticket.created_at ? format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm') : ''}</div>
                                </div>
                                <Button variant="secondary" className="btn-sm" onClick={() => handleOpenModal(ticket)}>{t('common.actions.view')}</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Ver Ticket */}
            {isModalOpen && selectedTicket && (
                <div className="modal is-open">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <button className="modal-close" onClick={handleCloseModal}><X size={24} /></button>
                        <div className="modal-content-header" style={{ padding: 0, border: 'none', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedTicket.asunto || `(${t('tickets.no_subject')})`}</h2>
                        </div>

                         <div className="modal-body" style={{ padding: '16px 0' }}>
                            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px' }}>
                                <p style={{ margin: '0 0 4px 0' }}><strong>{t('tickets.modal.from')}:</strong> {selectedTicket.nombre || t('common.anonymous')} ({selectedTicket.email || t('tickets.modal.no_email')})</p>
                                <p style={{ margin: '0 0 4px 0' }}><strong>{t('tickets.modal.tel')}:</strong> <span className="muted">{selectedTicket.telefono || t('common.not_specified')}</span></p>
                                <p style={{ margin: 0 }}>
                                    <span className="badge" style={{ marginRight: '8px' }}>{selectedTicket.tipo || t('common.general')}</span>
                                    <span style={{ fontSize: '0.85rem' }} className="muted">
                                        {selectedTicket.created_at ? format(new Date(selectedTicket.created_at), "dd 'de' MMMM, yyyy HH:mm", { locale: i18n.language === 'en' ? enUS : es }) : ''}
                                    </span>
                                </p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>{t('tickets.modal.message')}:</label>
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    {selectedTicket.mensaje || `(${t('tickets.modal.no_message')})`}
                                </div>
                            </div>

                            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '20px 0' }} />

                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>{t('tickets.modal.change_status')}:</label>
                                <select
                                    className="input"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    style={{ width: '100%', maxWidth: '300px' }}
                                >
                                    <option value="Pendiente">{t('tickets.status.pending')}</option>
                                    <option value="En Proceso">{t('tickets.status.in_progress')}</option>
                                    <option value="Resuelto">{t('tickets.status.resolved')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                            <div>
                                {!isDemoMode && (
                                    <Button variant="secondary" onClick={handleDelete} disabled={saving} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                                        <Trash2 size={16} style={{ marginRight: '8px' }} /> {t('common.actions.delete')}
                                    </Button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>{t('common.actions.close')}</Button>
                                <Button variant="primary" onClick={handleSaveStatus} disabled={saving}>
                                    {saving ? t('common.loading') : t('common.actions.save_changes')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
