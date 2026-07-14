import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Story {
    id: string;
    contenido?: string | null;
    media_urls?: string[] | null;
    is_viewed_by_me?: boolean;
    created_at: string;
    creador_id: string;
    creador?: {
        nombre?: string;
        avatar_url?: string | null;
        avatar_emoji?: string;
    };
}

interface StoriesFeedProps {
    historias: Story[];
    markAsViewed: (id: string) => Promise<void>;
}

export const StoriesFeed: React.FC<StoriesFeedProps> = ({ historias, markAsViewed }) => {
    const { t } = useTranslation();
    const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

    if (historias.length === 0) return null;

    return (
        <>
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
        </>
    );
};

interface StoriesViewerProps {
    historias: Story[];
    initialIndex: number;
    onClose: () => void;
    markAsViewed: (id: string) => Promise<void>;
}

const StoriesViewer: React.FC<StoriesViewerProps> = ({ historias, initialIndex, onClose, markAsViewed }) => {
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
                return prev + 2;
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
                    {historias.map((_, i) => (
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
};
