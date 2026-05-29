import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Novedad, NovedadComentario } from '../types/novedades';
import { useAuth } from '../contexts/AuthContext';

export function useNovedades() {
    const { empresaActiva, user, role, avatarUrl } = useAuth();
    const [novedades, setNovedades] = useState<Novedad[]>([]);
    const [historias, setHistorias] = useState<Novedad[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNovedades = useCallback(async () => {
        if (!empresaActiva?.id || !user?.id) return;
        setLoading(true);

        try {
            // Optimización: Traeremos las novedades y cruzaremos los datos
            const { data, error } = await (supabase as any)
                .from('novedades')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .order('fijado', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Filtrar por roles localmente (Bypass total para Admins de moderación)
            const filtered = (data || []).filter((n: any) => {
                const userRole = role ? role.toLowerCase() : '';
                if (userRole === 'admin' || userRole === 'super-admin') return true;
                if (!n.roles_permitidos || n.roles_permitidos.length === 0) return true;
                return role && n.roles_permitidos.includes(role.toLowerCase());
            });

            // Fetch Interacciones
            const novedadIds = filtered.map((n: any) => n.id);
            
            const [likesRes, comentariosRes, vistasRes, votosRes] = await Promise.all([
                novedadIds.length > 0 ? (supabase as any).from('novedades_likes').select('novedad_id, usuario_id, reaccion').in('novedad_id', novedadIds) : Promise.resolve({ data: [] }),
                novedadIds.length > 0 ? (supabase as any).from('novedades_comentarios').select('*').in('novedad_id', novedadIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
                novedadIds.length > 0 ? (supabase as any).from('novedades_vistas').select('novedad_id, usuario_id').in('novedad_id', novedadIds) : Promise.resolve({ data: [] }),
                novedadIds.length > 0 ? (supabase as any).from('novedades_votos').select('novedad_id, usuario_id, opcion_id').in('novedad_id', novedadIds) : Promise.resolve({ data: [] })
            ]);

            const likes = likesRes.data || [];
            const comentarios = comentariosRes.data || [];
            const vistas = vistasRes.data || [];
            const votos = votosRes.data || [];

            let unread = 0;

            const enriched: Novedad[] = filtered.map((n: any) => {
                const nLikes = likes.filter((l: any) => l.novedad_id === n.id);
                const nComentarios = comentarios.filter((c: any) => c.novedad_id === n.id);
                const nVistas = vistas.filter((v: any) => v.novedad_id === n.id);
                const nVotos = votos.filter((v: any) => v.novedad_id === n.id);

                const isViewed = nVistas.some((v: any) => v.usuario_id === user.id);
                if (!isViewed && n.creador_id !== user.id) {
                    unread++;
                }

                // Parse creador metadata from denormalized columns
                let creadorInfo = { 
                    nombre: n.creador_nombre || 'Usuario', 
                    avatar_emoji: n.creador_avatar || '👤',
                    avatar_url: n.creador_avatar_url || null
                };

                const myLike = nLikes.find((l: any) => l.usuario_id === user.id);

                return {
                    ...n,
                    creador: creadorInfo,
                    likes_count: nLikes.length,
                    comentarios_count: nComentarios.length,
                    comentarios: nComentarios,
                    vistas_count: nVistas.length,
                    is_liked_by_me: !!myLike,
                    my_reaction: myLike ? myLike.reaccion : null,
                    is_viewed_by_me: isViewed,
                    votos: nVotos,
                    my_vote: nVotos.find((v: any) => v.usuario_id === user.id)?.opcion_id || null
                };
            });

            // Separate Historias (last 24h) and Posts
            const now = new Date();
            const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));

            const posts = enriched.filter(n => n.tipo === 'post');
            const validHistorias = enriched.filter(n => n.tipo === 'historia' && new Date(n.created_at) > last24h);

            setNovedades(posts);
            setHistorias(validHistorias);
            setUnreadCount(unread);

        } catch (err) {
            console.error("Error cargando novedades:", err);
        } finally {
            setLoading(false);
        }
    }, [empresaActiva?.id, user?.id, role]);

    useEffect(() => {
        fetchNovedades();
    }, [fetchNovedades]);

    // Actions
    const toggleLike = async (novedadId: string, currentReaction: string | null, selectedReaction: string = '❤️') => {
        if (!user?.id) return;
        
        const isLiked = !!currentReaction;
        const isSameReaction = currentReaction === selectedReaction;
        const isRemoving = isLiked && isSameReaction;
        const isChanging = isLiked && !isSameReaction;

        // Optimistic UI update
        const updateFn = (n: any) => {
            if (n.id !== novedadId) return n;
            
            let diff = 0;
            if (isRemoving) diff = -1;
            else if (!isLiked) diff = 1;
            // If changing reaction, count stays same.

            return {
                ...n, 
                is_liked_by_me: !isRemoving,
                my_reaction: isRemoving ? null : selectedReaction, 
                likes_count: (n.likes_count || 0) + diff
            };
        };

        setNovedades(prev => prev.map(updateFn));
        setHistorias(prev => prev.map(updateFn));

        if (isRemoving) {
            await (supabase as any).from('novedades_likes').delete().match({ novedad_id: novedadId, usuario_id: user.id });
        } else if (isChanging) {
            await (supabase as any).from('novedades_likes').update({ reaccion: selectedReaction }).match({ novedad_id: novedadId, usuario_id: user.id });
        } else {
            await (supabase as any).from('novedades_likes').insert({ novedad_id: novedadId, usuario_id: user.id, reaccion: selectedReaction });
        }
    };

    const markAsViewed = async (novedadId: string) => {
        if (!user?.id) return;
        
        const isAlreadyViewed = novedades.find(n => n.id === novedadId)?.is_viewed_by_me || historias.find(n => n.id === novedadId)?.is_viewed_by_me;
        if (isAlreadyViewed) return;

        // Optimistic
        setNovedades(prev => prev.map(n => n.id === novedadId ? { ...n, is_viewed_by_me: true, vistas_count: (n.vistas_count || 0) + 1 } : n));
        setHistorias(prev => prev.map(n => n.id === novedadId ? { ...n, is_viewed_by_me: true, vistas_count: (n.vistas_count || 0) + 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await (supabase as any).from('novedades_vistas').insert({ novedad_id: novedadId, usuario_id: user.id }).select();
    };

    const addComentario = async (novedadId: string, comentario: string) => {
        if (!user?.id) return null;
        
        const { data, error } = await (supabase as any).from('novedades_comentarios').insert({
            novedad_id: novedadId,
            usuario_id: user.id,
            usuario_nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
            usuario_avatar: user.user_metadata?.avatar_emoji || '👤',
            usuario_avatar_url: avatarUrl || null,
            comentario
        }).select();

        if (error) {
            console.error("Error comentando", error);
            return null;
        }

        // Update count
        setNovedades(prev => prev.map(n => n.id === novedadId ? { ...n, comentarios_count: (n.comentarios_count || 0) + 1, comentarios: [...(n.comentarios || []), data?.[0]] } : n));
        
        return data?.[0];
    };

    const togglePin = async (novedadId: string, isCurrentlyPinned: boolean) => {
        if (!user?.id) return;
        const newStatus = !isCurrentlyPinned;
        
        // Optimistic UI
        setNovedades(prev => {
            const copy = prev.map(n => n.id === novedadId ? { ...n, fijado: newStatus } : n);
            return copy.sort((a, b) => {
                if (a.fijado && !b.fijado) return -1;
                if (!a.fijado && b.fijado) return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        });

        await (supabase as any).from('novedades').update({ fijado: newStatus }).eq('id', novedadId);
    };

    const votarEncuesta = async (novedadId: string, opcionId: string) => {
        if (!user?.id) return;

        // Optimistic UI
        setNovedades(prev => prev.map(n => {
            if (n.id !== novedadId) return n;
            const newVotos = [...(n.votos || []).filter((v: any) => v.usuario_id !== user.id), { novedad_id: novedadId, usuario_id: user.id, opcion_id: opcionId }];
            return { ...n, votos: newVotos, my_vote: opcionId };
        }));

        await (supabase as any).from('novedades_votos').upsert({
            novedad_id: novedadId,
            usuario_id: user.id,
            opcion_id: opcionId
        }, { onConflict: 'novedad_id, usuario_id' });
    };

    const toggleReaccionComentario = async (novedadId: string, comentarioId: string, selectedEmoji: string = '👍') => {
        if (!user?.id) return;

        let currentReacciones: any[] = [];
        
        setNovedades(prev => prev.map(n => {
            if (n.id !== novedadId) return n;
            
            const updatedComentarios = (n.comentarios || []).map((c: any) => {
                if (c.id !== comentarioId) return c;
                
                const arr = Array.isArray(c.reacciones) ? c.reacciones : [];
                const exists = arr.find((r: any) => r.usuario_id === user.id);
                let nextArr: any[];

                if (exists && exists.reaccion === selectedEmoji) {
                    nextArr = arr.filter((r: any) => r.usuario_id !== user.id);
                } else if (exists) {
                    nextArr = arr.map((r: any) => r.usuario_id === user.id ? { ...r, reaccion: selectedEmoji } : r);
                } else {
                    nextArr = [...arr, { usuario_id: user.id, reaccion: selectedEmoji, nombre: user.user_metadata?.nombre || 'Usuario' }];
                }
                currentReacciones = nextArr;
                return { ...c, reacciones: nextArr };
            });

            return { ...n, comentarios: updatedComentarios };
        }));

        try {
            await (supabase as any).from('novedades_comentarios').update({ reacciones: currentReacciones }).eq('id', comentarioId);
        } catch (err) {
            console.error("Error persisting comment reaction:", err);
        }
    };

    return {
        novedades,
        historias,
        loading,
        unreadCount,
        refresh: fetchNovedades,
        toggleLike,
        markAsViewed,
        addComentario,
        togglePin,
        votarEncuesta,
        toggleReaccionComentario
    };
}
