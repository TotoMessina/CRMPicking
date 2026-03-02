import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, UserCircle, Check, CheckCheck, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Chat() {
    const { user } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const messagesEndRef = useRef(null);

    // 1. Cargar lista de usuarios (que no sean el actual)
    useEffect(() => {
        const fetchUsers = async () => {
            if (!user) return;
            setLoadingUsers(true);

            // Traer todos los usuarios menos yo
            const { data: usersData, error: usersError } = await supabase
                .from('usuarios')
                .select('email, nombre, role')
                .neq('email', user.email);

            if (usersError) {
                console.error('Error fetching users:', usersError);
                toast.error('Error al cargar contactos');
                setLoadingUsers(false);
                return;
            }

            // Traer mensajes no leídos para mí, agrupados por remitente
            const { data: unreadData, error: unreadError } = await supabase
                .from('mensajes_chat')
                .select('de_usuario, leido')
                .eq('para_usuario', user.email)
                .eq('leido', false);

            let unreadCounts = {};
            if (!unreadError && unreadData) {
                unreadData.forEach(msg => {
                    unreadCounts[msg.de_usuario] = (unreadCounts[msg.de_usuario] || 0) + 1;
                });
            }

            // Combinar datos y ordenar
            let combinedUsers = (usersData || []).map(u => ({
                ...u,
                unreadCount: unreadCounts[u.email] || 0
            }));

            // Ordenar: primero los que tienen sin leer, luego alfabéticamente
            combinedUsers.sort((a, b) => {
                if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
                const nameA = (a.nombre || a.email).toLowerCase();
                const nameB = (b.nombre || b.email).toLowerCase();
                return nameA.localeCompare(nameB);
            });

            setUsuarios(combinedUsers);
            setLoadingUsers(false);
        };
        fetchUsers();
    }, [user]);

    // 2. Suscribirse a nuevos mensajes en tiempo real
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('chat_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensajes_chat',
                    filter: `para_usuario=eq.${user.email}`
                },
                (payload) => {
                    const msg = payload.new;

                    // 1. Agregar el mensaje a la vista actual si es del chat que tengo abierto (o si me lo mandé yo mismo desde otro dispositivo)
                    setMensajes(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });

                    // 2. Actualizar conteo de no leídos si el mensaje viene de otro usuario que no tengo seleccionado
                    if (msg.de_usuario !== user.email) {
                        setUsuarios(prev => {
                            const updated = prev.map(u => {
                                if (u.email === msg.de_usuario) {
                                    // Si no lo estoy viendo ahora mismo, sumo 1 al badge
                                    if (selectedUser?.email !== u.email) {
                                        return { ...u, unreadCount: (u.unreadCount || 0) + 1 };
                                    }
                                }
                                return u;
                            });

                            // Reordenar para que los que tienen mensajes sin leer suban
                            updated.sort((a, b) => {
                                if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                                if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
                                const nameA = (a.nombre || a.email).toLowerCase();
                                const nameB = (b.nombre || b.email).toLowerCase();
                                return nameA.localeCompare(nameB);
                            });

                            return updated;
                        });

                        if (selectedUser?.email !== msg.de_usuario) {
                            toast(`Nuevo mensaje de ${msg.de_usuario}`, { icon: '💬' });
                        } else {
                            // Si lo tengo seleccionado, lo marco como leído automáticamente en la DB
                            marcarComoLeidos(msg.de_usuario);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, selectedUser]);

    // 3. Cargar historial cuando selecciono un usuario
    useEffect(() => {
        if (!selectedUser || !user) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            const { data, error } = await supabase
                .from('mensajes_chat')
                .select('*')
                .or(`and(de_usuario.eq.${user.email},para_usuario.eq.${selectedUser.email}),and(de_usuario.eq.${selectedUser.email},para_usuario.eq.${user.email})`)
                .order('created_at', { ascending: true });

            if (error) {
                console.error(error);
                toast.error('Error al cargar chat');
            } else {
                setMensajes(data || []);
                // Marcar como leídos en BD y actualizar badge local
                marcarComoLeidos(selectedUser.email);
            }
            setLoadingMessages(false);
            scrollToBottom();
        };

        fetchMessages();
    }, [selectedUser, user]);

    // Auto-scroll cuando llegan mensajes nuevos
    useEffect(() => {
        scrollToBottom();
    }, [mensajes]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const marcarComoLeidos = async (remitenteEmail) => {
        if (!user) return;

        // Reset local badge
        setUsuarios(prev => prev.map(u => {
            if (u.email === remitenteEmail) {
                return { ...u, unreadCount: 0 };
            }
            return u;
        }));

        await supabase
            .from('mensajes_chat')
            .update({ leido: true })
            .eq('de_usuario', remitenteEmail)
            .eq('para_usuario', user.email)
            .eq('leido', false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser || !user) return;

        const text = newMessage.trim();
        setNewMessage(''); // optimistic clear

        // Crea el mensaje optimista en UI
        const tempMsg = {
            id: 'temp-' + Date.now(),
            created_at: new Date().toISOString(),
            de_usuario: user.email,
            para_usuario: selectedUser.email,
            mensaje: text,
            leido: false,
            isOptimistic: true
        };
        setMensajes(prev => [...prev, tempMsg]);

        const { data, error } = await supabase
            .from('mensajes_chat')
            .insert([{
                de_usuario: user.email,
                para_usuario: selectedUser.email,
                mensaje: text
            }])
            .select()
            .single();

        if (error) {
            console.error('Error enviando mensaje:', error);
            toast.error('No se pudo enviar el mensaje');
            setMensajes(prev => prev.filter(m => m.id !== tempMsg.id)); // revert
        } else {
            // Reemplazar mensaje temporal con el real (con ID de BD)
            setMensajes(prev => prev.map(m => m.id === tempMsg.id ? data : m));
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ display: 'flex', height: '100%', padding: '20px', gap: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

            {/* Sidebar (Lista de Usuarios) */}
            <div style={{ width: '320px', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Contactos</h2>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
                    {loadingUsers ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando contactos...</div>
                    ) : usuarios.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay otros usuarios</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {usuarios.map(u => (
                                <button
                                    key={u.email}
                                    onClick={() => setSelectedUser(u)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                        width: '100%', background: selectedUser?.email === u.email ? 'var(--accent-alpha)' : 'transparent',
                                        border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.2s', borderLeft: selectedUser?.email === u.email ? '3px solid var(--accent)' : '3px solid transparent'
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                            <UserCircle size={24} />
                                        </div>
                                        {u.unreadCount > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff',
                                                fontSize: '0.7rem', fontWeight: 'bold', width: '20px', height: '20px',
                                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '2px solid var(--bg-elevated)', boxShadow: 'var(--shadow-sm)'
                                            }}>
                                                {u.unreadCount > 99 ? '99+' : u.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: u.unreadCount > 0 ? 700 : 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {u.nombre || u.email.split('@')[0]}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: u.unreadCount > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: u.unreadCount > 0 ? 600 : 'normal' }}>
                                            {u.unreadCount > 0 ? 'Nuevos mensajes' : u.role}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {!selectedUser ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', gap: '16px' }}>
                        <MessageCircle size={64} style={{ opacity: 0.2 }} />
                        <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>Seleccioná un contacto para iniciar un chat</span>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <UserCircle size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{selectedUser.nombre || selectedUser.email.split('@')[0]}</h3>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg)' }}>
                            {loadingMessages ? (
                                <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Cargando mensajes...</div>
                            ) : mensajes.length === 0 ? (
                                <div style={{ margin: 'auto', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '12px 24px', borderRadius: '24px', fontSize: '0.9rem' }}>
                                    Aún no hay mensajes. ¡Escribí algo!
                                </div>
                            ) : (
                                mensajes.map((msg, i) => {
                                    const isMe = msg.de_usuario === user.email;
                                    const showTail = i === mensajes.length - 1 || mensajes[i + 1].de_usuario !== msg.de_usuario;

                                    return (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: showTail ? '8px' : '2px' }}>
                                            <div style={{
                                                maxWidth: '70%',
                                                padding: '10px 14px',
                                                borderRadius: '16px',
                                                borderBottomRightRadius: isMe && showTail ? '4px' : '16px',
                                                borderBottomLeftRadius: !isMe && showTail ? '4px' : '16px',
                                                background: isMe ? 'var(--accent)' : 'var(--bg-elevated)',
                                                color: isMe ? '#fff' : 'var(--text)',
                                                border: isMe ? 'none' : '1px solid var(--border)',
                                                boxShadow: 'var(--shadow-sm)',
                                                position: 'relative',
                                                opacity: msg.isOptimistic ? 0.7 : 1
                                            }}>
                                                <div style={{ fontSize: '0.95rem', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                    {msg.mensaje}
                                                </div>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end',
                                                    marginTop: '4px', fontSize: '0.7rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'
                                                }}>
                                                    {formatTime(msg.created_at)}
                                                    {isMe && !msg.isOptimistic && (
                                                        msg.leido ? <CheckCheck size={14} color="#60a5fa" /> : <Check size={14} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-glass)', display: 'flex', gap: '12px' }}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Escribí un mensaje..."
                                style={{
                                    flex: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid var(--border)',
                                    background: 'var(--bg)', color: 'var(--text)', fontSize: '1rem', outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                style={{
                                    width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent)', color: '#fff',
                                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                                    opacity: newMessage.trim() ? 1 : 0.6, transition: 'all 0.2s', padding: 0, paddingLeft: '4px'
                                }}
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
