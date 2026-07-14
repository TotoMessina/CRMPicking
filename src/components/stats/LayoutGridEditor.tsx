import React, { useState, useRef } from 'react';
import { GripVertical, Eye, EyeOff, RotateCcw, Save, Trash2 } from 'lucide-react';
import { WidgetLayout } from '../../constants/statsWidgets';
import { CustomWidgetConfig } from '../../hooks/useCustomWidgets';

interface LayoutGridEditorProps {
    draft: WidgetLayout[];
    setDraft: React.Dispatch<React.SetStateAction<WidgetLayout[]>>;
    customWidgets: CustomWidgetConfig[];
    onDeleteCustom: (id: string) => void;
    onSaveLayout: () => void;
    onReset: () => void;
    saving: boolean;
    onClose: () => void;
    getLocalDef: (id: string) => any;
    sizeToSpan: (size?: string) => number;
    sizeLabel: (size?: string) => string;
    onSaveCustom: (config: CustomWidgetConfig) => Promise<boolean>;
}

export const LayoutGridEditor: React.FC<LayoutGridEditorProps> = ({
    draft,
    setDraft,
    customWidgets,
    onDeleteCustom,
    onSaveLayout,
    onReset,
    saving,
    onClose,
    getLocalDef,
    sizeToSpan,
    sizeLabel,
    onSaveCustom
}) => {
    const dragIndex = useRef<number | null>(null);
    const [dragOver, setDragOver] = useState<number | null>(null);

    const handleDragStart = (index: number) => { dragIndex.current = index; };
    
    const handleDragEnter = (index: number) => {
        if (dragIndex.current === null || dragIndex.current === index) return;
        setDragOver(index);
    };

    const handleDrop = (dropIndex: number) => {
        if (dragIndex.current === null || dragIndex.current === dropIndex) return;
        const reordered = [...draft];
        const [moved] = reordered.splice(dragIndex.current, 1);
        reordered.splice(dropIndex, 0, moved);
        setDraft(reordered.map((w, i) => ({ ...w, order: i })));
        dragIndex.current = null;
        setDragOver(null);
    };

    const handleDragEnd = () => { dragIndex.current = null; setDragOver(null); };

    const toggleVisibility = (id: string) => {
        setDraft(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
    };

    const handleUpdateSize = (id: string, size: 'full' | 'half' | 'third') => {
        setDraft(prev => prev.map(w => w.id === id ? { ...w, size } : w));
        const cw = customWidgets.find(w => w.id === id);
        if (cw) onSaveCustom({ ...cw, size });
    };

    const visibleCount = draft.filter(w => w.visible).length;

    return (
        <div className="layout-tab-content">
            {/* PREMIUM GRID PREVIEW */}
            <div className="layout-preview-banner">
                <div className="preview-banner-header">
                    <div className="banner-title-group">
                        <span className="banner-small-title">Vista Previa</span>
                    </div>
                    <span className="banner-active-count">{visibleCount} activos</span>
                </div>

                <div className="preview-grid-container">
                    {(() => {
                        const visible = draft.filter(w => w.visible);
                        const rows: WidgetLayout[][] = [];
                        let currentRow: WidgetLayout[] = [];
                        let usedCols = 0;

                        for (const w of visible) {
                            const def = getLocalDef(w.id);
                            if (!def) continue;
                            const span = sizeToSpan(w.size || def.size);
                            if (usedCols + span > 12) {
                                rows.push(currentRow);
                                currentRow = [w];
                                usedCols = span;
                            } else {
                                currentRow.push(w);
                                usedCols += span;
                            }
                        }
                        if (currentRow.length > 0) rows.push(currentRow);

                        if (rows.length === 0) return (
                            <div className="empty-grid-msg">
                                No hay widgets visibles
                            </div>
                        );

                        return rows.map((row, ri) => (
                            <div key={ri} className="preview-grid-row">
                                {row.map(w => {
                                    const def = getLocalDef(w.id);
                                    if (!def) return null;
                                    const span = sizeToSpan(w.size || def.size);
                                    const flexVal = span / 12;
                                    return (
                                        <div key={w.id} title={def.label} style={{ flex: flexVal }} className="preview-grid-item">
                                            <span className="item-icon">{def.icon}</span>
                                            {span >= 6 && (
                                                <span className="item-label-text">
                                                    {def.label}
                                                </span>
                                            )}
                                            <span className="item-size-badge">
                                                {sizeLabel(w.size || def.size)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ));
                    })()}
                </div>
            </div>

            {/* Drag hint */}
            <div className="drag-hint-bar">
                <GripVertical size={11} /> Arrastrá para reordenar
            </div>

            {/* Widget list */}
            <div id="tour-layout-list" className="widget-drag-list">
                {draft.map((widget, index) => {
                    const def = getLocalDef(widget.id);
                    if (!def) return null;
                    const isCustom = !!customWidgets.find(w => w.id === widget.id);
                    const isOver = dragOver === index;
                    return (
                        <div
                            key={widget.id} draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDrop(index)}
                            onDragEnd={handleDragEnd}
                            className={`drag-list-item ${isOver ? 'drag-over' : ''}`}
                            style={{ opacity: widget.visible ? 1 : 0.38 }}
                        >
                            <GripVertical size={13} className="drag-handle-icon" />
                            <span className="item-emoji-icon">{def.icon}</span>
                            <div className="item-info-wrapper">
                                <div className="item-label-bold">
                                    {def.label}
                                </div>
                                <div className="item-desc-muted">
                                    {def.description}
                                </div>
                            </div>

                            <select
                                className="tour-size-select size-dropdown"
                                value={widget.size || def.size || 'full'}
                                onChange={e => handleUpdateSize(widget.id, e.target.value as any)}
                                onClick={e => e.stopPropagation()}
                            >
                                <option value="full">1/1</option>
                                <option value="half">1/2</option>
                                <option value="third">1/3</option>
                            </select>

                            <button className="tour-visibility-toggle visibility-btn" onClick={() => toggleVisibility(widget.id)}>
                                {widget.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>

                            {isCustom && (
                                <button className="delete-custom-btn" onClick={() => onDeleteCustom(widget.id)}>
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Actions */}
                <div id="tour-layout-actions" className="layout-actions-footer">
                    <button onClick={onReset} className="btn-secundario reset-btn">
                        <RotateCcw size={13} /> Restaurar
                    </button>
                    <button onClick={onSaveLayout} disabled={saving} className="btn-primario save-layout-btn">
                        <Save size={14} /> {saving ? 'Guardando...' : 'Guardar Dashboard'}
                    </button>
                </div>
            </div>
        </div>
    );
};
