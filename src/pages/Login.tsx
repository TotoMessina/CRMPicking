import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Rocket } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

/**
 * Login Page
 */
export default function Login() {
    const { user, signIn } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { tenantConfig } = useTenant();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' }>({ text: '', type: 'info' });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const showMessage = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
        setMsg({ text, type });
    };

    const handleLogin = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        showMessage(t('login.authenticating'));

        try {
            await signIn(email, password);
        } catch (error: any) {
            let errorText = t('login.invalid_credentials');
            if (error.message.includes("Email not confirmed")) {
                errorText = t('login.email_not_confirmed');
            }
            showMessage(errorText, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = () => {
        const demoEmail = 'test1@crm.com'; 
        const demoPass = 'Test1234'; 
        
        setEmail(demoEmail);
        setPassword(demoPass);
        
        showMessage(t('login.demo_accessing'), 'info');
        
        setTimeout(() => {
            setLoading(true);
            signIn(demoEmail, demoPass).catch(err => {
                showMessage(err.message, 'error');
                setLoading(false);
            });
        }, 800);
    };

    return (
        <div className="login-page-wrapper" style={{ minHeight: '100dvh' }}>
            <div className="login-orb-1"></div>
            <div className="login-orb-2"></div>

            <div className="login-glass-card">
                <div className="login-brand-header">
                    <img 
                        src={tenantConfig.app.logoUrl} 
                        alt={tenantConfig.app.name} 
                        style={{ height: '70px', width: 'auto', margin: '0 auto 24px', display: 'block', objectFit: 'contain' }} 
                        onError={(e) => { 
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none'; 
                            if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                        }}
                    />
                    <div className="login-brand-logo" style={{ display: 'none' }}>{tenantConfig.app.shortName.substring(0, 2).toUpperCase()}</div>
                    <h1>{t('login.welcome_title')}</h1>
                    <p>{t('login.welcome_subtitle')}</p>
                </div>

                <form onSubmit={handleLogin} className="form-stack">
                    <div className="field">
                        <label htmlFor="email">{t('login.email')}</label>
                        <input
                            id="email" type="email" autoComplete="email" required
                            placeholder="tu@email.com"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="password">{t('login.password')}</label>
                        <input
                            id="password" type="password" autoComplete="current-password" required
                            placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-actions-stack">
                        <button className="btn-primario btn-block" type="submit" disabled={loading}>
                            {loading ? t('common.loading') : t('login.enter')}
                        </button>
                        
                        <div style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('login.or_also')}</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                        </div>

                        <button 
                            className="btn-secundario btn-block" 
                            type="button" 
                            onClick={handleDemoLogin} 
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
                        >
                            <Rocket size={18} /> {t('login.demo_login')}
                        </button>
                    </div>
                </form>

                {msg.text && (
                    <p className="text-center" style={{ marginTop: '16px', minHeight: '20px', color: msg.type === 'error' ? 'var(--danger)' : msg.type === 'success' ? 'var(--success)' : 'var(--text-muted)' }}>
                        {msg.text}
                    </p>
                )}
            </div>
            
            <div className="theme-toggle-fixed" style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 50 }}>
                <button className="btn-icon" type="button" title={t('common.change_theme')} onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </div>
    );
}
