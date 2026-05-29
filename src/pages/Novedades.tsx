import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNovedades } from '../hooks/useNovedades';
import { useAuth } from '../contexts/AuthContext';
import { Heart, MessageCircle, Eye, Image as ImageIcon, Video, Send, X, MoreVertical, ChevronLeft, ChevronRight, Download, Pin, Share2, Search, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { aiProvider } from '../lib/aiProvider';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import './Novedades.css';

export default function Novedades() {
    const { t } = useTranslation();
    const { novedades, historias, loading, toggleLike, markAsViewed, addComentario, refresh, togglePin, votarEncuesta, toggleReaccionComentario } = useNovedades();
    const { user, role, empresaActiva, avatarUrl } = useAuth();
    
    const canPost = role === 'admin' || role === 'super-admin' || role === 'recursos-humanos';

    const [isCreating, setIsCreating] = useState(false);

    const [openComments, setOpenComments] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
    const [lightboxMedia, setLightboxMedia] = useState<string | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'todos' | 'posts' | 'encuestas' | 'media'>('todos');

    const [companyUsers, setCompanyUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsers = async () => {
            const { data: usersData } = await (supabase as any)
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
                <div className="nov-stories-wrapper">
                    <div className="nov-stories-scroll">
                        {historias.map((h, index) => (
                            <div key={h.id} className={`nov-story ${h.is_viewed_by_me ? 'viewed' : ''}`} onClick={() => setActiveStoryIndex(index)}>
                                <div className="nov-story-ring">
                                    <div className="nov-story-img">
                                        {h.creador?.avatar_url ? (
                                            <img src={h.creador.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            h.creador?.avatar_emoji || '👤'
                                        )}
                                    </div>
                                </div>
                                <span className="nov-story-name">{h.creador?.nombre?.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
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
                {activeStoryIndex !== null && (
                    <StoriesViewer 
                        historias={historias} 
                        initialIndex={activeStoryIndex} 
                        onClose={() => setActiveStoryIndex(null)} 
                        markAsViewed={markAsViewed} 
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
                        <FeedPost 
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

function StoriesViewer({ historias, initialIndex, onClose, markAsViewed }: any) {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const story = historias[currentIndex];

    const handleNext = () => {
        if (currentIndex < historias.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setProgress(0);
            setIsMediaLoaded(false);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setProgress(0);
            setIsMediaLoaded(false);
        }
    };

    useEffect(() => {
        if (!story) return;
        markAsViewed(story.id);
        
        // If it's just text, set loaded immediately
        if (!story.media_urls?.[0]) {
            setIsMediaLoaded(true);
        }
    }, [currentIndex, story]);

    useEffect(() => {
        if (!isMediaLoaded) return;
        
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + 2; // Smooth progress
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isMediaLoaded, currentIndex]);

    if (!story) return null;
    const isVideo = story.media_urls?.[0]?.match(/\.(mp4|webm|ogg)$/i) || story.media_urls?.[0]?.includes('video');

    return createPortal(
        <motion.div className="nov-viewer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="nov-viewer-close" onClick={onClose}><X size={32} color="white" /></button>
            <div className="nov-viewer-container">
                <div className="nov-viewer-bars">
                    {historias.map((_: any, i: number) => (
                        <div key={i} className="nov-viewer-bar-bg">
                            <div className="nov-viewer-bar-fill" style={{ width: i < currentIndex ? '100%' : (i === currentIndex ? `${progress}%` : '0%') }} />
                        </div>
                    ))}
                </div>
                <div className="nov-viewer-header">
                    <div className="nov-post-avatar" style={{ width: 32, height: 32 }}>
                        {story.creador?.avatar_url ? (
                            <img src={story.creador.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            story.creador?.avatar_emoji || '👤'
                        )}
                    </div>
                    <span style={{ color: 'white', fontWeight: 600 }}>{story.creador?.nombre}</span>
                </div>
                <div className="nov-viewer-content">
                    {!isMediaLoaded && (
                        <div className="nov-viewer-loader" style={{ position: 'absolute', color: '#fff' }}>{t('common.loading')}</div>
                    )}
                    {story.media_urls?.[0] ? (
                        isVideo ? (
                            <video 
                                src={story.media_urls[0]} 
                                autoPlay 
                                muted 
                                loop 
                                playsInline 
                                onCanPlayThrough={() => setIsMediaLoaded(true)}
                                className="nov-viewer-media" 
                                style={{ opacity: isMediaLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                            />
                        ) : (
                            <img 
                                src={story.media_urls[0]} 
                                alt="Story" 
                                onLoad={() => setIsMediaLoaded(true)}
                                className="nov-viewer-media" 
                                style={{ opacity: isMediaLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                            />
                        )
                    ) : (
                        <div className="nov-viewer-text">{story.contenido}</div>
                    )}
                    {story.contenido && story.media_urls?.[0] && isMediaLoaded && <div className="nov-viewer-caption">{story.contenido}</div>}
                </div>
                <div className="nov-viewer-nav prev" onClick={(e) => { e.stopPropagation(); handlePrev(); }}></div>
                <div className="nov-viewer-nav next" onClick={(e) => { e.stopPropagation(); handleNext(); }}></div>
            </div>
        </motion.div>,
        document.body
    );
}

function FeedPost({ post, user, toggleLike, markAsViewed, openComments, setOpenComments, newComment, setNewComment, handleCommentSubmit, setLightboxMedia, togglePin, votarEncuesta, companyUsers, empresaActiva, toggleReaccionComentario }: any) {
    const { t } = useTranslation();
    const [showMenu, setShowMenu] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [showBigHeart, setShowBigHeart] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const [isSharing, setIsSharing] = useState(false);
    
    // AI state
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);

    const handleSummarize = async () => {
        if (isSummarizing || aiSummary) return;
        setIsSummarizing(true);
        try {
            const res = await aiProvider.summarizePost(post.contenido || '');
            setAiSummary(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSummarizing(false);
        }
    };
    
    // Mentions state
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [mentionCursor, setMentionCursor] = useState(0);

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewComment(val);
        
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
        
        if (lastAtMatch) {
            setShowMentions(true);
            const q = lastAtMatch[1].toLowerCase();
            setMentionQuery(q);
            setFilteredUsers(companyUsers?.filter((u: any) => u.nombre.toLowerCase().includes(q)).slice(0, 5) || []);
            setMentionCursor(lastAtMatch.index || 0);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (u: any) => {
        const before = newComment.slice(0, mentionCursor);
        const insertion = `@[${u.nombre}] `;
        const after = newComment.slice(mentionCursor + mentionQuery.length + 1);
        setNewComment(before + insertion + after);
        setShowMentions(false);
    };

    const renderCommentText = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(@\[.*?\])/g);
        return parts.map((part, i) => {
            if (part.startsWith('@[') && part.endsWith(']')) {
                const name = part.substring(2, part.length - 1);
                return <span key={i} style={{ color: 'var(--primary)', fontWeight: 600 }}>@{name}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };
    const videoRef = useRef<HTMLVideoElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    
    const clickTimerRef = useRef<any>(null);
    const lastTapRef = useRef<number>(0);

    const reactionOptions = ['â¤ï¸', 'ðŸŽ‰', 'ðŸ‘', 'ðŸ’¡', 'ðŸ˜®'];

    const handleMediaClick = (url: string) => {
        const now = Date.now();
        const isDouble = (now - lastTapRef.current < 300);

        if (isDouble) {
            if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
            }
            setShowBigHeart(true);
            setTimeout(() => setShowBigHeart(false), 800);
            if (post.my_reaction !== 'â¤ï¸') {
                toggleLike(post.id, post.my_reaction, 'â¤ï¸');
            }
        } else {
            clickTimerRef.current = setTimeout(() => {
                setLightboxMedia(url);
                clickTimerRef.current = null;
            }, 300);
        }
        lastTapRef.current = now;
    };

    const handleScrollNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: carouselRef.current.clientWidth, behavior: 'smooth' });
        }
    };

    const handleScrollPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -carouselRef.current.clientWidth, behavior: 'smooth' });
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('news.confirm_delete'))) return;
        await (supabase as any).from('novedades').delete().eq('id', post.id);
        window.location.reload();
    };

    return (
        <div className="nov-post" onMouseEnter={() => !post.is_viewed_by_me && markAsViewed(post.id)}>
            <div className="nov-post-header">
                <div className="nov-post-avatar">
                    {post.creador?.avatar_url ? (
                        <img src={post.creador.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        post.creador?.avatar_emoji || '👤'
                    )}
                </div>
                <div className="nov-post-meta">
                    <h4>
                        {post.creador?.nombre || 'Usuario'} 
                        {post.fijado && <Pin size={14} color="#6366f1" style={{ marginLeft: 6 }} />}
                    </h4>
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}</span>
                </div>
                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                    {(post.creador_id === user?.id || user?.role === 'super-admin') && (
                        <button className="icon-btn" onClick={() => setShowMenu(!showMenu)}><MoreVertical size={16} /></button>
                    )}
                    {showMenu && (
                        <div className="nov-dropdown">
                            <button onClick={() => { togglePin(post.id, post.fijado); setShowMenu(false); }} className="nov-dropdown-item">
                                {post.fijado ? t('news.actions.unpin') : t('news.actions.pin')}
                            </button>
                            <button onClick={handleDelete} className="nov-dropdown-item text-danger">{t('common.delete')}</button>
                        </div>
                    )}
                </div>
            </div>

            {post.contenido && <div className="nov-post-content">{post.contenido}</div>}

            {/* InsideBot AI Summary */}
            {post.contenido && post.contenido.length > 120 && (
                <div className="nov-ai-wrapper" style={{ padding: '0 16px 12px' }}>
                    {!aiSummary ? (
                        <button 
                            onClick={handleSummarize}
                            disabled={isSummarizing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent)',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '4px 0',
                                opacity: isSummarizing ? 0.6 : 1,
                                letterSpacing: '0.5px'
                            }}
                        >
                            <Sparkles size={14} /> 
                            {isSummarizing ? t('news.actions.ai_processing') : t('news.actions.ai_summarize')}
                        </button>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(139, 92, 246, 0.06)',
                                border: '1px dashed rgba(139, 92, 246, 0.3)',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                position: 'relative',
                                marginTop: '4px'
                            }}
                        >
                            <button 
                                onClick={() => setAiSummary(null)}
                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={14} />
                            </button>
                            <div style={{ fontSize: '0.86rem', lineHeight: '1.5', whiteSpace: 'pre-line', color: 'var(--text)' }}>
                                {aiSummary}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {post.encuesta && (
                <div className="nov-poll-container" style={{ margin: '12px 16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    {post.encuesta.map((opt: any) => {
                        const totalVotos = post.votos?.length || 0;
                        const votosOpcion = post.votos?.filter((v: any) => v.opcion_id === opt.id).length || 0;
                        const porcentaje = totalVotos > 0 ? (votosOpcion / totalVotos) * 100 : 0;
                        const showResults = post.my_vote !== null || post.creador_id === user?.id;
                        
                        return (
                            <div key={opt.id} style={{ marginBottom: 12, position: 'relative' }}>
                                <button 
                                    onClick={() => !post.my_vote && votarEncuesta(post.id, opt.id)}
                                    style={{
                                        width: '100%',
                                        position: 'relative',
                                        background: showResults ? 'transparent' : 'var(--bg-tertiary)',
                                        border: `1px solid ${post.my_vote === opt.id ? 'var(--primary)' : 'var(--border-color)'}`,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        textAlign: 'left',
                                        cursor: post.my_vote ? 'default' : 'pointer',
                                        overflow: 'hidden',
                                        color: 'var(--text-primary)',
                                        fontWeight: post.my_vote === opt.id ? '600' : '400',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {showResults && (
                                        <div style={{
                                            position: 'absolute', left: 0, top: 0, bottom: 0, 
                                            width: `${porcentaje}%`, 
                                            background: post.my_vote === opt.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            transition: 'width 0.5s ease',
                                            zIndex: 0
                                        }} />
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                        <span>{opt.texto}</span>
                                        {showResults && <span>{Math.round(porcentaje)}%</span>}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: 4 }}>
                        {post.votos?.length || 0} {t('news.poll_votes')}
                    </div>
                </div>
            )}

            {post.media_urls && post.media_urls.length > 0 && (
                <div className="nov-media-carousel-wrapper" style={{ position: 'relative' }}>
                    
                    {/* Navigation Arrows (Visible conditionally on desktop) */}
                    {post.media_urls.length > 1 && activeSlide > 0 && (
                        <button className="nov-carousel-nav-btn prev" onClick={handleScrollPrev}>
                            <ChevronLeft size={20} color="white" />
                        </button>
                    )}
                    {post.media_urls.length > 1 && activeSlide < post.media_urls.length - 1 && (
                        <button className="nov-carousel-nav-btn next" onClick={handleScrollNext}>
                            <ChevronRight size={20} color="white" />
                        </button>
                    )}

                    <div 
                        ref={carouselRef}
                        className="nov-media-carousel" 
                        onScroll={(e: any) => {
                            const width = e.target.clientWidth;
                            const index = Math.round(e.target.scrollLeft / width);
                            if (index !== activeSlide) setActiveSlide(index);
                        }}
                    >
                        {post.media_urls.map((url: string, i: number) => {
                            const isVideo = url.match(/\.(mp4|webm|ogg)$/i) || url.includes('video');
                            return (
                                <div key={i} className="nov-media-slide">
                                    {isVideo ? (
                                        <video 
                                            ref={videoRef} 
                                            src={url} 
                                            muted 
                                            loop 
                                            playsInline 
                                            onMouseEnter={() => videoRef.current?.play()} 
                                            onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }} 
                                            onClick={() => handleMediaClick(url)}
                                            className="nov-media-item" 
                                            style={{ cursor: 'pointer' }}
                                        />
                                    ) : (
                                        <img 
                                            src={url} 
                                            alt="Media" 
                                            onClick={() => handleMediaClick(url)}
                                            className="nov-media-item" 
                                            style={{ cursor: 'pointer' }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Big floating heart animation */}
                    <AnimatePresence>
                        {showBigHeart && (
                            <motion.div 
                                initial={{ scale: 0, opacity: 0, y: -20 }}
                                animate={{ scale: [0, 1.6, 1.2], opacity: [0, 1, 0], rotate: [0, -10, 10, 0] }}
                                exit={{ opacity: 0 }}
                                className="nov-big-heart-animation"
                                style={{ position: 'absolute', top: '50%', left: '50%', x: '-50%', y: '-50%', fontSize: '5rem', pointerEvents: 'none', zIndex: 10 }}
                            >
                                ❤️ 
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Dots Indicator */}
                    {post.media_urls.length > 1 && (
                        <div className="nov-carousel-dots">
                            {post.media_urls.map((_: any, i: number) => (
                                <span key={i} className={`nov-dot ${activeSlide === i ? 'active' : ''}`} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="nov-post-actions" style={{ overflow: 'visible' }}>
                <div 
                    className="nov-like-container" 
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setShowReactions(true)}
                    onMouseLeave={() => setShowReactions(false)}
                >
                    <AnimatePresence>
                        {showReactions && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: -45, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="nov-reactions-popover"
                                style={{ position: 'absolute', bottom: '100%', left: 0, display: 'flex', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '30px', padding: '6px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 20 }}
                            >
                                {reactionOptions.map(r => (
                                    <button 
                                        key={r} 
                                        onClick={(e) => { e.stopPropagation(); toggleLike(post.id, post.my_reaction, r); setShowReactions(false); }}
                                        style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: '2px 4px', transition: 'transform 0.1s' }}
                                        className="nov-emoji-select-btn"
                                    >
                                        {r}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button 
                        className={`nov-action-btn ${post.is_liked_by_me ? 'liked' : ''}`} 
                        onClick={() => toggleLike(post.id, post.my_reaction, '❤️')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {post.is_liked_by_me ? (
                            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{post.my_reaction || '❤️'}</span>
                        ) : (
                            <Heart size={18} />
                        )} 
                        <span>{post.likes_count || 0}</span>
                    </button>
                </div>

                <button className="nov-action-btn" onClick={setOpenComments}><MessageCircle size={18} /> <span>{post.comentarios_count || 0}</span></button>
                <button className="nov-action-btn" onClick={() => setIsSharing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Share2 size={18} /> <span>{t('news.actions.share')}</span></button>
                <div className="nov-views"><Eye size={16} /> {post.vistas_count || 0}</div>
            </div>

            {openComments && (
                <div className="nov-comments-section">
                    <div className="nov-comments-list">
                        {(post.comentarios || []).map((c: any, i: number) => (
                            <div key={i} className="nov-comment">
                                <span className="nov-comment-avatar">
                                    {c.usuario_avatar_url ? (
                                        <img src={c.usuario_avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        c.usuario_avatar || '👤'
                                    )}
                                </span>
                                <div className="nov-comment-body">
                                    <span className="nov-comment-author">{c.usuario_nombre || 'Usuario'}</span>
                                    <span className="nov-comment-text">{renderCommentText(c.comentario)}</span>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: false, locale: es }) : 'hace un momento'}
                                        </span>
                                        <button 
                                            onClick={() => toggleReaccionComentario(post.id, c.id, '👍')}
                                            style={{ 
                                                background: 'none', 
                                                border: 'none', 
                                                padding: 0, 
                                                cursor: 'pointer',
                                                color: (c.reacciones || []).some((r: any) => r.usuario_id === user?.id) ? 'var(--accent)' : 'var(--text-muted)',
                                                fontWeight: (c.reacciones || []).some((r: any) => r.usuario_id === user?.id) ? '700' : '500',
                                                transition: 'color 0.2s ease'
                                            }}
                                        >
                                            {t('news.actions.like')}
                                        </button>
                                        {Array.isArray(c.reacciones) && c.reacciones.length > 0 && (
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                background: 'var(--bg-secondary)', 
                                                padding: '1px 6px', 
                                                borderRadius: '10px', 
                                                border: '1px solid var(--border-color)',
                                                gap: '3px',
                                                color: 'var(--text-primary)',
                                                marginLeft: 'auto'
                                            }}>
                                                <span>👍</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{c.reacciones.length}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="nov-comments-input" style={{ position: 'relative' }}>
                        {showMentions && filteredUsers.length > 0 && (
                            <div className="nov-mentions-dropdown" style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '8px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                                {filteredUsers.map(u => (
                                    <div 
                                        key={u.id} 
                                        onClick={() => insertMention(u)}
                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.nombre}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <input type="text" placeholder="Comenta..." value={newComment} onChange={handleCommentChange} onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()} />
                        <button onClick={handleCommentSubmit} disabled={!newComment.trim()}><Send size={16} /></button>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isSharing && (
                    <ShareModal 
                        post={post}
                        companyUsers={companyUsers}
                        currentUserEmail={user?.email}
                        empresaId={empresaActiva?.id}
                        onClose={() => setIsSharing(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function Lightbox({ mediaUrl, onClose }: { mediaUrl: string; onClose: () => void }) {
    const isVideo = mediaUrl.match(/\.(mp4|webm|ogg)$/i) || mediaUrl.includes('video');
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloading(true);
        try {
            const response = await fetch(mediaUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            
            // Pull file ext or default
            const extension = mediaUrl.split('.').pop()?.split('?')[0] || (isVideo ? 'mp4' : 'jpg');
            link.download = `insideup_media_${Date.now()}.${extension}`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed, fallback to new tab:", error);
            window.open(mediaUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    return createPortal(
        <motion.div 
            className="nov-lightbox-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)',
                zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'
            }}
        >
            {/* Actions Bar */}
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 16, zIndex: 10 }}>
                <button 
                    onClick={handleDownload} 
                    style={{ 
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                        color: 'white', borderRadius: '30px', padding: '8px 16px', display: 'flex', alignItems: 'center', 
                        gap: 8, cursor: 'pointer', fontSize: '0.9rem' 
                    }}
                >
                    <Download size={18} /> {downloading ? 'Guardando...' : 'Descargar Original'}
                </button>
                <button 
                    onClick={onClose} 
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>
            </div>

            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '90%', maxHeight: '85%', display: 'flex', justifyContent: 'center' }}
            >
                {isVideo ? (
                    <video src={mediaUrl} controls autoPlay className="nov-lightbox-media" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                ) : (
                    <img src={mediaUrl} alt="Full size" className="nov-lightbox-media" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                )}
            </motion.div>
        </motion.div>,
        document.body
    );
}

function CreatePostModal({ onClose, user, empresaActiva, refresh, avatarUrl }: any) {
    const { t } = useTranslation();
    const [createTipo, setCreateTipo] = useState<'post' | 'historia'>('post');
    const [contenido, setContenido] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isEncuesta, setIsEncuesta] = useState(false);
    const [encuestaOptions, setEncuestaOptions] = useState(['', '']);
    
    const [isPreview, setIsPreview] = useState(false);
    
    const [roles, setRoles] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchRoles = async () => {
            const { data } = await (supabase as any)
                .from('crm_roles')
                .select('nombre')
                .or(`empresa_id.eq.${empresaActiva.id},empresa_id.is.null`);
            
            if (data) {
                const disabledRoles = empresaActiva.config?.disabledRoles || [];
                const activeRoles = data
                    .filter((r: any) => !disabledRoles.includes(r.nombre.toLowerCase()))
                    .map((r: any) => r.nombre.toLowerCase());
                
                setRoles(Array.from(new Set(activeRoles)));
            }
        };
        fetchRoles();
    }, [empresaActiva?.id, empresaActiva?.config?.disabledRoles]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleCreate = async () => {
        if (!empresaActiva || !user) return;
        if (!contenido.trim() && files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = files.map(async (file) => {
                const isVideo = file.type.startsWith('video/');

                if (isVideo && file.size > 20 * 1024 * 1024) {
                    throw new Error(`El video "${file.name}" supera el máximo de 20MB`);
                }

                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${file.name.split('.').pop()}`;
                const filePath = `${empresaActiva.id}/${fileName}`;
                
                const { error } = await (supabase as any).storage.from('novedades_media').upload(filePath, file);
                if (error) throw error;

                return (supabase as any).storage.from('novedades_media').getPublicUrl(filePath).data.publicUrl;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            let encuestaPayload = null;
            if (isEncuesta && encuestaOptions.filter(o => o.trim() !== '').length >= 2) {
                encuestaPayload = encuestaOptions
                    .filter(o => o.trim() !== '')
                    .map((o, idx) => ({ id: idx.toString(), texto: o.trim() }));
            }

            await (supabase as any).from('novedades').insert({
                empresa_id: empresaActiva.id,
                creador_id: user.id,
                creador_nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
                creador_avatar: user.user_metadata?.avatar_emoji || '👤',
                creador_avatar_url: avatarUrl || null,
                tipo: createTipo,
                contenido: contenido.trim(),
                media_urls: uploadedUrls,
                encuesta: encuestaPayload,
                roles_permitidos: selectedRoles.length > 0 ? selectedRoles : null
            });

            onClose();
            refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return createPortal(
        <motion.div className="nov-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 2500 }}>
            <motion.div className="nov-modal" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
                <div className="nov-modal-header">
                    <h3>{isPreview ? 'Vista Previa' : 'Crear Publicación'}</h3>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="nov-modal-body">
                    {isPreview ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {createTipo === 'historia' && (
                                <div style={{ textAlign: 'center', padding: '8px', background: 'linear-gradient(45deg, #f09433, #bc1888)', color: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                                    ⚡ Se publicará en las Historias (24hs)
                                </div>
                            )}
                            <div className="nov-post" style={{ borderStyle: 'dashed', padding: '16px', background: 'var(--bg)', pointerEvents: 'none' }}>
                                <div className="nov-post-header">
                                    <div className="nov-post-avatar">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            user.user_metadata?.avatar_emoji || '👤'
                                        )}
                                    </div>
                                    <div className="nov-post-meta">
                                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario'}
                                        </h4>
                                        <span>Ahora mismo</span>
                                    </div>
                                </div>
                                {contenido && <div className="nov-post-content" style={{ fontSize: '0.95rem', margin: '12px 0', color: 'var(--text-primary)' }}>{contenido}</div>}
                                
                                {isEncuesta && encuestaOptions.filter(o => o.trim()).length > 0 && (
                                    <div className="nov-poll-container" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: 8 }}>
                                        {encuestaOptions.filter(o => o.trim()).map((opt, idx) => (
                                            <div key={idx} style={{ marginBottom: 8 }}>
                                                <div style={{ padding: '10px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                                    {opt}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {files.length > 0 && !isEncuesta && (
                                    <div className={`nov-post-media grid-${Math.min(files.length, 4)}`} style={{ marginTop: 12, borderRadius: '12px', overflow: 'hidden' }}>
                                        {files.slice(0, 4).map((f, i) => (
                                            f.type.startsWith('video/') ? (
                                                <video key={i} src={URL.createObjectURL(f)} className="nov-media-item" style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <img key={i} src={URL.createObjectURL(f)} className="nov-media-item" alt="preview" style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }} />
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="nov-type-selector">
                                <button className={`nov-type-btn ${createTipo === 'post' && !isEncuesta ? 'active' : ''}`} onClick={() => { setCreateTipo('post'); setIsEncuesta(false); }}>Muro</button>
                                <button className={`nov-type-btn ${isEncuesta ? 'active' : ''}`} onClick={() => { setCreateTipo('post'); setIsEncuesta(true); }}>Encuesta</button>
                                <button className={`nov-type-btn ${createTipo === 'historia' ? 'active' : ''}`} onClick={() => { setCreateTipo('historia'); setIsEncuesta(false); }}>Historia</button>
                            </div>
                            <textarea className="nov-textarea" placeholder={isEncuesta ? "¿Cuál es tu pregunta?" : "¿Qué hay de nuevo?"} value={contenido} onChange={e => setContenido(e.target.value)} />
                            
                            {isEncuesta && (
                                <div className="nov-poll-creator" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                    {encuestaOptions.map((opt, idx) => (
                                        <input 
                                            key={idx}
                                            type="text" 
                                            className="nov-poll-input" 
                                            placeholder={`Opción ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...encuestaOptions];
                                                newOpts[idx] = e.target.value;
                                                setEncuestaOptions(newOpts);
                                            }}
                                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    ))}
                                    {encuestaOptions.length < 4 && (
                                        <button 
                                            onClick={() => setEncuestaOptions([...encuestaOptions, ''])}
                                            style={{ padding: '6px', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer' }}
                                        >
                                            + Añadir opción
                                        </button>
                                    )}
                                </div>
                            )}

                            {files.length > 0 && !isEncuesta && (
                                <div className="nov-files-preview">
                                    {files.map((f, i) => (
                                        <div key={i} className="nov-file-preview-item">
                                            {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="preview" /> : <div className="nov-file-badge">{f.name}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Selector de Audiencia (Roles) */}
                            <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    <Eye size={14} /> ¿Quiénes pueden ver esta publicación?
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedRoles([])}
                                        style={{ 
                                            padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                            border: '1px solid',
                                            background: selectedRoles.length === 0 ? 'var(--accent)' : 'transparent',
                                            color: selectedRoles.length === 0 ? 'white' : 'var(--text-secondary)',
                                            borderColor: selectedRoles.length === 0 ? 'var(--accent)' : 'var(--border-color)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        Todos (Público)
                                    </button>
                                    {roles.map(r => {
                                        const isSelected = selectedRoles.includes(r);
                                        return (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedRoles(selectedRoles.filter(sr => sr !== r));
                                                    } else {
                                                        setSelectedRoles([...selectedRoles, r]);
                                                    }
                                                }}
                                                style={{ 
                                                    padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                                    border: '1px solid',
                                                    background: isSelected ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                                    color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {r.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedRoles.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>
                                        {t('news.modal.roles_notice', { defaultValue: 'Visible únicamente para los roles seleccionados.' })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="nov-modal-actions">
                    {isPreview ? (
                        <button className="btn-secondary" style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 99, cursor: 'pointer', fontWeight: 600 }} onClick={() => setIsPreview(false)}>
                            {t('news.modal.back_to_edit', { defaultValue: 'Volver a Editar' })}
                        </button>
                    ) : (
                        <div className="nov-media-buttons">
                            {!isEncuesta && <label className="nov-media-btn"><ImageIcon size={18} /> {t('news.filters.media_photo', { defaultValue: 'Foto' })} <input type="file" hidden accept="image/*" multiple onChange={handleFileChange} /></label>}
                            {!isEncuesta && <label className="nov-media-btn"><Video size={18} /> {t('news.filters.media_video', { defaultValue: 'Video' })} <input type="file" hidden accept="video/*" multiple onChange={handleFileChange} /></label>}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                        {!isPreview && (
                            <button 
                                className="btn-secondary" 
                                style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 99, cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => setIsPreview(true)}
                                disabled={!contenido.trim() && files.length === 0}
                            >
                                {t('news.modal.preview', { defaultValue: 'Vista Previa' })}
                            </button>
                        )}
                        <button className="btn-primary" disabled={uploading} onClick={handleCreate}>
                            {uploading ? t('news.actions.publishing', { defaultValue: 'Publicando...' }) : t('news.actions.share')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}

function ShareModal({ post, companyUsers, currentUserEmail, empresaId, onClose }: any) {
    const [query, setQuery] = useState('');
    const [sendingTo, setSendingTo] = useState<string | null>(null);

    const filtered = (companyUsers || []).filter((u: any) => {
        if (u.email === currentUserEmail) return false;
        const text = `${u.nombre || ''} ${u.email || ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
    });

    const handleSend = async (targetEmail: string) => {
        if (!currentUserEmail || !targetEmail) return;
        setSendingTo(targetEmail);

        try {
            const textPreview = post.contenido ? post.contenido.substring(0, 60).trim() : '[Multimedia]';
            const creadorName = post.creador?.nombre || 'Usuario';
            const finalMessage = `[POST_NOVEDADES]|${post.id}|${creadorName}|${textPreview}`;

            const { error } = await (supabase as any).from('mensajes_chat').insert([{
                de_usuario: currentUserEmail,
                para_usuario: targetEmail,
                mensaje: finalMessage,
                empresa_id: empresaId
            }]);

            if (error) throw error;
            
            toast.success("¡Compartido con éxito!");
            onClose();
        } catch (err) {
            console.error("Error sharing:", err);
            toast.error("No se pudo compartir");
        } finally {
            setSendingTo(null);
        }
    };

    return createPortal(
        <motion.div className="nov-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 2500 }}>
            <motion.div className="nov-modal" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ maxWidth: '400px' }}>
                <div className="nov-modal-header">
                    <h3>Compartir Post</h3>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="nov-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar compañero..." 
                        style={{ height: '45px', padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />

                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }} className="nov-share-list">
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                                No se encontraron compañeros
                            </div>
                        ) : (
                            filtered.map((u: any) => (
                                <div 
                                    key={u.id} 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="nov-post-avatar" style={{ width: 32, height: 32, fontSize: '1rem' }}>
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                u.avatar_emoji || '👤'
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{u.nombre}</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{u.email}</div>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn-primary" 
                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                                        disabled={sendingTo !== null}
                                        onClick={() => handleSend(u.email)}
                                    >
                                        {sendingTo === u.email ? 'Enviando...' : 'Compartir'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}
