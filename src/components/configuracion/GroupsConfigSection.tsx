import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useGrupos, useCreateGrupo, useUpdateGrupo, useDeleteGrupo } from '../../hooks/useGrupos';
import { Button } from '../ui/Button';
import { Tag, Edit2, Trash2 } from 'lucide-react';

interface Grupo {
    id: string;
    nombre: string;
    color: string;
}

const PRESET_COLORS = [
    '#0c0c0c', '#ef4444', '#10b981', '#f59e0b', 
    '#1a1a1a', '#ec4899', '#06b6d4', '#4b5563'
];

export function GroupsConfigSection() {
    const { t } = useTranslation();
    const { empresaActiva, isDemoMode } = useAuth();
    const askConfirm = useConfirm();

    const { data: grupos = [], isLoading: loadingGrupos } = useGrupos(empresaActiva?.id as any) as { data: Grupo[], isLoading: boolean };
    const createGrupoMutation = useCreateGrupo();
    const updateGrupoMutation = useUpdateGrupo();
    const deleteGrupoMutation = useDeleteGrupo();

    const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
    const [grupoForm, setGrupoForm] = useState({ nombre: '', color: '#0c0c0c' });

    const handleSaveGrupo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grupoForm.nombre.trim() || !empresaActiva?.id) return;
        
        if (editingGrupo) {
            updateGrupoMutation.mutate({ 
                id: editingGrupo.id, 
                empresaId: empresaActiva.id, 
                ...grupoForm 
            }, {
                onSuccess: () => {
                    setEditingGrupo(null);
                    setGrupoForm({ nombre: '', color: '#0c0c0c' });
                }
            });
        } else {
            createGrupoMutation.mutate({ 
                empresaId: empresaActiva.id, 
                ...grupoForm 
            }, {
                onSuccess: () => {
                    setGrupoForm({ nombre: '', color: '#0c0c0c' });
                }
            });
        }
    };

    const handleDeleteGrupo = async (id: string) => {
        if (isDemoMode || !empresaActiva?.id) return;
        const confirmed = await askConfirm({
            title: t('settings.delete_group_title', { defaultValue: 'Eliminar grupo' }),
            message: t('settings.confirm_delete_group', { defaultValue: '¿Eliminar este grupo? Los clientes ya no estarán asociados a él.' }),
            confirmText: t('common.actions.delete', { defaultValue: 'Eliminar' }),
            cancelText: t('common.actions.cancel', { defaultValue: 'Cancelar' }),
            variant: 'danger'
        });
        if (!confirmed) return;
        deleteGrupoMutation.mutate({ id, empresaId: empresaActiva.id });
    };

    return (
        <section className="config-section">
            <div className="config-section-header">
                <div className="header-title-with-icon">
                    <div className="header-icon-container">
                        <Tag size={20} />
                    </div>
                     <div>
                        <h2>{t('settings.groups')}</h2>
                        <p className="config-section-header-desc">{t('settings.groups_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="config-section-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <form onSubmit={handleSaveGrupo} className="group-form">
                    <div className="group-form-row">
                        <div className="group-form-field">
                            <label>{t('settings.group_name')}</label>
                            <input 
                                className="input" 
                                placeholder={t('settings.group_name_placeholder') as string} 
                                value={grupoForm.nombre}
                                onChange={e => setGrupoForm({ ...grupoForm, nombre: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="group-form-field width-fixed">
                            <label>{t('settings.color')}</label>
                            <div className="group-form-colors-grid">
                                {PRESET_COLORS.map(c => (
                                    <button 
                                        key={c}
                                        type="button"
                                        onClick={() => setGrupoForm({ ...grupoForm, color: c })}
                                        className={`group-color-preset-btn ${grupoForm.color === c ? 'selected' : ''}`}
                                        style={{ background: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="group-form-actions">
                        <Button type="submit" variant="primary" style={{ flex: 1 }}>
                            {editingGrupo ? t('settings.update_group') : t('settings.create_group')}
                        </Button>
                        {editingGrupo && (
                            <Button variant="secondary" onClick={() => { setEditingGrupo(null); setGrupoForm({ nombre: '', color: '#0c0c0c' }); }}>
                                {t('common.cancel')}
                            </Button>
                        )}
                    </div>
                </form>

                <div className="groups-grid">
                    {loadingGrupos ? (
                        <p className="muted">{t('common.loading')}</p>
                    ) : grupos.length === 0 ? (
                        <p className="group-card-empty">
                            {t('settings.no_groups')}
                        </p>
                    ) : grupos.map(g => (
                        <div key={g.id} className="group-card">
                            <div className="group-card-indicator">
                                <div className="group-card-indicator-circle" style={{ background: g.color }} />
                                <span>{g.nombre}</span>
                            </div>
                            <div className="group-card-actions">
                                <button 
                                    onClick={() => { setEditingGrupo(g); setGrupoForm({ nombre: g.nombre, color: g.color }); }}
                                >
                                    <Edit2 size={14} />
                                </button>
                                {!isDemoMode && (
                                    <button 
                                        onClick={() => handleDeleteGrupo(g.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
