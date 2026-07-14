import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, SUPABASE_URL } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Mail, Plus, X, Send, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportRecipient {
    id: string;
    empresa_id: string;
    email: string;
    activo: boolean;
}

export function ReportConfigSection() {
    const { t } = useTranslation();
    const { empresaActiva, isDemoMode } = useAuth();

    const [reportRecipients, setReportRecipients] = useState<ReportRecipient[]>([]);
    const [newRecipientEmail, setNewRecipientEmail] = useState('');
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [sendingTestReport, setSendingTestReport] = useState(false);
    const [diaReporte, setDiaReporte] = useState(1);
    const [savingDia, setSavingDia] = useState(false);

    useEffect(() => {
        if (!empresaActiva?.id) return;
        setLoadingRecipients(true);
        
        supabase
            .from('report_recipients')
            .select('*')
            .eq('empresa_id', empresaActiva.id)
            .eq('activo', true)
            .then(({ data }: any) => {
                setReportRecipients((data as unknown as ReportRecipient[]) || []);
                setLoadingRecipients(false);
            });
            
        // Load company designated report day
        supabase
            .from('empresas')
            .select('dia_reporte')
            .eq('id', empresaActiva.id)
            .single()
            .then(({ data }: any) => {
                if (data?.dia_reporte !== undefined && data.dia_reporte !== null) {
                    setDiaReporte(parseInt(data.dia_reporte as string));
                }
            });
    }, [empresaActiva?.id]);

    const handleSaveDiaReporte = async (nuevoDia: string) => {
        if (!empresaActiva?.id) return;
        setSavingDia(true);
        try {
            const { error } = await supabase.rpc('update_dia_reporte', {
                p_empresa_id: empresaActiva.id,
                p_dia: Number(nuevoDia)
            });
            if (error) throw error;
            setDiaReporte(parseInt(nuevoDia));
            toast.success(t('settings.report_day_updated', { defaultValue: 'Día de envío actualizado' }));
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('Error updating report day:', err);
            }
            toast.error(t('settings.report_day_error', { defaultValue: 'Error al actualizar el día de reporte' }));
        } finally {
            setSavingDia(false);
        }
    };

    const handleAddRecipient = async () => {
        if (isDemoMode || !empresaActiva?.id) return;
        const email = newRecipientEmail.trim().toLowerCase();
        if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
            toast.error(t('settings.invalid_email', { defaultValue: 'Ingresá un email válido' }));
            return;
        }
        if (reportRecipients.some(r => r.email === email)) {
            toast.error(t('settings.email_exists', { defaultValue: 'Ese email ya está en la lista' }));
            return;
        }
        const { data, error } = await supabase
            .from('report_recipients')
            .insert({ empresa_id: empresaActiva.id, email })
            .select()
            .single();
        if (error) {
            toast.error(t('settings.recipient_error', { defaultValue: 'Error al agregar destinatario' }));
            return;
        }
        setReportRecipients(prev => [...prev, data as unknown as ReportRecipient]);
        setNewRecipientEmail('');
        toast.success(t('settings.recipient_added', { email, defaultValue: `${email} agregado como destinatario` }));
    };

    const handleRemoveRecipient = async (id: string, email: string) => {
        if (isDemoMode) return;
        await supabase.from('report_recipients').delete().eq('id', id);
        setReportRecipients(prev => prev.filter(r => r.id !== id));
        toast.success(t('settings.recipient_removed', { email, defaultValue: `${email} eliminado` }));
    };

    const handleSendTestReport = async () => {
        if (reportRecipients.length === 0) {
            toast.error(t('settings.no_recipients_error', { defaultValue: 'Agrega al menos un destinatario primero' }));
            return;
        }
        setSendingTestReport(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${SUPABASE_URL}/functions/v1/send-weekly-report`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({ test: true }),
                }
            );
            const result = await res.json();
            if (res.ok) {
                toast.success(t('settings.test_report_success', { defaultValue: '✅ Reporte de prueba enviado. Revisá tu casilla de correo.' }));
            } else {
                toast.error(t('settings.test_report_error', { error: result?.error || 'Error desconocido' }));
            }
        } catch (err) {
            toast.error(t('common.errors.load_error'));
        } finally {
            setSendingTestReport(false);
        }
    };

    return (
        <section className="config-section">
            <div className="config-section-header">
                <div className="header-title-with-icon">
                    <div className="header-icon-container blue-theme">
                        <Mail size={20} />
                    </div>
                     <div>
                        <h2>{t('settings.reports')}</h2>
                        <p className="config-section-header-desc">{t('settings.reports_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="config-section-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="recipient-notice-banner">
                    <Info size={18} className="recipient-notice-icon" />
                    <div className="recipient-notice-text">
                        <strong>{t('settings.reports_notice')}</strong><br />
                        1. {t('settings.reports_step_1')}<br />
                        2. {t('settings.reports_step_2')}<br />
                        3. {t('settings.reports_step_3')}<br />
                        4. {t('settings.reports_step_4')}
                    </div>
                </div>

                <div className="recipient-day-config">
                    <div className="recipient-day-info">
                        <label>{t('settings.report_day')}</label>
                        <p>{t('settings.report_day_desc')}</p>
                    </div>
                    <div className="recipient-day-select-wrapper">
                        <select 
                            className="input premium-input" 
                            value={diaReporte} 
                            onChange={e => handleSaveDiaReporte(e.target.value)}
                            disabled={savingDia || isDemoMode}
                        >
                            <option value={1}>{t('settings.days.1')}</option>
                            <option value={2}>{t('settings.days.2')}</option>
                            <option value={3}>{t('settings.days.3')}</option>
                            <option value={4}>{t('settings.days.4')}</option>
                            <option value={5}>{t('settings.days.5')}</option>
                            <option value={6}>{t('settings.days.6')}</option>
                            <option value={0}>{t('settings.days.0')}</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="recipient-list-label">{t('settings.recipients')}</label>
                    {loadingRecipients ? (
                        <div className="recipient-list-loading">{t('common.loading')}</div>
                    ) : reportRecipients.length === 0 ? (
                        <div className="recipient-list-empty">
                            {t('settings.no_recipients')}
                        </div>
                    ) : (
                        <div className="recipient-list">
                            {reportRecipients.map(r => (
                                <div key={r.id} className="recipient-item">
                                    <div className="recipient-item-info">
                                        <Mail size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                        <span>{r.email}</span>
                                    </div>
                                    {!isDemoMode && (
                                        <button
                                            onClick={() => handleRemoveRecipient(r.id, r.email)}
                                            className="recipient-delete-btn"
                                            title={t('common.delete')}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="recipient-add-form">
                    <input
                        type="email"
                        placeholder="gerente@empresa.com"
                        value={newRecipientEmail}
                        onChange={e => setNewRecipientEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddRecipient()}
                        className="recipient-add-input input premium-input"
                        id="report-recipient-email-input"
                    />
                    {!isDemoMode && (
                        <Button variant="primary" onClick={handleAddRecipient} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <Plus size={15} /> {t('settings.add_recipient')}
                        </Button>
                    )}
                </div>

                <div className="recipient-test-actions">
                    <Button
                        variant="secondary"
                        onClick={handleSendTestReport}
                        disabled={sendingTestReport || reportRecipients.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        id="send-test-report-btn"
                    >
                        <Send size={15} />
                        {sendingTestReport ? t('common.loading') : t('settings.test_report')}
                    </Button>
                    <p>
                        {t('settings.test_report_desc')}
                    </p>
                </div>
            </div>
        </section>
    );
}
