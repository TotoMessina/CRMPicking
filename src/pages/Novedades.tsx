import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { useNovedades } from '../hooks/useNovedades';
import { useAuth } from '../contexts/AuthContext';
import { Search, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoriesFeed } from '../components/novedades/StoriesFeed';
import { NovedadCard } from '../components/novedades/NovedadCard';
import { CreatePostModal, Lightbox } from '../components/novedades/NovedadesModalCrear';
import './Novedades.css';

export default function Novedades() {
    const { t } = useTranslation();
    const { 
        novedades, historias, loading, toggleLike, markAsViewed, 
        addComentario, refresh, togglePin, votarEncuesta, toggleReaccionComentario 
    } = useNovedades();
    const { user, role, empresaActiva, avatarUrl } = useAuth();
    
    const canPost = role === 'admin' || role === 'super-admin' || role === 'recursos-humanos';

    const [isCreating, setIsCreating] = useState(false);
    const [openComments, setOpenComments] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [lightboxMedia, setLightboxMedia] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'todos' | 'posts' | 'encuestas' | 'media'>('todos');
    const [companyUsers, setCompanyUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsers = async () => {
            const { data: usersData } = await supabase
                .rpc('get_chat_users', { empresa_id_param: empresaActiva.id });
            if (usersData) {
                const mapped = usersData.map((u: any) => ({
                    id: u.user_email,
                    nombre: u.user_nombre || u.user_email?.split('@')[0] || 'Usuario',
                    email: u.user_email,
                    avatar_emoji: u.user_avatar_emoji || '👤',
                    avatar_url: u.user_avatar_url || null
                }));
                setCompanyUsers(mapped);
            }
        };
        fetchUsers();
    }, [empresaActiva?.id]);

    const handleCommentSubmit = async (novedadId: string) => {
        if (!newComment.trim()) return;
        await addComentario(novedadId, newComment);
        setNewComment('');
    };

    const filteredNovedades = novedades.filter(n => {
        const contentMatch = (n.contenido || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (n.creador_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!contentMatch) return false;

        if (activeFilter === 'todos') return true;
        if (activeFilter === 'posts') return n.tipo === 'post' && !n.encuesta;
        if (activeFilter === 'encuestas') return !!n.encuesta;
        if (activeFilter === 'media') return n.media_urls && n.media_urls.length > 0;
        
        return true;
    });

    return (
        <div className="nov-container">
            <div className="nov-header">
                <div>
                    <h1 className="nov-title">{t('news.title')}</h1>
                    <p className="nov-subtitle">{t('news.subtitle', { company: empresaActiva?.nombre })}</p>
                </div>
                {canPost && (
                    <button className="btn-primary" onClick={() => setIsCreating(true)}>
                        <Send size={16} /> {t('common.publish')}
                    </button>
                )}
            </div>

            <div className="nov-filters-bar">
                <div className="nov-filter-input-wrapper">
                    <Search size={16} className="nov-filter-search-icon" />
                    <input 
                        type="text" 
                        placeholder={t('news.search_placeholder')} 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="nov-filter-input"
                    />
                </div>
                <div className="nov-filter-pills-group">
                    {[
                        { id: 'todos', label: t('common.all') },
                        { id: 'posts', label: t('news.filters.posts') },
                        { id: 'encuestas', label: t('news.filters.polls') },
                        { id: 'media', label: t('news.filters.media') }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id as any)}
                            className={`nov-filter-pill ${activeFilter === f.id ? 'active' : ''}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {historias.length > 0 && (
                <StoriesFeed historias={historias} markAsViewed={markAsViewed} />
            )}

            <AnimatePresence>
                {isCreating && (
                    <CreatePostModal 
                        onClose={() => setIsCreating(false)} 
                        user={user} 
                        empresaActiva={empresaActiva} 
                        refresh={refresh} 
                        avatarUrl={avatarUrl}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {lightboxMedia && (
                    <Lightbox 
                        mediaUrl={lightboxMedia} 
                        onClose={() => setLightboxMedia(null)} 
                    />
                )}
            </AnimatePresence>

            <div className="nov-feed">
                {loading ? (
                    <div className="nov-loading">{t('news.loading')}</div>
                ) : novedades.length === 0 ? (
                    <div className="nov-empty">{t('news.empty')}</div>
                ) : filteredNovedades.length === 0 ? (
                    <div className="nov-empty">{t('news.no_results')}</div>
                ) : (
                    filteredNovedades.map(n => (
                        <NovedadCard 
                            key={n.id} 
                            post={n} 
                            user={user}
                            toggleLike={toggleLike} 
                            markAsViewed={markAsViewed}
                            openComments={openComments === n.id}
                            setOpenComments={() => setOpenComments(openComments === n.id ? null : n.id)}
                            newComment={newComment}
                            setNewComment={setNewComment}
                            handleCommentSubmit={() => handleCommentSubmit(n.id)}
                            setLightboxMedia={setLightboxMedia}
                            togglePin={togglePin}
                            votarEncuesta={votarEncuesta}
                            companyUsers={companyUsers}
                            empresaActiva={empresaActiva}
                            toggleReaccionComentario={toggleReaccionComentario}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
