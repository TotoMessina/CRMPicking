import { UserCircle } from 'lucide-react';

export const ChatSidebar = ({ usuarios, selectedUser, setSelectedUser, loadingUsers, isMobile }) => {
    if (isMobile && selectedUser) return null;

    return (
        <div style={{
            width: isMobile ? '100%' : '300px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-elevated)',
            borderRadius: isMobile ? 0 : '16px',
            border: isMobile ? 'none' : '1px solid var(--border)',
            overflow: 'hidden',
            height: '100%',
        }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)', flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Contactos</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {loadingUsers ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando contactos...</div>
                ) : usuarios.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay otros usuarios</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {usuarios.map(u => (
                            <button
                                key={u.email}
                                onClick={() => setSelectedUser(u)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 14px', width: '100%',
                                    background: selectedUser?.email === u.email ? 'var(--accent-alpha)' : 'transparent',
                                    border: 'none',
                                    borderLeft: selectedUser?.email === u.email ? '3px solid var(--accent)' : '3px solid transparent',
                                    borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <UserCircle size={26} />
                                    </div>
                                    {u.unreadCount > 0 && (
                                        <div style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#ef4444', color: '#fff', fontSize: '0.68rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-elevated)' }}>
                                            {u.unreadCount > 99 ? '99+' : u.unreadCount}
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: u.unreadCount > 0 ? 700 : 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '0.95rem' }}>
                                        {u.nombre || u.email.split('@')[0]}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: u.unreadCount > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: u.unreadCount > 0 ? 600 : 'normal', marginTop: '2px' }}>
                                        {u.unreadCount > 0 ? `${u.unreadCount} mensaje(s) nuevo(s)` : (u.role || 'Usuario')}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
