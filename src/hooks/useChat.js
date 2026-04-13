import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useChat = () => {
    const { user, empresaActiva } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskForm, setTaskForm] = useState({ titulo: '', descripcion: '', fecha_vencimiento: '', asignado_a: [] });
    const [sendingTask, setSendingTask] = useState(false);
    const [limit, setLimit] = useState(25);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [selectedContext, setSelectedContext] = useState(null); // { type, id, label }

    const messagesEndRef = useRef(null);
    const topRef = useRef(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchUsers = useCallback(async () => {
        if (!user || !empresaActiva) return;
        setLoadingUsers(true);

        const { data: usersData, error: usersError } = await supabase
            .rpc('get_chat_users', { empresa_id_param: empresaActiva.id });

        if (usersError) {
            toast.error('Error al cargar contactos');
            setLoadingUsers(false);
            return;
        }

        // Excluir al propio usuario logueado de la lista
        const filteredUsers = (usersData || []).filter(u => u.email !== user.email);


        // Fetch last interactions (received and sent) to determine order and unread count
        const { data: interactionData, error: interactionError } = await supabase
            .from('mensajes_chat')
            .select('de_usuario, para_usuario, leido, created_at')
            .or(`para_usuario.eq.${user.email},de_usuario.eq.${user.email}`)
            .eq('empresa_id', empresaActiva.id)
            .order('created_at', { ascending: false });

        let userStats = {};
        if (!interactionError && interactionData) {
            interactionData.forEach(msg => {
                const partnerEmail = msg.de_usuario === user.email ? msg.para_usuario : msg.de_usuario;
                if (!userStats[partnerEmail]) {
                    userStats[partnerEmail] = { unreadCount: 0, lastMessageAt: msg.created_at };
                }
                // Only count as unread if it was sent to me and I haven't read it
                if (msg.para_usuario === user.email && !msg.leido) {
                    userStats[partnerEmail].unreadCount += 1;
                }
            });
        }

        let combined = filteredUsers.map(u => ({
            ...u,
            unreadCount: userStats[u.email]?.unreadCount || 0,
            lastMessageAt: userStats[u.email]?.lastMessageAt || null
        }));

        combined.sort((a, b) => {
            if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
            if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
            if (a.lastMessageAt) return -1;
            if (b.lastMessageAt) return 1;
            return (a.nombre || a.email).toLowerCase().localeCompare((b.nombre || b.email).toLowerCase());
        });

        setUsuarios(combined);
        setLoadingUsers(false);
    }, [user, empresaActiva]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const marcarComoLeidos = useCallback(async (remitenteEmail) => {
        if (!user || !empresaActiva) return;
        setUsuarios(prev => prev.map(u => u.email === remitenteEmail ? { ...u, unreadCount: 0 } : u));
        await supabase
            .from('mensajes_chat')
            .update({ leido: true })
            .eq('de_usuario', remitenteEmail)
            .eq('para_usuario', user.email)
            .eq('empresa_id', empresaActiva.id)
            .eq('leido', false);
        window.dispatchEvent(new CustomEvent('chat-messages-read'));
    }, [user, empresaActiva]);

    useEffect(() => {
        if (!user || !empresaActiva) return;
        const channel = supabase
            .channel('chat_updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_chat', filter: `para_usuario=eq.${user.email}` },
                (payload) => {
                    const msg = payload.new;
                    setMensajes(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
                    if (msg.de_usuario !== user.email) {
                        setUsuarios(prev => {
                            const updated = prev.map(u => u.email === msg.de_usuario ? { 
                                ...u, 
                                unreadCount: selectedUser?.email === u.email ? 0 : (u.unreadCount || 0) + 1, 
                                lastMessageAt: msg.created_at 
                            } : u);
                            return [...updated].sort((a, b) => {
                                if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
                                if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
                                if (a.lastMessageAt) return -1;
                                if (b.lastMessageAt) return 1;
                                return (a.nombre || '').localeCompare(b.nombre || '');
                            });
                        });
                        if (selectedUser?.email === msg.de_usuario) marcarComoLeidos(msg.de_usuario);
                        else toast(`Nuevo mensaje de ${msg.de_usuario}`, { icon: '💬' });
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user, selectedUser, empresaActiva, marcarComoLeidos]);

    useEffect(() => {
        if (!selectedUser || !user || !empresaActiva) return;
        const fetchMsgs = async () => {
            setLoadingMessages(true);
            setLimit(25);
            setHasMoreMessages(true);
            const { data, error } = await supabase
                .from('mensajes_chat')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .or(`and(de_usuario.eq.${user.email},para_usuario.eq.${selectedUser.email}),and(de_usuario.eq.${selectedUser.email},para_usuario.eq.${user.email})`)
                .order('created_at', { ascending: false })
                .limit(25);
            if (!error) {
                setMensajes((data || []).reverse());
                if (data && data.length < 25) setHasMoreMessages(false);
                marcarComoLeidos(selectedUser.email);
            }
            setLoadingMessages(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };
        fetchMsgs();
    }, [selectedUser, user, empresaActiva, marcarComoLeidos]);

    const loadMoreMessages = async () => {
        if (!hasMoreMessages || loadingMessages || !selectedUser || !user || !empresaActiva) return;
        const previousHeight = scrollContainerRef.current?.scrollHeight;
        setLoadingMessages(true);
        const newLimit = limit + 25;
        const { data, error } = await supabase
            .from('mensajes_chat')
            .select('*')
            .eq('empresa_id', empresaActiva.id)
            .or(`and(de_usuario.eq.${user.email},para_usuario.eq.${selectedUser.email}),and(de_usuario.eq.${selectedUser.email},para_usuario.eq.${user.email})`)
            .order('created_at', { ascending: false })
            .limit(newLimit);
        if (!error && data) {
            if (data.length < newLimit) setHasMoreMessages(false);
            setMensajes(data.reverse());
            setLimit(newLimit);
            setTimeout(() => {
                if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - previousHeight;
            }, 50);
        }
        setLoadingMessages(false);
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || !selectedUser || !user || !empresaActiva) return;
        const text = newMessage.trim();
        let finalMessage = text;
        if (selectedContext) {
            finalMessage = `[CONTEXT:${selectedContext.type}:${selectedContext.id}:${selectedContext.label}]|${text}`;
        }
        
        setNewMessage('');
        setSelectedContext(null);
        
        const tempMsg = { 
            id: 'temp-'+Date.now(), 
            created_at: new Date().toISOString(), 
            de_usuario: user.email, 
            para_usuario: selectedUser.email, 
            mensaje: finalMessage, 
            leido: false, 
            isOptimistic: true 
        };
        
        setMensajes(prev => [...prev, tempMsg]);
        
        const { data, error } = await supabase.from('mensajes_chat').insert([{ 
            de_usuario: user.email, 
            para_usuario: selectedUser.email, 
            mensaje: finalMessage, 
            empresa_id: empresaActiva.id 
        }]).select().single();
        if (error) {
            toast.error('No se pudo enviar');
            setMensajes(prev => prev.filter(m => m.id !== tempMsg.id));
        } else {
            setMensajes(prev => prev.map(m => m.id === tempMsg.id ? data : m));
            // Bring this contact to top
            setUsuarios(prev => {
                const updated = prev.map(u => u.email === selectedUser.email ? { ...u, lastMessageAt: data.created_at } : u);
                return [...updated].sort((a, b) => {
                    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
                    if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
                    if (a.lastMessageAt) return -1;
                    if (b.lastMessageAt) return 1;
                    return (a.nombre || '').localeCompare(b.nombre || '');
                });
            });
        }
    };

    const handleSendTask = async (e) => {
        e?.preventDefault();
        if (!taskForm.titulo.trim() || !user || !empresaActiva || taskForm.asignado_a.length === 0) return;
        setSendingTask(true);
        const textMessage = `[TAREA_ASIGNADA]|${taskForm.titulo.trim()}|${taskForm.descripcion.trim()}|${taskForm.fecha_vencimiento || ''}`;
        try {
            const { count } = await supabase.from('tareas_tablero').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('estado', 'Pendiente');
            const { error: taskError } = await supabase.from('tareas_tablero').insert([{
                titulo: taskForm.titulo.trim(), descripcion: taskForm.descripcion.trim() || null, estado: 'Pendiente', asignado_a: taskForm.asignado_a.join(','),
                fecha_vencimiento: taskForm.fecha_vencimiento || null, orden: count || 0, empresa_id: empresaActiva.id, checklist: []
            }]);
            if (taskError) throw taskError;
            const msgs = taskForm.asignado_a.map(email => ({ de_usuario: user.email, para_usuario: email, mensaje: textMessage, empresa_id: empresaActiva.id }));
            await supabase.from('mensajes_chat').insert(msgs);
            toast.success('Tarea asignada');
            setIsTaskModalOpen(false);
            setTaskForm({ titulo: '', descripcion: '', fecha_vencimiento: '', asignado_a: [] });
        } catch (error) { toast.error('Error al asignar'); }
        finally { setSendingTask(true); }
    };

    return {
        user, usuarios, selectedUser, setSelectedUser, mensajes, newMessage, setNewMessage,
        loadingUsers, loadingMessages, isTaskModalOpen, setIsTaskModalOpen, taskForm, setTaskForm,
        sendingTask, hasMoreMessages, isMobile, messagesEndRef, topRef, scrollContainerRef,
        handleSend, handleSendTask, loadMoreMessages,
        selectedContext, setSelectedContext
    };
};
