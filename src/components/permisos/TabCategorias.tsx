import { ChevronDown, Edit2, Layers, Plus, X } from 'lucide-react';

interface TabCategoriasProps {
    localSidebarGroups: string[];
    setLocalSidebarGroups: React.Dispatch<React.SetStateAction<string[]>>;
    setLocalPageGroups: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setDirty: (v: boolean) => void;
}

export function TabCategorias({ localSidebarGroups, setLocalSidebarGroups, setLocalPageGroups, setDirty }: TabCategoriasProps) {
    return (
        <div className="categorias-management-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Layers size={18} /> Gestionar Categorías del Sidebar</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Agregá, renombrá, reordená o eliminá las secciones que agrupan los accesos en el menú lateral.</p>

                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
                    {localSidebarGroups.map((groupName, index) => (
                        <div key={groupName} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{groupName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn-secundario" style={{ padding: '6px', minWidth: 'auto' }} disabled={index === 0} type="button"
                                    onClick={() => { const u = [...localSidebarGroups]; const t = u[index]; u[index] = u[index - 1]; u[index - 1] = t; setLocalSidebarGroups(u); setDirty(true); }}
                                    title="Mover arriba">
                                    <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                                </button>
                                <button className="btn-secundario" style={{ padding: '6px', minWidth: 'auto' }} disabled={index === localSidebarGroups.length - 1} type="button"
                                    onClick={() => { const u = [...localSidebarGroups]; const t = u[index]; u[index] = u[index + 1]; u[index + 1] = t; setLocalSidebarGroups(u); setDirty(true); }}
                                    title="Mover abajo">
                                    <ChevronDown size={14} />
                                </button>
                                <button className="btn-secundario" style={{ padding: '6px', minWidth: 'auto' }} type="button"
                                    onClick={() => {
                                        const newName = prompt('Ingresá el nuevo nombre para la categoría:', groupName);
                                        if (newName && newName.trim() && newName.trim() !== groupName) {
                                            const trimName = newName.trim();
                                            setLocalSidebarGroups(prev => prev.map(g => g === groupName ? trimName : g));
                                            setLocalPageGroups(prev => {
                                                const updated = { ...prev };
                                                Object.keys(updated).forEach(k => { if (updated[k] === groupName) updated[k] = trimName; });
                                                return updated;
                                            });
                                            setDirty(true);
                                        }
                                    }}
                                    title="Renombrar">
                                    <Edit2 size={14} />
                                </button>
                                <button className="btn-secundario danger-hover" style={{ padding: '6px', minWidth: 'auto' }} disabled={localSidebarGroups.length <= 1} type="button"
                                    onClick={() => {
                                        if (confirm(`¿Estás seguro de eliminar la categoría "${groupName}"?`)) {
                                            setLocalSidebarGroups(prev => prev.filter(g => g !== groupName));
                                            setLocalPageGroups(prev => {
                                                const updated = { ...prev };
                                                Object.keys(updated).forEach(k => { if (updated[k] === groupName) delete updated[k]; });
                                                return updated;
                                            });
                                            setDirty(true);
                                        }
                                    }}
                                    title="Eliminar">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', maxWidth: '500px' }}>
                    <input type="text" id="new-category-input" className="input premium-input" placeholder="Nueva categoría..." style={{ flex: 1, height: '40px' }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                const val = e.currentTarget.value.trim();
                                if (val && !localSidebarGroups.includes(val)) {
                                    setLocalSidebarGroups(prev => [...prev, val]);
                                    e.currentTarget.value = '';
                                    setDirty(true);
                                }
                            }
                        }}
                    />
                    <button className="btn-primario" style={{ height: '40px', padding: '0 16px' }} type="button"
                        onClick={() => {
                            const input = document.getElementById('new-category-input') as HTMLInputElement;
                            const val = input?.value.trim();
                            if (val && !localSidebarGroups.includes(val)) {
                                setLocalSidebarGroups(prev => [...prev, val]);
                                input.value = '';
                                setDirty(true);
                            }
                        }}>
                        <Plus size={16} style={{ marginRight: 6 }} /> Agregar
                    </button>
                </div>
            </div>
        </div>
    );
}
