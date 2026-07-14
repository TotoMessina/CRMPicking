import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Settings2 } from 'lucide-react';

import '../styles/configuracion.css';

// Subcomponents
import { LanguageSection } from '../components/configuracion/LanguageSection';
import { ProfileAvatarSection } from '../components/configuracion/ProfileAvatarSection';
import { ProfileNameSection } from '../components/configuracion/ProfileNameSection';
import { PasswordFormSection } from '../components/configuracion/PasswordFormSection';
import { ReportConfigSection } from '../components/configuracion/ReportConfigSection';
import { GroupsConfigSection } from '../components/configuracion/GroupsConfigSection';
import { MaintenanceSection } from '../components/configuracion/MaintenanceSection';

export default function Configuracion() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { role } = useAuth();

    return (
        <div className="config-container">
            <header className="config-header">
                <h1>{t('settings.account_config')}</h1>
                <p className="config-header-desc">{t('settings.account_config_desc')}</p>
            </header>

            <div className="config-sections-wrapper">

                {/* ── IDIOMA ─────────────────────────────────── */}
                <LanguageSection />

                {/* ── GESTIÓN DE PIPELINE ────────────────────── */}
                {(role === 'super-admin' || role === 'admin') && (
                    <section className="config-section special-section">
                        <div className="config-section-header no-border special-header-layout">
                            <div className="header-title-with-icon">
                                <div className="header-icon-container">
                                    <Settings2 size={24} />
                                </div>
                                <div>
                                    <h2 className="bold-title">{t('menu.groups.pipeline', { defaultValue: 'Misión y Pipeline' })}</h2>
                                    <p className="config-section-header-desc">{t('settings.pipeline_desc', { defaultValue: 'Personalizá los estados y etapas de tus clientes.' })}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate('/configuracion/pipeline')}
                                className="btn-primary"
                                style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: 700 }}
                            >
                                {t('settings.configure_stages', { defaultValue: 'CONFIGURAR ETAPAS' })}
                            </button>
                        </div>
                    </section>
                )}

                {/* ── FOTO DE PERFIL ──────────────────────────── */}
                <ProfileAvatarSection />

                {/* ── PERFIL ──────────────────────────────────── */}
                <ProfileNameSection />

                {/* ── CONTRASEÑA ──────────────────────────────── */}
                <PasswordFormSection />

                {/* ── REPORTES AUTOMÁTICOS ──────────────────── */}
                <ReportConfigSection />

                {/* ── GRUPOS DE CLIENTES ─────────────────────── */}
                <GroupsConfigSection />

                {/* ── MANTENIMIENTO ───────────────────────────── */}
                <MaintenanceSection />

            </div>
        </div>
    );
}
