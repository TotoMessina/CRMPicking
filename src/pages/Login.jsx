import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Rocket } from 'lucide-react';

export default function Login() {
    const { user, signIn } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: 'info' });

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Check if we already have a session, if so, redirect
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const showMessage = (text, type = 'info') => {
        setMsg({ text, type });
    };

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        showMessage('Ingresando...');

        try {
            await signIn(email, password);
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

    const handleDemoLogin = () => {
        // Credenciales de prueba (Hardcoded solo para la demo pública)
        const demoEmail = 'test1@crm.com'; // Cambiar por el real si es distinto
        const demoPass = 'Test1234'; 
        
        setEmail(demoEmail);
        setPassword(demoPass);
        
        showMessage('Accediendo con cuenta Demo...', 'info');
        
        // Pequeño delay para que el usuario vea que se autocompletó
        setTimeout(() => {
            const fakeEvent = { preventDefault: () => {} };
            // Usamos las variables locales directamente para evitar problemas de race condition con el setState
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
                        src="/logo-vertical.png" 
                        alt="PickingUp CRM" 
                        style={{ height: '70px', width: 'auto', margin: '0 auto 24px', display: 'block', objectFit: 'contain' }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                    />
                    <div className="login-brand-logo" style={{ display: 'none' }}>PU</div>
                    <h1>Bienvenido</h1>
                    <p>Ingresá tus credenciales para continuar</p>
                </div>

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
                        
                        <div style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>o también</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                        </div>

                        <button 
                            className="btn-secundario btn-block" 
                            type="button" 
                            onClick={handleDemoLogin} 
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
                        >
                            <Rocket size={18} /> Acceder a Demo
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
                <button className="btn-icon" type="button" title="Cambiar tema" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </div>
    );
}
