import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search } from 'lucide-react';

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);

    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Handle Ctrl+K and Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setResults([]);
            setFocusedIndex(-1);
        }
    }, [isOpen]);

    // Debounced Search Logic
    useEffect(() => {
        const searchTimer = setTimeout(async () => {
            const searchTerm = query.trim().toLowerCase();
            if (searchTerm.length < 2) {
                setResults([]);
                setFocusedIndex(-1);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const [
                    { data: clientes },
                    { data: consumidores },
                    { data: repartidores }
                ] = await Promise.all([
                    supabase.from('clientes')
                        .select('id, nombre, nombre_local, direccion')
                        .or(`nombre.ilike.%${searchTerm}%,nombre_local.ilike.%${searchTerm}%`)
                        .limit(4),
                    supabase.from('consumidores')
                        .select('id, nombre, telefono')
                        .or(`nombre.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`)
                        .limit(3),
                    supabase.from('repartidores')
                        .select('id, nombre, apellido')
                        .or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`)
                        .limit(3)
                ]);

                let currentResults = [];

                if (clientes) {
                    clientes.forEach(c => currentResults.push({
                        type: 'cliente',
                        title: c.nombre || c.nombre_local || '(Sin nombre)',
                        desc: c.direccion || 'Sin dirección',
                        icon: '🏢',
                        url: `/clientes?id=${c.id}`
                    }));
                }

                if (consumidores) {
                    consumidores.forEach(c => currentResults.push({
                        type: 'consumidor',
                        title: (c.nombre || '').trim() || '(Sin nombre)',
                        desc: c.telefono || 'Sin teléfono',
                        icon: '👥',
                        url: `/consumidores?id=${c.id}`
                    }));
                }

                if (repartidores) {
                    repartidores.forEach(r => currentResults.push({
                        type: 'repartidor',
                        title: `${r.nombre || ''} ${r.apellido || ''}`.trim(),
                        icon: '🚚',
                        url: `/repartidores?id=${r.id}`
                    }));
                }

                setResults(currentResults);
                setFocusedIndex(currentResults.length > 0 ? 0 : -1);

            } catch (error) {
                console.error('Error in global search:', error);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(searchTimer);
    }, [query]);

    // Handle internal navigation keys (Up, Down, Enter)
    const handleInputKeyDown = (e) => {
        if (results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < results.length) {
                navigate(results[focusedIndex].url);
                setIsOpen(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && setIsOpen(false)}>
            <div className="modal-content command-palette">
                <div className="command-header">
                    <Search size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="command-input"
                        placeholder="Buscar clientes, consumidores, repartidores..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        autoComplete="off"
                    />
                </div>

                <div className="command-results">
                    {loading && (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="skeleton" style={{ height: '20px', width: '60%', margin: '0 auto', borderRadius: '4px' }}></div>
                        </div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron resultados
                        </div>
                    )}

                    {!loading && results.map((item, index) => (
                        <div
                            key={`${item.type}-${index}`}
                            className={`command-item ${index === focusedIndex ? 'focused' : ''}`}
                            onMouseEnter={() => setFocusedIndex(index)}
                            onClick={() => {
                                navigate(item.url);
                                setIsOpen(false);
                            }}
                        >
                            <div className="command-item-icon">{item.icon}</div>
                            <div className="command-item-content">
                                <div className="command-item-title">{item.title}</div>
                                {item.desc && <div className="command-item-desc">{item.desc}</div>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="command-footer">
                    <span><kbd className="command-kbd">↑</kbd> <kbd className="command-kbd">↓</kbd> navegar</span>
                    <span><kbd className="command-kbd">Enter</kbd> seleccionar</span>
                    <span><kbd className="command-kbd">Esc</kbd> cerrar</span>
                </div>
            </div>
        </div>
    );
}
