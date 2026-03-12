import { UserCircle, X, MessageCircle, Send, ClipboardList, Check, CheckCheck, Calendar, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

export const ChatArea = ({ 
    selectedUser, setSelectedUser, mensajes, user, 
    newMessage, setNewMessage, handleSend, openTaskModal,
    loadingMessages, hasMoreMessages, isMobile, 
    scrollContainerRef, topRef, messagesEndRef 
}) => {
    if (isMobile && !selectedUser) return null;

    if (!selectedUser) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '16px', padding: '40px' }}>
                <MessageCircle size={60} style={{ opacity: 0.15 }} />
                <span style={{ fontSize: '1.05rem', fontWeight: 500, textAlign: 'center' }}>Selecciona un contacto para iniciar un chat</span>
            </div>
        );
    }

    return (
        <div style={{
            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)',
            borderRadius: isMobile ? 0 : '16px', border: isMobile ? 'none' : '1px solid var(--border)', overflow: 'hidden',
            ...(isMobile ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 210, height: '100dvh' } : { height: '100%' }),
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)', flexShrink: 0 }}>
                {isMobile && (
                    <button onClick={() => setSelectedUser(null)} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                )}
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <UserCircle size={26} />
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedUser.nombre || selectedUser.email.split('@')[0]}</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedUser.email}</div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg)' }}>
                {hasMoreMessages && (
                    <div ref={topRef} style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {loadingMessages ? 'Cargando...' : 'Subi para ver mas'}
                    </div>
                )}
                {mensajes.map((msg, i) => {
                    const isMe = msg.de_usuario === user.email;
                    const isTask = msg.mensaje?.startsWith('[TAREA_ASIGNADA]|');
                    const parts = isTask ? msg.mensaje.split('|') : [];
                    
                    return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: (i === mensajes.length-1 || mensajes[i+1].de_usuario !== msg.de_usuario) ? '6px' : '1px' }}>
                            <div style={{
                                maxWidth: isMobile ? '82%' : '68%', padding: isTask ? 0 : '10px 13px', borderRadius: '16px',
                                background: isTask ? 'transparent' : (isMe ? 'var(--accent)' : 'var(--bg-elevated)'),
                                color: isMe && !isTask ? '#fff' : 'var(--text)', border: isTask ? 'none' : (isMe ? 'none' : '1px solid var(--border)'),
                                opacity: msg.isOptimistic ? 0.7 : 1,
                            }}>
                                {isTask ? (
                                    <div style={{ background: 'var(--bg-elevated)', border: `1px solid ${isMe ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '16px', padding: '14px', width: isMobile ? '230px' : '270px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>{parts[1]}</div>
                                        {parts[2] && <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{parts[2]}</div>}
                                        {parts[3] && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '5px' }}>Vence: {new Date(parts[3]).toLocaleDateString()}</div>}
                                        <Link to="/tablero" style={{ textAlign: 'center', padding: '7px', background: 'var(--bg)', borderRadius: '10px', color: 'var(--accent)', textDecoration: 'none', fontSize: '0.83rem', fontWeight: 600 }}>Ver en Tablero</Link>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{msg.mensaje}</div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.68rem', opacity: 0.7 }}>
                                            {formatTime(msg.created_at)}
                                            {isMe && !msg.isOptimistic && (msg.leido ? <CheckCheck size={12} color="#93c5fd" /> : <Check size={12} />)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Form */}
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                <button type="button" onClick={openTaskModal} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ClipboardList size={19} />
                </button>
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribi un mensaje..." style={{ flex: 1, padding: '12px 20px', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                <button type="submit" disabled={!newMessage.trim()} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: newMessage.trim() ? 1 : 0.55 }}>
                    <Send size={19} />
                </button>
            </form>
        </div>
    );
};
