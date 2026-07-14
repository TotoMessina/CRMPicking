import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Eye, MoreVertical, Pin, ChevronLeft, ChevronRight, X, Send, Sparkles, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { aiProvider } from '../../lib/aiProvider';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShareModal } from './NovedadesModalCrear';

interface FeedPostProps {
    post: any;
    user: any;
    toggleLike: (id: string, currentReaction: string, newReaction: string) => Promise<void>;
    markAsViewed: (id: string) => Promise<void>;
    openComments: boolean;
    setOpenComments: () => void;
    newComment: string;
    setNewComment: (s: string) => void;
    handleCommentSubmit: () => void;
    setLightboxMedia: (url: string | null) => void;
    togglePin: (id: string, isPinned: boolean) => Promise<void>;
    votarEncuesta: (postId: string, optionId: string) => Promise<void>;
    companyUsers: any[];
    empresaActiva: any;
    toggleReaccionComentario: (postId: string, commentId: string, emoji: string) => Promise<void>;
}

export const NovedadCard: React.FC<FeedPostProps> = ({
    post,
    user,
    toggleLike,
    markAsViewed,
    openComments,
    setOpenComments,
    newComment,
    setNewComment,
    handleCommentSubmit,
    setLightboxMedia,
    togglePin,
    votarEncuesta,
    companyUsers,
    empresaActiva,
    toggleReaccionComentario
}) => {
    const { t } = useTranslation();
    const askConfirm = useConfirm();
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

    const reactionOptions = ['❤️', '🎉', '👍', '💡', '😮'];

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
            if (post.my_reaction !== '❤️') {
                toggleLike(post.id, post.my_reaction, '❤️');
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
        const confirmed = await askConfirm({
            title: t('news.delete_title', { defaultValue: 'Eliminar publicación' }),
            message: t('news.confirm_delete'),
            confirmText: t('common.actions.delete', { defaultValue: 'Eliminar' }),
            cancelText: t('common.actions.cancel', { defaultValue: 'Cancelar' }),
            variant: 'danger'
        });
        if (!confirmed) return;
        await supabase.from('novedades').delete().eq('id', post.id);
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

            {/* AI Summary */}
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
                                        transition: 'all 0.2s ease',
                                        zIndex: 1
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
};
