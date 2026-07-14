import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSection() {
    const { t, i18n } = useTranslation();

    return (
        <section className="config-section">
            <div className="config-section-header">
                <h2>{t('common.language', { defaultValue: 'Idioma' })}</h2>
                <p className="config-section-header-desc">{t('settings.language_desc', { defaultValue: 'Seleccioná tu idioma de preferencia.' })}</p>
            </div>
            <div className="config-section-body">
                <div className="lang-btn-group">
                    <button
                        onClick={() => i18n.changeLanguage('es')}
                        className={`lang-btn ${i18n.language.startsWith('es') ? 'active' : 'inactive'}`}
                    >
                        🇪🇸 Español
                    </button>
                    <button
                        onClick={() => i18n.changeLanguage('en')}
                        className={`lang-btn ${i18n.language.startsWith('en') ? 'active' : 'inactive'}`}
                    >
                        🇺🇸 English
                    </button>
                </div>
            </div>
        </section>
    );
}
