import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_LAYOUT, WidgetLayout } from '../constants/statsWidgets';
import toast from 'react-hot-toast';

export const useDashboardLayout = (customWidgets: any[] = []) => {
    const { empresaActiva }: any = useAuth();
    const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_LAYOUT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadLayout = useCallback(async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('empresa_dashboard_layout')
                .select('layout')
                .eq('empresa_id', empresaActiva.id)
                .maybeSingle();

            if (error) throw error;

            if (data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
                const saved: WidgetLayout[] = data.layout;
                const savedIds = new Set(saved.map((w: WidgetLayout) => w.id));

                const missingDefaults = DEFAULT_LAYOUT.filter(w => !savedIds.has(w.id));
                const missingCustoms = customWidgets.filter(cw => cw.id && !savedIds.has(cw.id));

                const merged = [...saved];
                [...missingDefaults, ...missingCustoms].forEach((w) => {
                    const id = (w as any).id;
                    if (!savedIds.has(id)) {
                        merged.push({ id, visible: true, order: merged.length, size: (w as any).size });
                    }
                });

                setLayout(merged.sort((a, b) => a.order - b.order));
            } else {
                const initial = [...DEFAULT_LAYOUT, ...customWidgets.map(cw => ({ id: cw.id!, visible: true, order: 0, size: cw.size || 'full' }))];
                setLayout(initial.map((w, i) => ({ ...w, order: i })));
            }
        } catch (err) {
            console.warn('Could not load dashboard layout, using defaults:', err);
            setLayout(DEFAULT_LAYOUT);
        } finally {
            setLoading(false);
        }
    }, [empresaActiva?.id]);

    useEffect(() => {
        loadLayout();
    }, [loadLayout]);

    // Sync layout with customWidgets (add newly created, remove deleted)
    useEffect(() => {
        if (!loading) {
            setLayout(prev => {
                let changed = false;
                let newLayout = [...prev];
                
                // Keep only valid widgets (default + current custom ones)
                const validIds = new Set([...DEFAULT_LAYOUT.map(w => w.id), ...customWidgets.map(cw => cw.id)]);
                const filtered = newLayout.filter(l => validIds.has(l.id));
                if (filtered.length !== newLayout.length) {
                    newLayout = filtered;
                    changed = true;
                }

                // Add missing custom widgets to the end
                const layoutIds = new Set(newLayout.map(l => l.id));
                customWidgets.forEach((cw) => {
                    if (cw.id && !layoutIds.has(cw.id)) {
                        newLayout.push({ id: cw.id, visible: true, order: newLayout.length, size: cw.size || 'full' });
                        changed = true;
                    }
                });

                return changed ? newLayout : prev;
            });
        }
    }, [customWidgets, loading]);

    const saveLayout = useCallback(async (newLayout: WidgetLayout[]) => {
        if (!empresaActiva?.id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('empresa_dashboard_layout')
                .upsert(
                    { empresa_id: empresaActiva.id, layout: newLayout },
                    { onConflict: 'empresa_id' }
                );

            if (error) throw error;
            setLayout(newLayout);
            toast.success('Dashboard guardado');
        } catch (err) {
            console.error('Error saving dashboard layout:', err);
            toast.error('Error al guardar el dashboard');
        } finally {
            setSaving(false);
        }
    }, [empresaActiva?.id]);

    const resetLayout = useCallback(async () => {
        await saveLayout(DEFAULT_LAYOUT);
    }, [saveLayout]);

    /** Returns only visible widgets sorted by order (full objects) */
    const visibleLayout = layout
        .filter(w => w.visible)
        .sort((a, b) => a.order - b.order);

    const visibleWidgets = visibleLayout.map(w => w.id);

    return { layout, visibleLayout, visibleWidgets, loading, saving, saveLayout, resetLayout };
};
