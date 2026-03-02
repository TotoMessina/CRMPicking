import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, UserCircle, Check, CheckCheck, MessageCircle, ClipboardList, X, Calendar, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Chat() {
    const { user } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Modal de Tarea Rapida
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskForm, setTaskForm] = useState({ titulo: '', descripcion: '', fecha_vencimiento: '', asignado_a: [] });
    const [sendingTask, setSendingTask] = useState(false);

    // Paginacion de Chat
    const [limit, setLimit] = useState(25);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const messagesEndRef = useRef(null);
    const topRef = useRef(null);
    const scrollContainerRef = useRef(null);

    // Resize detection para Mobile UX
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 1. Cargar lista de usuarios (que no sean el actual)
    useEffect(() => {
        const fetchUsers = async () => {
            if (!user) return;
            setLoadingUsers(true);

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

            const { data: receivedData, error: receivedError } = await supabase
                .from('mensajes_chat')
                .select('de_usuario, leido, created_at')
                .eq('para_usuario', user.email)
                .order('created_at', { ascending: false });

            let userStats = {};
            if (!receivedError && receivedData) {
                receivedData.forEach(msg => {
                    if (!userStats[msg.de_usuario]) {
                        userStats[msg.de_usuario] = { unreadCount: 0, lastMessageAt: msg.created_at };
                    }
                    if (!msg.leido) {
                        userStats[msg.de_usuario].unreadCount += 1;
                    }
                });
            }

            let combinedUsers = (usersData || []).map(u => ({
                ...u,
                unreadCount: userStats[u.email]?.unreadCount || 0,
                lastMessageAt: userStats[u.email]?.lastMessageAt || null
            }));

            combinedUsers.sort((a, b) => {
                if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
                if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
                if (a.lastMessageAt && !b.lastMessageAt) return -1;
                if (b.lastMessageAt && !a.lastMessageAt) return 1;
                return (a.nombre || a.email).toLowerCase().localeCompare((b.nombre || b.email).toLowerCase());
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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_chat', filter: `para_usuario=eq.${user.email}` },
                (payload) => {
                    const msg = payload.new;
                    setMensajes(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    if (msg.de_usuario !== user.email) {
                        setUsuarios(prev => {
                            const updated = prev.map(u => {
                                if (u.email === msg.de_usuario) {
                                    if (selectedUser?.email !== u.email) {
                                        return { ...u, unreadCount: (u.unreadCount || 0) + 1, lastMessageAt: msg.created_at };
                                    } else {
                                        return { ...u, lastMessageAt: msg.created_at };
                                    }
                                }
                                return u;
                            });
                            updated.sort((a, b) => {
                                if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                                if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
                                if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
                                if (a.lastMessageAt && !b.lastMessageAt) return -1;
                                if (b.lastMessageAt && !a.lastMessageAt) return 1;
                                return (a.nombre || a.email).toLowerCase().localeCompare((b.nombre || b.email).toLowerCase());
                            });
                            return updated;
                        });
                        if (selectedUser?.email !== msg.de_usuario) {
                            toast(`Nuevo mensaje de ${msg.de_usuario}`, { icon: '\u{1F4AC}' });
                        } else {
                            marcarComoLeidos(msg.de_usuario);
                        }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, selectedUser]);

    // 3. Cargar historial cuando selecciono un usuario
    useEffect(() => {
        if (!selectedUser || !user) return;

        const fetchInitialMessages = async () => {
            setLoadingMessages(true);
            setLimit(25);
            setHasMoreMessages(true);

            const { data, error } = await supabase
                .from('mensajes_chat')
                .select('*')
                .or(`and(de_usuario.eq.${user.email},para_usuario.eq.${selectedUser.email}),and(de_usuario.eq.${selectedUser.email},para_usuario.eq.${user.email})`)
                .order('created_at', { ascending: false })
                .limit(25);

            if (error) {
                console.error(error);
                toast.error('Error al cargar chat');
            } else {
                const msgs = (data || []).reverse();
                setMensajes(msgs);
                if (data && data.length < 25) setHasMoreMessages(false);
                marcarComoLeidos(selectedUser.email);
            }
            setLoadingMessages(false);
            setTimeout(scrollToBottom, 100);
        };

        fetchInitialMessages();
    }, [selectedUser, user]);

    // Cargar mensajes anteriores al scrollear arriba
    const loadMoreMessages = async () => {
        if (!hasMoreMessages || loadingMessages || !selectedUser || !user) return;

        const previousHeight = scrollContainerRef.current?.scrollHeight;
        setLoadingMessages(true);
        const newLimit = limit + 25;

        const { data, error } = await supabase
            .from('mensajes_chat')
            .select('*')
            .or(`and(de_usuario.eq.${user.email},para_usuario.eq.${selectedUser.email}),and(de_usuario.eq.${selectedUser.email},para_usuario.eq.${user.email})`)
            .order('created_at', { ascending: false })
            .limit(newLimit);

        if (!error && data) {
            if (data.length < newLimit) setHasMoreMessages(false);
            setMensajes(data.reverse());
            setLimit(newLimit);
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    const newHeight = scrollContainerRef.current.scrollHeight;
                    scrollContainerRef.current.scrollTop = newHeight - previousHeight;
                }
            }, 50);
        }
        setLoadingMessages(false);
    };

    // IntersectionObserver para detectar scroll al inicio
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) loadMoreMessages(); },
            { root: scrollContainerRef.current, threshold: 0.5 }
        );
        if (topRef.current) observer.observe(topRef.current);
        return () => observer.disconnect();
    }, [hasMoreMessages, loadingMessages, selectedUser, limit]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const marcarComoLeidos = async (remitenteEmail) => {
        if (!user) return;
        setUsuarios(prev => prev.map(u => u.email === remitenteEmail ? { ...u, unreadCount: 0 } : u));
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
        setNewMessage('');

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
        setTimeout(scrollToBottom, 50);

        setUsuarios(prev => {
            const updated = prev.map(u => u.email === selectedUser.email ? { ...u, lastMessageAt: tempMsg.created_at } : u);
            updated.sort((a, b) => {
                if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
                if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
                if (a.lastMessageAt && !b.lastMessageAt) return -1;
                if (b.lastMessageAt && !a.lastMessageAt) return 1;
                return (a.nombre || a.email).toLowerCase().localeCompare((b.nombre || b.email).toLowerCase());
            });
            return updated;
        });

        const { data, error } = await supabase
            .from('mensajes_chat')
            .insert([{ de_usuario: user.email, para_usuario: selectedUser.email, mensaje: text }])
            .select()
            .single();

        if (error) {
            console.error('Error enviando mensaje:', error);
            toast.error('No se pudo enviar el mensaje');
            setMensajes(prev => prev.filter(m => m.id !== tempMsg.id));
        } else {
            setMensajes(prev => prev.map(m => m.id === tempMsg.id ? data : m));
        }
    };

    const openTaskModal = () => {
        setTaskForm({
            titulo: '',
            descripcion: '',
            fecha_vencimiento: '',
            asignado_a: selectedUser ? [selectedUser.email] : []
        });
        setIsTaskModalOpen(true);
    };

    const handleSendTask = async (e) => {
        e.preventDefault();
        if (!taskForm.titulo.trim() || !user || taskForm.asignado_a.length === 0) return;
        setSendingTask(true);

        const textMessage = `[TAREA_ASIGNADA]|${taskForm.titulo.trim()}|${taskForm.descripcion.trim()}|${taskForm.fecha_vencimiento || ''}`;
        const asignadosString = taskForm.asignado_a.join(',');

        try {
            const { count } = await supabase.from('tareas_tablero')
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'Pendiente');

            const { error: taskError } = await supabase.from('tareas_tablero').insert([{
                titulo: taskForm.titulo.trim(),
                descripcion: taskForm.descripcion.trim() || null,
                estado: 'Pendiente',
                asignado_a: asignadosString,
                fecha_vencimiento: taskForm.fecha_vencimiento || null,
                orden: count || 0,
                checklist: []
            }]);

            if (taskError) throw taskError;

            const messagesToInsert = [];
            const timestamp = new Date().toISOString();

            taskForm.asignado_a.forEach(asignadoEmail => {
                if (selectedUser && asignadoEmail === selectedUser.email) {
                    const tempMsg = {
                        id: 'temp-' + Date.now() + Math.random(),
                        created_at: timestamp,
                        de_usuario: user.email,
                        para_usuario: asignadoEmail,
                        mensaje: textMessage,
                        leido: false,
                        isOptimistic: true
                    };
                    setMensajes(prev => [...prev, tempMsg]);
                }
                messagesToInsert.push({ de_usuario: user.email, para_usuario: asignadoEmail, mensaje: textMessage });
            });

            const { error: msgError } = await supabase.from('mensajes_chat').insert(messagesToInsert);
            if (msgError) throw msgError;

            supabase.functions.invoke('send-push', {
                body: {
                    targetEmails: taskForm.asignado_a,
                    payload: {
                        title: 'Nuevas Tareas Asignadas',
                        body: `Se te ha asignado una nueva tarea: ${taskForm.titulo.trim()}`,
                        url: '/tablero'
                    }
                }
            }).catch(err => console.error('Error invoking edge function for push:', err));

            toast.success(`Tarea asignada a ${taskForm.asignado_a.length} persona(s)`);
            setIsTaskModalOpen(false);
            setTaskForm({ titulo: '', descripcion: '', fecha_vencimiento: '', asignado_a: [] });
        } catch (error) {
            console.error(error);
            toast.error('Error al enviar la tarea');
        } finally {
            setSendingTask(false);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    // ────────────────────────────────────────────────────────────────
    //  RENDER
    // ────────────────────────────────────────────────────────────────
    return (
        <div style={{
            display: 'flex',
            height: '100%',
            minHeight: 0,
            width: '100%',
            overflow: 'hidden',
            padding: isMobile ? 0 : '20px',
            gap: isMobile ? 0 : '20px',
            boxSizing: 'border-box',
            maxWidth: '1400px',
            margin: '0 auto',
        }}>

            {/* ═══ SIDEBAR: Lista de Contactos ═══ */}
            <div style={{
                width: isMobile ? '100%' : '300px',
                flexShrink: 0,
                display: isMobile && selectedUser ? 'none' : 'flex',
                flexDirection: 'column',
                background: 'var(--bg-elevated)',
                borderRadius: isMobile ? 0 : '16px',
                border: isMobile ? 'none' : '1px solid var(--border)',
                overflow: 'hidden',
                height: '100%',
            }}>
                {/* Header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)', flexShrink: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Contactos</h2>
                </div>

                {/* Lista scrolleable */}
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

            {/* ═══ MAIN CHAT AREA ═══ */}
            <div style={{
                flex: 1,
                minWidth: 0,
                display: isMobile && !selectedUser ? 'none' : 'flex',
                flexDirection: 'column',
                background: 'var(--bg-elevated)',
                borderRadius: isMobile ? 0 : '16px',
                border: isMobile ? 'none' : '1px solid var(--border)',
                overflow: 'hidden',
                // Mobile con contacto seleccionado -> ocupa toda la pantalla
                ...(isMobile && selectedUser ? {
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 210,
                    height: '100dvh',
                    borderRadius: 0,
                } : { height: '100%' }),
            }}>
                {!selectedUser ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '16px', padding: '40px' }}>
                        <MessageCircle size={60} style={{ opacity: 0.15 }} />
                        <span style={{ fontSize: '1.05rem', fontWeight: 500, textAlign: 'center' }}>
                            Selecciona un contacto para iniciar un chat
                        </span>
                    </div>
                ) : (
                    <>
                        {/* ─── Chat Header ─── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)', flexShrink: 0 }}>
                            {/* Boton volver (solo mobile) */}
                            {isMobile && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedUser(null); }}
                                    style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                    aria-label="Volver"
                                >
                                    <X size={18} />
                                </button>
                            )}
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                                <UserCircle size={26} />
                            </div>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedUser.nombre || selectedUser.email.split('@')[0]}
                                </h3>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedUser.email}
                                </div>
                            </div>
                        </div>

                        {/* ─── Mensajes (scroll vertical) ─── */}
                        <div
                            ref={scrollContainerRef}
                            style={{
                                flex: 1,
                                minHeight: 0,
                                overflowY: 'scroll',
                                overflowX: 'hidden',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                background: 'var(--bg)',
                            }}
                        >
                            {/* Trigger carga mensajes anteriores */}
                            {hasMoreMessages && mensajes.length > 0 && (
                                <div ref={topRef} style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0 }}>
                                    {loadingMessages ? 'Cargando mensajes anteriores...' : 'Subi para ver mas mensajes'}
                                </div>
                            )}

                            {mensajes.length === 0 && !loadingMessages ? (
                                <div style={{ margin: 'auto', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '12px 24px', borderRadius: '24px', fontSize: '0.9rem' }}>
                                    Aun no hay mensajes. Escrihi algo!
                                </div>
                            ) : (
                                mensajes.map((msg, i) => {
                                    const isMe = msg.de_usuario === user.email;
                                    const showTail = i === mensajes.length - 1 || mensajes[i + 1].de_usuario !== msg.de_usuario;
                                    const isTaskMessage = msg.mensaje?.startsWith('[TAREA_ASIGNADA]|');
                                    let taskTitle = '', taskDesc = '', taskDate = '';
                                    if (isTaskMessage) {
                                        const parts = msg.mensaje.split('|');
                                        taskTitle = parts[1] || '';
                                        taskDesc = parts[2] || '';
                                        taskDate = parts[3] || '';
                                    }

                                    return (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: showTail ? '6px' : '1px', flexShrink: 0 }}>
                                            <div style={{
                                                maxWidth: isMobile ? '82%' : '68%',
                                                padding: isTaskMessage ? 0 : '10px 13px',
                                                borderRadius: '16px',
                                                borderBottomRightRadius: isMe && showTail ? '4px' : '16px',
                                                borderBottomLeftRadius: !isMe && showTail ? '4px' : '16px',
                                                background: isTaskMessage ? 'transparent' : (isMe ? 'var(--accent)' : 'var(--bg-elevated)'),
                                                color: isMe && !isTaskMessage ? '#fff' : 'var(--text)',
                                                border: isTaskMessage ? 'none' : (isMe ? 'none' : '1px solid var(--border)'),
                                                boxShadow: isTaskMessage ? 'none' : 'var(--shadow-sm)',
                                                opacity: msg.isOptimistic ? 0.7 : 1,
                                            }}>
                                                {isTaskMessage ? (
                                                    <div style={{ background: 'var(--bg-elevated)', border: `1px solid ${isMe ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '16px', padding: '14px', width: isMobile ? '230px' : '270px', display: 'flex', flexDirection: 'column', gap: '9px', boxShadow: 'var(--shadow-md)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: isMe ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                            <ClipboardList size={15} />
                                                            <span style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                {isMe ? 'Tarea Enviada' : 'Nueva Tarea Asignada'}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--text)' }}>{taskTitle}</div>
                                                        {taskDesc && (
                                                            <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{taskDesc}</div>
                                                        )}
                                                        {taskDate && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '5px 9px', borderRadius: '8px', width: 'fit-content' }}>
                                                                <Calendar size={12} /> Vence: {new Date(taskDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                        <Link to="/tablero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', background: 'var(--bg)', borderRadius: '10px', color: 'var(--accent)', textDecoration: 'none', fontSize: '0.83rem', fontWeight: 600 }}>
                                                            Ver en Tablero <ArrowUpRight size={14} />
                                                        </Link>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                            {formatTime(msg.created_at)}
                                                            {isMe && !msg.isOptimistic && (msg.leido ? <CheckCheck size={12} color="#60a5fa" /> : <Check size={12} />)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div style={{ fontSize: '0.95rem', lineHeight: '1.45', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                            {msg.mensaje}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '4px', fontSize: '0.68rem', color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>
                                                            {formatTime(msg.created_at)}
                                                            {isMe && !msg.isOptimistic && (msg.leido ? <CheckCheck size={12} color="#93c5fd" /> : <Check size={12} />)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {/* Ancla de scroll automatico */}
                            <div ref={messagesEndRef} style={{ flexShrink: 0 }} />
                        </div>

                        {/* ─── Input de mensaje ─── */}
                        <form
                            onSubmit={handleSend}
                            style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: isMobile ? '10px 12px' : '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-glass)', flexShrink: 0 }}
                        >
                            <button
                                type="button"
                                onClick={openTaskModal}
                                style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: 0, flexShrink: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                title="Asignar Tarea"
                            >
                                <ClipboardList size={19} />
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Escribi un mensaje..."
                                style={{ flex: 1, padding: isMobile ? '12px 16px' : '13px 20px', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '1rem', outline: 'none', minWidth: 0 }}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', opacity: newMessage.trim() ? 1 : 0.55, transition: 'all 0.2s', padding: 0, paddingLeft: '3px', flexShrink: 0 }}
                            >
                                <Send size={19} />
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* ═══ MODAL: Asignar Tarea ═══ */}
            {isTaskModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--bg-elevated)', width: '100%', maxWidth: '500px', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '90dvh', overflow: 'hidden' }}>

                        {/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', borderRadius: '20px 20px 0 0' }}>
                            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClipboardList size={19} color="var(--accent)" />
                                Asignar Tarea a {selectedUser?.nombre || selectedUser?.email.split('@')[0]}
                            </h2>
                            <button onClick={() => setIsTaskModalOpen(false)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={15} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            <form id="quick-task-form" onSubmit={handleSendTask}>
                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Titulo *</label>
                                    <input required type="text" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                        value={taskForm.titulo} onChange={e => setTaskForm({ ...taskForm, titulo: e.target.value })} autoFocus />
                                </div>
                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Descripcion</label>
                                    <textarea rows="3" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontSize: '0.95rem' }}
                                        value={taskForm.descripcion} onChange={e => setTaskForm({ ...taskForm, descripcion: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Vencimiento</label>
                                    <input type="date" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
                                        value={taskForm.fecha_vencimiento} onChange={e => setTaskForm({ ...taskForm, fecha_vencimiento: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Asignar a</label>
                                    <div style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {usuarios.map(u => (
                                            <label key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={taskForm.asignado_a.includes(u.email)}
                                                    onChange={(ev) => {
                                                        if (ev.target.checked) {
                                                            setTaskForm({ ...taskForm, asignado_a: [...taskForm.asignado_a, u.email] });
                                                        } else {
                                                            setTaskForm({ ...taskForm, asignado_a: taskForm.asignado_a.filter(em => em !== u.email) });
                                                        }
                                                    }}
                                                    style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                                                />
                                                {u.nombre || u.email.split('@')[0]}
                                                {selectedUser?.email === u.email && ' (Este chat)'}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-glass)', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={() => setIsTaskModalOpen(false)} disabled={sendingTask}
                                style={{ padding: '10px 18px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
                                Cancelar
                            </button>
                            <button type="submit" form="quick-task-form"
                                disabled={sendingTask || !taskForm.titulo.trim() || taskForm.asignado_a.length === 0}
                                style={{ padding: '10px 18px', borderRadius: '10px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: (!taskForm.titulo.trim() || sendingTask || taskForm.asignado_a.length === 0) ? 0.55 : 1 }}>
                                {sendingTask ? 'Enviando...' : `Asignar a ${taskForm.asignado_a.length} persona(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
