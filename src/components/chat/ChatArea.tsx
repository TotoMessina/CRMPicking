import React, { useState } from 'react';
import { UserCircle, X, MessageCircle, Send, ClipboardList, Check, CheckCheck, Calendar, ArrowUpRight, Link as LinkIcon, Users, User, Route } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatToLocal } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextSelectorModal } from './ContextSelectorModal';
import { ChatUser, ChatMessage, ChatContext } from '../../hooks/useChat';

interface ChatAreaProps {
    selectedUser: ChatUser | null;
    setSelectedUser: (user: ChatUser | null) => void;
    mensajes: ChatMessage[];
    user: { email: string } | null;
    newMessage: string;
    setNewMessage: (msg: string) => void;
    handleSend: (e?: React.FormEvent) => void;
    openTaskModal: () => void;
    loadingMessages: boolean;
    hasMoreMessages: boolean;
    isMobile: boolean;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    topRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    selectedContext: ChatContext | null;
    setSelectedContext: (ctx: ChatContext | null) => void;
    loadMoreMessages: () => Promise<void>;
}

const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

export const ChatArea: React.FC<ChatAreaProps> = ({ 
    selectedUser, setSelectedUser, mensajes, user, 
    newMessage, setNewMessage, handleSend, openTaskModal,
    loadingMessages, hasMoreMessages, isMobile, 
    scrollContainerRef, topRef, messagesEndRef,
    selectedContext, setSelectedContext,
    loadMoreMessages
}) => {
    const [isContextModalOpen, setIsContextModalOpen] = useState(false);

    const parseMessage = (text: string) => {
        if (text?.startsWith('[TAREA_ASIGNADA]|')) {
            const parts = text.split('|');
            return { type: 'task', title: parts[1], desc: parts[2], date: parts[3] };
        }
        if (text?.startsWith('[CONTEXT:')) {
            const match = text.match(/\[CONTEXT:(.*?):(.*?):(.*?)\]\|(.*)/);
            if (match) {
                return { 
                    type: 'context', 
                    ctxType: match[1], 
                    ctxId: match[2], 
                    ctxLabel: match[3], 
                    content: match[4] 
                };
            }
        }
        return { type: 'text', content: text };
    };

    const getContextIcon = (type: string) => {
        if (type === 'clientes') return <User size={14} />;
        if (type === 'consumidores') return <Users size={14} />;
        if (type === 'rutas') return <Route size={14} />;
        return <LinkIcon size={14} />;
    };

    const getContextLink = (type: string, id: string) => {
        if (type === 'clientes') return `/clientes?id=${id}`;
        if (type === 'consumidores') return `/consumidores?id=${id}`;
        if (type === 'rutas') return `/ruta`;
        return '#';
    };

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
            borderRadius: isMobile ? 0 : '24px', border: isMobile ? 'none' : '1px solid var(--border)', overflow: 'hidden',
            ...(isMobile ? { 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                zIndex: 2000, 
                height: '100dvh' 
            } : { height: '100%' }),
        } as React.CSSProperties}>
            {/* Header */}
            <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', 
                padding: isMobile ? `calc(12px + env(safe-area-inset-top)) 14px 12px` : '20px 24px', 
                borderBottom: '1px solid var(--border)', 
                background: 'var(--bg-glass)', flexShrink: 0,
                backdropFilter: 'blur(10px)',
                zIndex: 10
            }}>
                {isMobile && (
                    <button onClick={() => setSelectedUser(null)} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                )}
                <div style={{ 
                    width: '44px', height: '44px', borderRadius: '14px', 
                    background: 'var(--bg-card)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', 
                    color: 'var(--text-muted)', overflow: 'hidden',
                    border: '1px solid var(--border)'
                }}>
                    {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt={selectedUser.nombre || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <UserCircle size={28} />
                    )}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                        {selectedUser.nombre || selectedUser.email.split('@')[0]}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <span>En línea</span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg)' }}>
                {hasMoreMessages && (
                    <div ref={topRef} style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => loadMoreMessages()}>
                        {loadingMessages ? 'Cargando...' : 'Pulsa para cargar más mensajes'}
                    </div>
                )}
                {mensajes.map((msg, i) => {
                    const isMe = user && msg.de_usuario === user.email;
                    const parsed = parseMessage(msg.mensaje);
                    
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={msg.id} 
                            style={{ 
                                display: 'flex', 
                                justifyContent: isMe ? 'flex-end' : 'flex-start', 
                                marginBottom: (i === mensajes.length-1 || mensajes[i+1].de_usuario !== msg.de_usuario) ? '12px' : '2px' 
                            }}
                        >
                            <div style={{
                                maxWidth: isMobile ? '85%' : '70%', 
                                position: 'relative'
                            } as React.CSSProperties}>
                                {parsed.type === 'task' ? (
                                    <div style={{ 
                                        background: 'var(--bg-elevated)', 
                                        border: `1px solid ${isMe ? 'var(--accent)' : 'var(--border)'}`, 
                                        borderRadius: '20px', padding: '16px', 
                                        width: isMobile ? '230px' : '280px', 
                                        display: 'flex', flexDirection: 'column', gap: '10px',
                                        boxShadow: 'var(--shadow-sm)'
                                    } as React.CSSProperties}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                                            <ClipboardList size={18} />
                                            <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>Tarea Asignada</span>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{parsed.title}</div>
                                        {parsed.desc && <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{parsed.desc}</div>}
                                        {parsed.date && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={14} /> <span>Vence: {formatToLocal(parsed.date)}</span>
                                            </div>
                                        )}
                                        <Link to="/tablero" style={{ textAlign: 'center', padding: '10px', background: 'var(--accent)', borderRadius: '12px', color: '#fff', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700, marginTop: '4px' }}>Ver en Tablero</Link>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: parsed.type === 'context' ? '4px' : '10px 16px', 
                                        borderRadius: '20px',
                                        background: isMe ? 'var(--accent)' : 'var(--bg-card)',
                                        color: isMe ? '#fff' : 'var(--text)', 
                                        border: isMe ? 'none' : '1px solid var(--border)',
                                        opacity: msg.isOptimistic ? 0.7 : 1,
                                        boxShadow: 'var(--shadow-sm)'
                                    } as React.CSSProperties}>
                                        {parsed.type === 'context' && (
                                            <div style={{ 
                                                background: isMe ? 'rgba(255,255,255,0.1)' : 'var(--bg-active)', 
                                                borderRadius: '16px', padding: '12px', marginBottom: '8px',
                                                display: 'flex', flexDirection: 'column', gap: '6px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>
                                                    {getContextIcon(parsed.ctxType || '')}
                                                    <span>Referencia: {parsed.ctxType}</span>
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{parsed.ctxLabel}</div>
                                                <Link 
                                                    to={getContextLink(parsed.ctxType || '', parsed.ctxId || '')} 
                                                    style={{ 
                                                        background: isMe ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)', 
                                                        padding: '6px 10px', borderRadius: '8px', 
                                                        color: isMe ? '#fff' : 'var(--accent)', 
                                                        textDecoration: 'none', fontSize: '0.8rem', 
                                                        fontWeight: 700, display: 'flex', alignItems: 'center', 
                                                        justifyContent: 'center', gap: '4px' 
                                                    }}
                                                >
                                                    Abrir registro <ArrowUpRight size={14} />
                                                </Link>
                                            </div>
                                        )}
                                        <div style={{ 
                                            padding: parsed.type === 'context' ? '8px 12px' : 0,
                                            fontSize: '0.95rem', 
                                            lineHeight: 1.5,
                                            whiteSpace: 'pre-wrap' 
                                        } as React.CSSProperties}>
                                            {parsed.content}
                                        </div>
                                        <div style={{ 
                                            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', 
                                            gap: '4px', fontSize: '0.68rem', opacity: 0.7, marginTop: '4px',
                                            padding: parsed.type === 'context' ? '0 8px 4px' : 0
                                        }}>
                                            {formatTime(msg.created_at)}
                                            {isMe && !msg.isOptimistic && (msg.leido ? <CheckCheck size={12} color={isMe ? "#fff" : "#93c5fd"} /> : <Check size={12} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Form with Context Selector */}
            <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-glass)', position: 'relative' }}>
                <AnimatePresence>
                    {selectedContext && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            style={{ 
                                padding: '10px 20px', 
                                borderBottom: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: 'var(--accent-soft)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700 }}>
                                <LinkIcon size={14} />
                                <span>Vinculando a {selectedContext.type}: <strong>{selectedContext.label}</strong></span>
                            </div>
                            <button onClick={() => setSelectedContext(null)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', padding: '16px 20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            type="button" 
                            onClick={openTaskModal} 
                            title="Asignar tarea"
                            style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', transition: 'all 0.2s' }}
                        >
                            <ClipboardList size={20} />
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setIsContextModalOpen(true)} 
                            title="Vincular contexto"
                            style={{ 
                                width: '42px', height: '42px', borderRadius: '12px', 
                                background: selectedContext ? 'var(--accent)' : 'var(--bg-card)', 
                                border: '1px solid var(--border)', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', 
                                cursor: 'pointer', color: selectedContext ? '#fff' : 'var(--text)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <LinkIcon size={20} />
                        </button>
                    </div>
                    
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)} 
                        placeholder={selectedContext ? "Escribe un mensaje relacionado..." : "Escribe un mensaje..."}
                        style={{ flex: 1, padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none', fontSize: '0.95rem' }} 
                    />
                    
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()} 
                        style={{ 
                            width: '46px', height: '46px', borderRadius: '14px', 
                            background: 'var(--accent)', color: '#fff', 
                            border: 'none', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', cursor: 'pointer', 
                            opacity: newMessage.trim() ? 1 : 0.5,
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                        }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>

            <ContextSelectorModal 
                isOpen={isContextModalOpen}
                onClose={() => setIsContextModalOpen(false)}
                onSelect={(ctx) => {
                    setSelectedContext(ctx);
                    setIsContextModalOpen(false);
                }}
            />
        </div>
    );
};
