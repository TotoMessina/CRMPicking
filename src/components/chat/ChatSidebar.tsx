import React, { useState } from 'react';
import { UserCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatUser } from '../../hooks/useChat';

interface ChatSidebarProps {
    usuarios: ChatUser[];
    selectedUser: ChatUser | null;
    setSelectedUser: (user: ChatUser | null) => void;
    loadingUsers: boolean;
    isMobile: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ usuarios, selectedUser, setSelectedUser, loadingUsers, isMobile }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (isMobile && selectedUser) return null;

    const filteredUsers = usuarios.filter(u => 
        (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{
            width: isMobile ? '100%' : '320px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-elevated)',
            borderRadius: isMobile ? 0 : '24px',
            border: isMobile ? 'none' : '1px solid var(--border)',
            overflow: 'hidden',
            height: isMobile ? '100dvh' : '100%',
            boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
            backdropFilter: 'blur(10px)'
        } as React.CSSProperties}>
            <div style={{ 
                padding: isMobile ? `calc(24px + env(safe-area-inset-top)) 20px 16px` : '24px 20px', 
                borderBottom: '1px solid var(--border)', 
                background: 'var(--bg-glass)', flexShrink: 0 
            }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Mensajería</h2>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar contacto..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text)',
                            fontSize: '0.88rem',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="custom-scrollbar">
                {loadingUsers ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div className="spinner-small" style={{ margin: '0 auto 12px auto' }} />
                        Cargando contactos...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No se encontraron contactos
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                    >
                        {filteredUsers.map((u, i) => (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                key={u.email}
                                onClick={() => setSelectedUser(u)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px', width: '100%',
                                    background: selectedUser?.email === u.email ? 'var(--accent-soft)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative'
                                } as React.CSSProperties}
                            >
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{ 
                                        width: '48px', height: '48px', borderRadius: '16px', 
                                        background: 'var(--bg-card)', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center', 
                                        color: 'var(--text-muted)', overflow: 'hidden',
                                        border: selectedUser?.email === u.email ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        transition: 'all 0.2s'
                                    }}>
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} alt={u.nombre || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <UserCircle size={28} />
                                        )}
                                    </div>
                                    {u.unreadCount && u.unreadCount > 0 ? (
                                        <div style={{ 
                                            position: 'absolute', top: '-5px', right: '-5px', 
                                            background: '#ef4444', color: '#fff', fontSize: '0.7rem', 
                                            fontWeight: 800, minWidth: '20px', height: '20px', 
                                            borderRadius: '10px', display: 'flex', alignItems: 'center', 
                                            justifyContent: 'center', border: '3px solid var(--bg-elevated)',
                                            padding: '0 4px', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                                        }}>
                                            {u.unreadCount > 99 ? '99+' : u.unreadCount}
                                        </div>
                                    ) : null}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ 
                                        fontWeight: u.unreadCount && u.unreadCount > 0 ? 800 : 600, 
                                        color: u.unreadCount && u.unreadCount > 0 ? 'var(--text)' : (selectedUser?.email === u.email ? 'var(--accent)' : 'var(--text)'), 
                                        whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', 
                                        fontSize: '0.98rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    } as React.CSSProperties}>
                                        {u.nombre || u.email.split('@')[0]}
                                        {u.unreadCount && u.unreadCount > 0 ? (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                                        ) : null}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.8rem', 
                                        color: u.unreadCount && u.unreadCount > 0 ? 'var(--accent)' : 'var(--text-muted)', 
                                        fontWeight: u.unreadCount && u.unreadCount > 0 ? 700 : 500, 
                                        marginTop: '1px',
                                        opacity: u.unreadCount && u.unreadCount > 0 ? 1 : 0.8
                                    } as React.CSSProperties}>
                                        {u.unreadCount && u.unreadCount > 0 ? 'Mensaje nuevo' : (u.role || 'Usuario')}
                                    </div>
                                </div>
                                {selectedUser?.email === u.email && (
                                    <motion.div 
                                        layoutId="active-indicator"
                                        style={{ position: 'absolute', right: '12px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} 
                                    />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
};
