import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Moon, Sun } from 'lucide-react';

export default function Login() {
    const { user, signIn } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [formMode, setFormMode] = useState('login'); // 'login', 'signup', 'recovery'
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: 'info' });

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Check if we already have a session, if so, redirect
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Listen for recovery state from URL hash (Supabase default behavior)
    useEffect(() => {
        if (window.location.hash && window.location.hash.includes("type=recovery")) {
            setFormMode('recovery');
            setMsg({ text: 'Modo recuperación de contraseña', type: 'info' });
        }
    }, []);

    const showMessage = (text, type = 'info') => {
        setMsg({ text, type });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        showMessage('Ingresando...');

        try {
            await signIn(email, password);
            // Let AuthContext handle the redirect by triggering the useEffect above
        } catch (error) {
            let errorText = "Error al ingresar: " + error.message;
            if (error.message.includes("Invalid login credentials")) {
                errorText = "Credenciales incorrectas. Verificá tu email y contraseña.";
            } else if (error.message.includes("Email not confirmed")) {
                errorText = "Tu email no ha sido confirmado. Revisá tu bandeja de entrada.";
            }
            showMessage(errorText, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        setLoading(true);
        showMessage('Validando código...');

        try {
            // 1. Check RPC
            const { data: isValid, error: rpcError } = await supabase.rpc('check_invite_code', { lookup_code: code });

            if (rpcError || !isValid) {
                showMessage('Error validando código o código inválido.', 'error');
                setLoading(false);
                return;
            }

            showMessage('Creando usuario...');

            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { display_name: name } }
            });

            if (authError) throw authError;

            if (data.session) {
                showMessage('¡Cuenta creada! Redirigiendo...', 'success');
                setTimeout(() => navigate('/'), 1500);
            } else {
                showMessage('Cuenta creada. Por favor verificá tu email para continuar.', 'success');
            }
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetRequest = async () => {
        if (!email) {
            showMessage('Ingresá tu Email para recuperar la contraseña.', 'error');
            return;
        }

        setLoading(true);
        showMessage('Enviando email...');

        try {
            const redirectUrl = window.location.href.split('?')[0].split('#')[0];
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

            if (error) throw error;
            showMessage('Listo. Revisá tu email para continuar.', 'success');
        } catch (error) {
            showMessage('Error enviando recuperación: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNewPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        setLoading(true);
        showMessage('Actualizando contraseña...');

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            showMessage('¡Contraseña actualizada! Ingresando...', 'success');
            setTimeout(() => navigate('/'), 1500);
        } catch (error) {
            showMessage('Error al actualizar: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-split-layout">
            {/* Left: Brand Panel */}
            <div className="login-brand-panel">
                <div className="brand-content">
                    <div className="brand-logo">PU</div>
                    <h1>PickingUp</h1>
                    <p>Buen dia Ruben</p>
                </div>
            </div>

            {/* Right: Form Panel */}
            <div className="login-form-panel">
                <div className="login-form-container">
                    <div className="login-header">
                        <h2>Bienvenido</h2>
                        <p className="muted">Ingresá tus credenciales para continuar</p>
                    </div>

                    {formMode === 'login' && (
                        <form onSubmit={handleLogin} className="form-stack">
                            <div className="field">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email" type="email" autoComplete="email" required
                                    placeholder="tu@email.com"
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="password">Contraseña</label>
                                <input
                                    id="password" type="password" autoComplete="current-password" required
                                    placeholder="••••••••"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="form-actions-stack">
                                <button className="btn-primario btn-block" type="submit" disabled={loading}>
                                    {loading ? 'Cargando...' : 'Ingresar'}
                                </button>
                                <button className="btn-text" type="button" onClick={handleResetRequest} disabled={loading}>
                                    Olvidé mi contraseña
                                </button>
                            </div>

                            <div className="signup-prompt">
                                <span className="muted">¿No tenés cuenta?</span>
                                <button className="btn-text" type="button" style={{ marginLeft: '5px' }} onClick={() => { setFormMode('signup'); setMsg({ text: '', type: '' }) }}>
                                    Crear cuenta
                                </button>
                            </div>
                        </form>
                    )}

                    {formMode === 'signup' && (
                        <form onSubmit={handleSignup} className="form-stack">
                            <div className="field">
                                <label htmlFor="reg_display_name">Nombre y Apellido</label>
                                <input id="reg_display_name" type="text" placeholder="Tu nombre real" required value={name} onChange={(e) => setName(e.target.value)} />
                            </div>

                            <div className="field">
                                <label htmlFor="reg_email">Email</label>
                                <input id="reg_email" type="email" autoComplete="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>

                            <div className="field">
                                <label htmlFor="reg_password">Contraseña</label>
                                <input id="reg_password" type="password" autoComplete="new-password" required placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>

                            <div className="field">
                                <label htmlFor="reg_code">Código de Invitación</label>
                                <input id="reg_code" type="text" placeholder="Código de empresa" required value={code} onChange={(e) => setCode(e.target.value)} />
                            </div>

                            <div className="form-actions-stack" style={{ marginTop: '12px' }}>
                                <button className="btn-primario btn-block" type="submit" disabled={loading}>Registrarme</button>
                                <button className="btn-secundario btn-block" type="button" onClick={() => { setFormMode('login'); setMsg({ text: '', type: '' }) }} disabled={loading}>
                                    Volver al Login
                                </button>
                            </div>
                        </form>
                    )}

                    {formMode === 'recovery' && (
                        <form onSubmit={handleSaveNewPassword} className="form-stack">
                            <div className="field">
                                <label htmlFor="new_password">Nueva Contraseña</label>
                                <input id="new_password" type="password" autoComplete="new-password" required placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                            </div>

                            <div className="form-actions-stack" style={{ marginTop: '12px' }}>
                                <button className="btn-primario btn-block" type="submit" disabled={loading}>Guardar Contraseña</button>
                            </div>
                        </form>
                    )}

                    {msg.text && (
                        <p className="text-center" style={{ marginTop: '16px', minHeight: '20px', color: msg.type === 'error' ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {msg.text}
                        </p>
                    )}

                    <div className="theme-toggle-fixed">
                        <button className="btn-icon" type="button" title="Cambiar tema" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
