import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, Empresa } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface ChatUser {
    email: string;
    nombre: string | null;
    role: string | null;
    avatar_url: string | null;
    avatar_emoji: string | null;
    unreadCount?: number;
    lastMessageAt?: string | null;
}

export interface ChatMessage {
    id: string | number;
    created_at: string;
    de_usuario: string;
    para_usuario: string;
    mensaje: string;
    leido: boolean;
    empresa_id?: string;
    isOptimistic?: boolean;
}

export interface ChatContext {
    type: string;
    id: string;
    label: string;
}

export const useChat = () => {
    const { user, empresaActiva } = useAuth();
    const [usuarios, setUsuarios] = useState<ChatUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskForm, setTaskForm] = useState({ titulo: '', descripcion: '', fecha_vencimiento: '', asignado_a: [] as string[] });
    const [sendingTask, setSendingTask] = useState(false);
    const [limit, setLimit] = useState(25);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [selectedContext, setSelectedContext] = useState<ChatContext | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchUsers = useCallback(async () => {
        if (!user || !empresaActiva?.id) return;
        setLoadingUsers(true);

        const { data: usersData, error: usersError } = await (supabase as any)
            .rpc('get_chat_users', { empresa_id_param: empresaActiva.id });

        if (usersError) {
            toast.error('Error al cargar contactos');
            setLoadingUsers(false);
            return;
        }

        const mappedUsers: ChatUser[] = (usersData || []).map((u: any) => ({
            email: u.user_email,
            nombre: u.user_nombre,
            role: u.user_role,
            avatar_url: u.user_avatar_url,
            avatar_emoji: u.user_avatar_emoji
        }));

        const filteredUsers = mappedUsers.filter(u => u.email !== user.email);

        const { data: interactionData, error: interactionError } = await supabase
            .from('mensajes_chat')
            .select('de_usuario, para_usuario, leido, created_at')
            .or(`para_usuario.eq.${user.email},de_usuario.eq.${user.email}`)
            .eq('empresa_id', empresaActiva.id)
            .order('created_at', { ascending: false });

        let userStats: Record<string, { unreadCount: number, lastMessageAt: string }> = {};
        if (!interactionError && interactionData) {
            interactionData.forEach(msg => {
                const partnerEmail = msg.de_usuario === user.email ? msg.para_usuario : msg.de_usuario;
                if (!partnerEmail) return;
                if (!userStats[partnerEmail]) {
                    userStats[partnerEmail] = { unreadCount: 0, lastMessageAt: msg.created_at };
                }
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
            if (a.unreadCount !== (b.unreadCount || 0)) return (b.unreadCount || 0) - (a.unreadCount || 0);
            if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
            if (a.lastMessageAt) return -1;
            if (b.lastMessageAt) return 1;
            return (a.nombre || a.email).toLowerCase().localeCompare((b.nombre || b.email).toLowerCase());
        });

        setUsuarios(combined);
        setLoadingUsers(false);
    }, [user, empresaActiva]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const marcarComoLeidos = useCallback(async (remitenteEmail: string) => {
        if (!user || !empresaActiva?.id || !user.email) return;
        setUsuarios(prev => prev.map(u => u.email === remitenteEmail ? { ...u, unreadCount: 0 } : u));
        await supabase
            .from('mensajes_chat')
            .update({ leido: true } as any)
            .eq('de_usuario', remitenteEmail)
            .eq('para_usuario', user.email)
            .eq('empresa_id', empresaActiva.id)
            .eq('leido', false);
        window.dispatchEvent(new CustomEvent('chat-messages-read'));
    }, [user, empresaActiva]);

    useEffect(() => {
        if (!user || !empresaActiva?.id || !user.email) return;
        const channel = supabase
            .channel('chat_updates')
            .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'mensajes_chat', filter: `para_usuario=eq.${user.email}` },
                (payload: any) => {
                    const msg = payload.new as ChatMessage;
                    setMensajes(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, { ...msg, leido: !!msg.leido }]);
                    if (msg.de_usuario !== user.email) {
                        setUsuarios(prev => {
                            const updated = prev.map(u => u.email === msg.de_usuario ? { 
                                ...u, 
                                unreadCount: selectedUser?.email === u.email ? 0 : (u.unreadCount || 0) + 1, 
                                lastMessageAt: msg.created_at 
                            } : u);
                            return [...updated].sort((a, b) => {
                                if (a.unreadCount !== (b.unreadCount || 0)) return (b.unreadCount || 0) - (a.unreadCount || 0);
                                if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
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
        if (!selectedUser || !user || !empresaActiva?.id || !user.email) return;
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
            if (!error && data) {
                const formatted = (data as any[]).map(m => ({ ...m, leido: !!m.leido })) as ChatMessage[];
                setMensajes(formatted.reverse());
                if (data.length < 25) setHasMoreMessages(false);
                marcarComoLeidos(selectedUser.email);
            }
            setLoadingMessages(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };
        fetchMsgs();
    }, [selectedUser, user, empresaActiva, marcarComoLeidos]);

    const loadMoreMessages = async () => {
        if (!hasMoreMessages || loadingMessages || !selectedUser || !user || !empresaActiva || !user.email) return;
        const previousHeight = scrollContainerRef.current?.scrollHeight || 0;
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
            const formatted = (data as any[]).map(m => ({ ...m, leido: !!m.leido })) as ChatMessage[];
            setMensajes(formatted.reverse());
            setLimit(newLimit);
            setTimeout(() => {
                if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - previousHeight;
            }, 50);
        }
        setLoadingMessages(false);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !selectedUser || !user || !empresaActiva || !user.email) return;
        const text = newMessage.trim();
        let finalMessage = text;
        if (selectedContext) {
            finalMessage = `[CONTEXT:${selectedContext.type}:${selectedContext.id}:${selectedContext.label}]|${text}`;
        }
        
        setNewMessage('');
        setSelectedContext(null);
        
        const tempMsg: ChatMessage = { 
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
        }] as any).select().single();
        if (error) {
            toast.error('No se pudo enviar');
            setMensajes(prev => prev.filter(m => m.id !== tempMsg.id));
        } else if (data) {
            const formatted = { ...data, leido: !!data.leido } as ChatMessage;
            setMensajes(prev => prev.map(m => m.id === tempMsg.id ? formatted : m));
            setUsuarios(prev => {
                const updated = prev.map(u => u.email === selectedUser.email ? { ...u, lastMessageAt: data.created_at } : u);
                return [...updated].sort((a, b) => {
                    if (a.unreadCount !== (b.unreadCount || 0)) return (b.unreadCount || 0) - (a.unreadCount || 0);
                    if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                    if (a.lastMessageAt) return -1;
                    if (b.lastMessageAt) return 1;
                    return (a.nombre || '').localeCompare(b.nombre || '');
                });
            });
        }
    };

    const handleSendTask = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!taskForm.titulo.trim() || !user || !empresaActiva || taskForm.asignado_a.length === 0) return;
        setSendingTask(true);
        const textMessage = `[TAREA_ASIGNADA]|${taskForm.titulo.trim()}|${taskForm.descripcion.trim()}|${taskForm.fecha_vencimiento || ''}`;
        try {
            const { count } = await (supabase as any).from('tareas_tablero').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('estado', 'Pendiente');
            const { error: taskError } = await (supabase as any).from('tareas_tablero').insert([{
                titulo: taskForm.titulo.trim(), descripcion: taskForm.descripcion.trim() || null, estado: 'Pendiente', asignado_a: taskForm.asignado_a.join(','),
                fecha_vencimiento: taskForm.fecha_vencimiento || null, orden: count || 0, empresa_id: empresaActiva.id, checklist: []
            }]);
            if (taskError) throw taskError;
            const msgs = taskForm.asignado_a.map(email => ({ 
                de_usuario: user.email as string, 
                para_usuario: email, 
                mensaje: textMessage, 
                empresa_id: empresaActiva.id 
            }));
            await (supabase as any).from('mensajes_chat').insert(msgs);
            toast.success('Tarea asignada');
            setIsTaskModalOpen(false);
            setTaskForm({ titulo: '', descripcion: '', fecha_vencimiento: '', asignado_a: [] });
        } catch (error) { toast.error('Error al asignar'); }
        finally { setSendingTask(false); }
    };

    return {
        user, usuarios, selectedUser, setSelectedUser, mensajes, newMessage, setNewMessage,
        loadingUsers, loadingMessages, isTaskModalOpen, setIsTaskModalOpen, taskForm, setTaskForm,
        sendingTask, hasMoreMessages, isMobile, messagesEndRef, topRef, scrollContainerRef,
        handleSend, handleSendTask, loadMoreMessages,
        selectedContext, setSelectedContext,
        smartReplies: getSmartReplies(mensajes, user?.email || '')
    };
};

const getSmartReplies = (messages: ChatMessage[], currentUserEmail: string) => {
    if (messages.length === 0) return ["Hola!", "Buen día", "En qué puedo ayudarte?"];
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.de_usuario === currentUserEmail) return []; 
    
    const text = lastMsg.mensaje.toLowerCase();
    if (text.includes("precio") || text.includes("cuanto sale") || text.includes("presupuesto")) 
        return ["Te envío el catálogo", "Consulto stock y te digo", "Te paso el presupuesto ahora"];
    if (text.includes("hola") || text.includes("buen") || text.includes("que tal")) 
        return ["¡Hola!", "¡Buen día!", "¿Cómo estás?"];
    if (text.includes("gracias") || text.includes("chau") || text.includes("luego")) 
        return ["¡De nada!", "¡A vos!", "¡Saludos!", "Nos vemos"];
    if (text.includes("tarea") || text.includes("asignada") || text.includes("fijate")) 
        return ["Recibido", "Lo reviso ahora mismo", "¡Listo!", "Dale"];
    if (text.includes("reunion") || text.includes("llamada") || text.includes("visita")) 
        return ["Agendado", "Pasame la dirección", "¿A qué hora?", "Confirmo"];
    
    return ["Entendido", "Ok", "Perfecto", "Dale"];
};
