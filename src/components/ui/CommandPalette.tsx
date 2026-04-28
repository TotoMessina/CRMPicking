import { useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAppShell } from '../../hooks/useAppShell';
import { 
    Zap, Hash, Truck, Navigation, Sun, Moon, LogOut, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandItem {
    id?: string;
    type: 'header' | 'nav' | 'action' | 'cliente' | 'usuario';
    title: string;
    desc?: string;
    icon?: ReactNode;
    url?: string;
    action?: () => void;
    badge?: string;
}

/**
 * CommandPalette (Centro de Comando Ultra)
 */
export function CommandPalette() {
    const { empresaActiva, handleLogout, toggleTheme, theme, handleForceUpdate, navItems } = useAppShell();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CommandItem[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [recentItems, setRecentItems] = useState<CommandItem[]>(() => {
        const saved = localStorage.getItem('cp_recent_items');
        return saved ? JSON.parse(saved) : [];
    });

    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDownGlobal = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDownGlobal);
        return () => document.removeEventListener('keydown', handleKeyDownGlobal);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 150);
            setQuery('');
            setFocusedIndex(0);
        }
    }, [isOpen]);

    const addToRecent = (item: CommandItem) => {
        const updated = [item, ...recentItems.filter(r => r.url !== item.url)].slice(0, 5);
        setRecentItems(updated);
        localStorage.setItem('cp_recent_items', JSON.stringify(updated));
    };

    const ACTIONS: CommandItem[] = useMemo(() => [
        { id: 'toggle-theme', title: 'Cambiar Tema', desc: `Activar modo ${theme === 'dark' ? 'claro' : 'oscuro'}`, icon: theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>, action: toggleTheme, type: 'action', badge: 'Tema' },
        { id: 'logout', title: 'Cerrar Sesión', desc: 'Finalizar sesión actual', icon: <LogOut size={18}/>, action: () => handleLogout(), type: 'action', badge: 'Sesión' },
        { id: 'sync', title: 'Actualización Forzada', desc: 'Recargar sistema sin cache', icon: <Database size={18}/>, action: handleForceUpdate, type: 'action', badge: 'Sistema' },
    ], [theme, toggleTheme, handleLogout, handleForceUpdate]);

    useEffect(() => {
        const searchItems = async () => {
            const searchTerm = query.trim().toLowerCase();
            
            if (searchTerm === '') {
                setResults([
                    ...(recentItems.length > 0 ? [{ type: 'header', title: 'Recientes' } as CommandItem, ...recentItems] : []),
                    { type: 'header', title: 'Navegación Rápida' } as CommandItem,
                    ...navItems.slice(0, 4).map(ni => ({
                        type: 'nav' as const,
                        title: ni.label || '',
                        desc: ni.group || 'Página',
                        icon: ni.icon ? <ni.icon size={18}/> : undefined,
                        url: ni.to
                    }))
                ]);
                setFocusedIndex(0);
                return;
            }

            if (searchTerm.startsWith('/')) {
                const subQuery = searchTerm.slice(1);
                const filtered = ACTIONS.filter(a => a.title.toLowerCase().includes(subQuery) || a.id?.includes(subQuery));
                setResults([
                    { type: 'header', title: 'Comandos del Sistema' } as CommandItem,
                    ...filtered
                ]);
                setFocusedIndex(0);
                return;
            }

            setLoading(true);
            try {
                const navMatches: CommandItem[] = navItems
                    .filter(ni => ni.label?.toLowerCase().includes(searchTerm))
                    .map(ni => ({
                        type: 'nav',
                        title: ni.label || '',
                        desc: `${ni.group || 'Navegación'}`,
                        icon: ni.icon ? <ni.icon size={18}/> : undefined,
                        url: ni.to
                    }));

                const [ { data: clientes }, { data: usuarios } ] = await Promise.all([
                    (supabase as any).rpc('buscar_clientes_empresa', {
                        p_empresa_id: empresaActiva?.id,
                        p_nombre: searchTerm,
                        p_limit: 4
                    }),
                    supabase.from('usuarios')
                        .select('id, nombre, email, role')
                        .or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
                        .in('role', ['repartidor', 'activador'])
                        .limit(3)
                ]);

                let res: CommandItem[] = [];
                if (navMatches.length > 0) {
                    res.push({ type: 'header', title: 'Páginas' } as CommandItem, ...navMatches);
                }

                if (clientes && (clientes as any[]).length > 0) {
                    res.push({ type: 'header', title: 'Clientes' } as CommandItem);
                    (clientes as any[]).forEach((c: any) => res.push({
                        type: 'cliente',
                        title: c.nombre_local || c.nombre,
                        desc: c.direccion || 'Local relevado',
                        icon: <Hash size={18}/>,
                        url: `/clientes?id=${c.id}`,
                        badge: '🏢'
                    }));
                }

                if (usuarios && (usuarios as any[]).length > 0) {
                    res.push({ type: 'header', title: 'Usuarios' } as CommandItem);
                    (usuarios as any[]).forEach((r: any) => res.push({
                        type: 'usuario',
                        title: r.nombre || r.email,
                        desc: r.role?.toUpperCase(),
                        icon: r.role === 'repartidor' ? <Truck size={18}/> : <Navigation size={18}/>,
                        url: `/usuarios?id=${r.id}`,
                        badge: '👥'
                    }));
                }

                setResults(res);
                setFocusedIndex(res.length > 0 ? (res[0].type === 'header' ? 1 : 0) : 0);

            } catch (err) {
                console.error("Error global search:", err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(searchItems, 150);
        return () => clearTimeout(timer);
    }, [query, empresaActiva, navItems, recentItems, ACTIONS]);

    const handleSelect = (item: CommandItem) => {
        if (!item || item.type === 'header') return;
        if (item.action) {
            item.action();
            setIsOpen(false);
            return;
        }
        if (item.url) {
            addToRecent(item);
            navigate(item.url);
            setIsOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (results.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            let next = (focusedIndex + 1) % results.length;
            if (results[next].type === 'header') next = (next + 1) % results.length;
            setFocusedIndex(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            let prev = (focusedIndex - 1 + results.length) % results.length;
            if (results[prev].type === 'header') prev = (prev - 1 + results.length) % results.length;
            setFocusedIndex(prev);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSelect(results[focusedIndex]);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="command-center-overlay" onMouseDown={(e) => e.target === e.currentTarget && setIsOpen(false)}>
                    <motion.div 
                        className="command-palette-ultra"
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    >
                        <div className="command-search-wrapper">
                            <Zap size={20} className="command-search-icon" style={{ opacity: query.startsWith('/') ? 1 : 0.4 }} />
                            <input
                                ref={inputRef}
                                type="text"
                                className="command-search-input"
                                placeholder="Páginas, clientes, comandos '/'..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                            />
                            <div className="item-badge" style={{ fontSize: '9px' }}>CTRL+K</div>
                        </div>

                        <div className="command-results-scroll hide-scrollbar">
                            {results.map((item, index) => (
                                item.type === 'header' ? (
                                    <div key={`h-${index}`} className="command-group-title">{item.title}</div>
                                ) : (
                                    <div
                                        key={`item-${index}`}
                                        className={`command-item-ultra ${index === focusedIndex ? 'focused' : ''}`}
                                        onMouseEnter={() => setFocusedIndex(index)}
                                        onClick={() => handleSelect(item)}
                                    >
                                        <div className="item-icon-wrapper">{item.icon}</div>
                                        <div className="item-content">
                                            <div className="item-title">{item.title}</div>
                                            <div className="item-desc">{item.desc}</div>
                                        </div>
                                        {item.badge && <span className="item-badge">{item.badge}</span>}
                                    </div>
                                )
                            ))}

                            {loading && (
                                <div style={{ padding: '24px', textAlign: 'center' }}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                        <Zap size={18} color="var(--accent)" />
                                    </motion.div>
                                </div>
                            )}

                            {!loading && query.length > 0 && results.filter(r => r.type !== 'header').length === 0 && (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No hay resultados para "{query}"
                                </div>
                            )}
                        </div>

                        <div className="command-footer-ultra">
                            <div className="command-shortcuts">
                                <span><kbd className="kbd-key">↑↓</kbd> Navegar</span>
                                <span><kbd className="kbd-key">Enter</kbd> Ejecutar</span>
                            </div>
                            <div className="command-shortcuts hide-mobile">
                                <span><kbd className="kbd-key">/</kbd> Comandos</span>
                                <span><kbd className="kbd-key">Esc</kbd> Cerrar</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
