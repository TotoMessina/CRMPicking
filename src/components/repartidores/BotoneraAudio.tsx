import React, { useState, useRef, useEffect } from 'react';
import { 
    Play, Pause, Square, Volume2, VolumeX, RotateCcw, 
    Radio, Music, Upload, Info, AlertCircle, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export interface AudioItem {
    id: string;
    title: string;
    description: string;
    src: string;
    icon?: string;
}

const DEFAULT_AUDIOS: AudioItem[] = [
    {
        id: 'audio_principal',
        title: 'Audio Principal Repartidores',
        description: 'Audio de bienvenida o instructivo (.ogg / .mp3)',
        src: '/audio/audio_repartidor.ogg'
    },
    {
        id: 'mensaje_general',
        title: 'Mensaje General',
        description: 'Comunicado general para el equipo (.ogg / .mp3)',
        src: '/audio/mensaje_repartidor.ogg'
    },
    {
        id: 'alerta_ruta',
        title: 'Alerta de Ruta',
        description: 'Aviso importante sobre rutas o tráfico (.ogg / .mp3)',
        src: '/audio/alerta_ruta.ogg'
    }
];

export function BotoneraAudio() {
    const [audios, setAudios] = useState<AudioItem[]>(DEFAULT_AUDIOS);
    const [selectedAudio, setSelectedAudio] = useState<AudioItem>(DEFAULT_AUDIOS[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLooping, setIsLooping] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Try active src, with fallback to alternative extension if original fails
        let currentSrc = selectedAudio.src;
        const audio = new Audio(currentSrc);
        audioRef.current = audio;

        audio.volume = isMuted ? 0 : volume;
        audio.playbackRate = playbackRate;
        audio.loop = isLooping;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration || 0);
            setAudioError(null);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime || 0);
        };

        const handleEnded = () => {
            if (!isLooping) {
                setIsPlaying(false);
                setCurrentTime(0);
            }
        };

        let hasTriedFallback = false;
        const handleError = () => {
            if (!hasTriedFallback && !currentSrc.startsWith('blob:')) {
                hasTriedFallback = true;
                // Swap extension: .ogg <-> .mp3
                const altSrc = currentSrc.endsWith('.ogg') 
                    ? currentSrc.replace(/\.ogg$/, '.mp3')
                    : currentSrc.replace(/\.mp3$/, '.ogg');
                currentSrc = altSrc;
                audio.src = altSrc;
                audio.load();
                if (isPlaying) {
                    audio.play().catch(() => {});
                }
                return;
            }

            setIsPlaying(false);
            setAudioError(`No se encontró el archivo "${selectedAudio.src}" (ni .ogg ni .mp3). Guardalo en "crm-react/public/audio/audio_repartidor.ogg"`);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        if (isPlaying) {
            audio.play().catch(err => {
                console.warn('Error al reproducir audio:', err);
                setIsPlaying(false);
            });
        }

        return () => {
            audio.pause();
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [selectedAudio]);

    // Handle Volume / Rate / Loop changes dynamically
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.loop = isLooping;
        }
    }, [isLooping]);

    const togglePlay = (audioItem?: AudioItem) => {
        const target = audioItem || selectedAudio;

        if (target.id !== selectedAudio.id) {
            setSelectedAudio(target);
            setIsPlaying(true);
            return;
        }

        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            setAudioError(null);
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                    setIsPlaying(false);
                    setAudioError(`El archivo "${target.src}" no está listo o no existe en la carpeta public/audio/`);
                });
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        const customAudio: AudioItem = {
            id: `custom_${Date.now()}`,
            title: file.name.replace(/\.[^/.]+$/, ""),
            description: `Audio cargado localmente (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
            src: objectUrl
        };

        setAudios(prev => [customAudio, ...prev]);
        setSelectedAudio(customAudio);
        setAudioError(null);
        toast.success(`Audio "${file.name}" cargado para reproducción`);
        
        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
        }, 100);
    };

    const formatTime = (secs: number) => {
        if (isNaN(secs)) return '00:00';
        const mins = Math.floor(secs / 60);
        const remainder = Math.floor(secs % 60);
        return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: isPlaying ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPlaying ? '#ffffff' : 'var(--accent)',
                        transition: 'all 0.3s ease'
                    }}>
                        <Radio size={22} className={isPlaying ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Botonera de Audios para Repartidores
                            {isPlaying && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#22c55e',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 600
                                }}>
                                    En Vivo
                                </span>
                            )}
                        </h3>
                        <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
                            Reproduce comunicados, mensajes o audios de la flota de reparto
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label 
                        className="btn btn-secondary"
                        style={{
                            padding: '8px 14px',
                            fontSize: '0.85rem',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)'
                        }}
                        title="Probar/Cargar archivo audio local"
                    >
                        <Upload size={15} />
                        <span className="hide-mobile">Probar Audio Local</span>
                        <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '8px'
                        }}
                    >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        {/* Audio Buttons Soundboard */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '12px',
                            marginTop: '20px',
                            marginBottom: '16px'
                        }}>
                            {audios.map(item => {
                                const isCurrent = selectedAudio.id === item.id;
                                const isThisPlaying = isCurrent && isPlaying;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => togglePlay(item)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '14px 16px',
                                            borderRadius: '14px',
                                            border: isCurrent 
                                                ? '2px solid var(--accent)' 
                                                : '1px solid var(--border)',
                                            background: isCurrent 
                                                ? 'rgba(99, 102, 241, 0.08)' 
                                                : 'var(--bg-elevated)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                            color: 'var(--text)'
                                        }}
                                    >
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: isThisPlaying ? 'var(--accent)' : 'var(--bg-card)',
                                            color: isThisPlaying ? '#ffffff' : 'var(--text)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: isThisPlaying ? '0 4px 12px rgba(99, 102, 241, 0.4)' : 'none'
                                        }}>
                                            {isThisPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {item.title}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {item.description}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Error banner if audio missing */}
                        {audioError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                fontSize: '0.88rem',
                                color: 'var(--danger)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                marginBottom: '16px'
                            }}>
                                <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                    <strong>Audio pendiente de subir:</strong> {audioError}
                                </div>
                            </div>
                        )}

                        {/* Player controls bar */}
                        <div style={{
                            background: 'var(--bg-elevated)',
                            borderRadius: '14px',
                            padding: '14px 18px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {/* Timeline Slider & Wave Indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: '40px' }}>
                                    {formatTime(currentTime)}
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    style={{
                                        flex: 1,
                                        accentColor: 'var(--accent)',
                                        cursor: 'pointer'
                                    }}
                                />
                                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: '40px' }}>
                                    {formatTime(duration)}
                                </span>
                            </div>

                            {/* Control Buttons */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => togglePlay()}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'var(--accent)',
                                            color: '#ffffff',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                                        }}
                                        title={isPlaying ? 'Pausar' : 'Reproducir'}
                                    >
                                        {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                                    </button>

                                    <button
                                        onClick={handleStop}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-muted)',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                        title="Detener"
                                    >
                                        <Square size={16} />
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (audioRef.current) audioRef.current.currentTime = 0;
                                            setCurrentTime(0);
                                        }}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-muted)',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                        title="Reiniciar"
                                    >
                                        <RotateCcw size={16} />
                                    </button>

                                    <button
                                        onClick={() => setIsLooping(!isLooping)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            background: isLooping ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-card)',
                                            color: isLooping ? 'var(--accent)' : 'var(--text-muted)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer'
                                        }}
                                        title="Bucle continuo"
                                    >
                                        Bucle {isLooping ? 'ON' : 'OFF'}
                                    </button>

                                    <button
                                        onClick={() => {
                                            const rates = [1, 1.25, 1.5, 2];
                                            const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                                            setPlaybackRate(rates[nextIdx]);
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            background: 'var(--bg-card)',
                                            color: 'var(--text)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer'
                                        }}
                                        title="Velocidad de reproducción"
                                    >
                                        {playbackRate}x
                                    </button>
                                </div>

                                {/* Volume Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => {
                                            setVolume(parseFloat(e.target.value));
                                            setIsMuted(false);
                                        }}
                                        style={{
                                            width: '80px',
                                            accentColor: 'var(--accent)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* File location instruction banner */}
                        <div style={{
                            marginTop: '14px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'var(--bg-elevated)',
                            border: '1px dashed var(--border)',
                            fontSize: '0.82rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span>
                                📁 <strong>Ubicación de archivos audio:</strong> Dejá tu archivo en <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text)' }}>crm-react/public/audio/audio_repartidor.ogg</code> (o .mp3)
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
