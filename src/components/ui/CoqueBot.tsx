import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiProvider } from '../../lib/aiProvider';

/**
 * CoqueBot - The funny & smart floating assistant
 */
export const CoqueBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([
        { role: 'bot', text: '¡Buenas! Soy CoqueBot. 🦾 ¿Qué local vamos a cerrar hoy? Preguntame lo que quieras, che.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsTyping(true);

        try {
            const response = await aiProvider.ask(userMsg);
            setMessages(prev => [...prev, { role: 'bot', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: 'Perdón, me tildé un poco. ¿Podés repetir?' }]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-pickingbot', handleOpen);
        return () => window.removeEventListener('open-pickingbot', handleOpen);
    }, []);

    return (
        <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 1000 }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            width: '350px',
                            height: '500px',
                            background: 'var(--bg-card)',
                            borderRadius: '24px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(139, 92, 246, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            marginBottom: '16px'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center' }}>
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>CoqueBot</div>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                        Online y con chispa
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {messages.map((m, i) => (
                                <div key={i} style={{
                                    alignSelf: m.role === 'bot' ? 'flex-start' : 'flex-end',
                                    maxWidth: '85%',
                                    padding: '12px 16px',
                                    borderRadius: m.role === 'bot' ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
                                    background: m.role === 'bot' ? 'rgba(139, 92, 246, 0.05)' : '#8b5cf6',
                                    color: m.role === 'bot' ? 'var(--text)' : 'white',
                                    fontSize: '0.85rem',
                                    border: m.role === 'bot' ? '1px solid rgba(139, 92, 246, 0.1)' : 'none',
                                    lineHeight: '1.4'
                                }}>
                                    {m.text}
                                </div>
                            ))}
                            {isTyping && (
                                <div style={{ alignSelf: 'flex-start', padding: '12px 16px', borderRadius: '20px 20px 20px 4px', background: 'rgba(139, 92, 246, 0.05)', display: 'flex', gap: '4px' }}>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Mandale un mensaje a CoqueBot..."
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '10px 16px',
                                    color: 'var(--text)',
                                    fontSize: '0.85rem',
                                    outline: 'none'
                                }}
                            />
                            <button 
                                onClick={handleSend}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: '#8b5cf6', color: 'white',
                                    border: 'none', cursor: 'pointer',
                                    display: 'grid', placeItems: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
