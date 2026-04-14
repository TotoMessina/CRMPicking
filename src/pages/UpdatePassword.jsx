import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Lock } from 'lucide-react';

export default function UpdatePassword() {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: 'info' });
    const [sessionChecked, setSessionChecked] = useState(false);

    useEffect(() => {
        // Verificar si la URL trae el hash de acceso recovery de Supabase
        // Supabase interceptará el hash (access_token) y establecerá una sesión local automáticamente
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session) {
                setSessionChecked(true);
            }
        });

        // Timeout fall-back checking
        setTimeout(() => {
            setSessionChecked(true);
        }, 1500);
    }, []);

    const showMessage = (text, type = 'info') => {
        setMsg({ text, type });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Las contraseñas no coinciden.', 'error');
            return;
        }

        setLoading(true);
        showMessage('Actualizando tu contraseña...', 'info');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            showMessage('¡Contraseña actualizada con éxito!', 'success');
            
            // Redirect to dashboard or login
            setTimeout(() => {
                navigate('/');
            }, 2000);
            
        } catch (error) {
            showMessage('Error al actualizar la contraseña: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper" style={{ minHeight: '100dvh' }}>
            <div className="login-orb-1"></div>
            <div className="login-orb-2"></div>

            <div className="login-glass-card" style={{ maxWidth: '400px' }}>
                <div className="login-brand-header">
                    <img 
                        src="/logo-vertical.png" 
                        alt="Restablecer" 
                        style={{ height: '70px', width: 'auto', margin: '0 auto 24px', display: 'block', objectFit: 'contain' }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                    />
                    <div className="login-brand-logo" style={{ display: 'none' }}><Lock size={32} /></div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Nueva Contraseña</h1>
                    <p style={{ fontSize: '0.9rem' }}>Ingresá tu nueva clave de acceso seguro.</p>
                </div>

                {!sessionChecked ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <p className="muted">Validando enlace seguro...</p>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="form-stack">
                        <div className="field">
                            <label htmlFor="password">Escribí la Nueva Contraseña</label>
                            <input
                                id="password" type="password" required
                                placeholder="Mínimo 6 caracteres"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="confirm_password">Confirmá la Nueva Contraseña</label>
                            <input
                                id="confirm_password" type="password" required
                                placeholder="Repetir la contraseña"
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div className="form-actions-stack" style={{ marginTop: '24px' }}>
                            <button className="btn-primario btn-block" type="submit" disabled={loading} style={{ padding: '12px', fontSize: '1rem' }}>
                                {loading ? 'Guardando...' : 'Guardar y Entrar'}
                            </button>
                            <button className="btn-text" type="button" onClick={() => navigate('/login')} disabled={loading}>
                                Cancelar y volver al Login
                            </button>
                        </div>
                    </form>
                )}

                {msg.text && (
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : msg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: msg.type === 'error' ? 'var(--danger)' : msg.type === 'success' ? 'var(--success)' : 'var(--text-muted)' 
                    }}>
                        {msg.text}
                    </div>
                )}
            </div>
            
            <div className="theme-toggle-fixed" style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 50 }}>
                <button className="btn-icon" type="button" title="Cambiar tema" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </div>
    );
}
