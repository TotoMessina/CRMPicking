import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface CustomWidgetConfig {
    id?: string;
    title: string;
    icon: string;
    chart_type: 'kpi' | 'bar' | 'pie' | 'list';
    data_source: 'empresa_cliente' | 'repartidores' | 'consumidores' | 'actividades';
    group_by?: string;
    filter_field?: string;
    filter_value?: string;
    color: string;
    size?: 'full' | 'half' | 'third';
    sort_order?: number;
}

export const useCustomWidgets = () => {
    const { empresaActiva }: any = useAuth();
    const [widgets, setWidgets] = useState<CustomWidgetConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadWidgets = useCallback(async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('empresa_custom_widgets')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setWidgets(data || []);
        } catch (err) {
            console.warn('Could not load custom widgets:', err);
            setWidgets([]);
        } finally {
            setLoading(false);
        }
    }, [empresaActiva?.id]);

    useEffect(() => { loadWidgets(); }, [loadWidgets]);

    const saveWidget = useCallback(async (config: CustomWidgetConfig) => {
        if (!empresaActiva?.id) return false;
        setSaving(true);
        try {
            if (config.id) {
                const { error } = await supabase
                    .from('empresa_custom_widgets')
                    .update({ ...config, empresa_id: empresaActiva.id })
                    .eq('id', config.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('empresa_custom_widgets')
                    .insert({ ...config, empresa_id: empresaActiva.id, sort_order: widgets.length });
                if (error) throw error;
            }
            toast.success('Widget guardado');
            await loadWidgets();
            return true;
        } catch (err) {
            console.error('Error saving widget:', err);
            toast.error('Error al guardar widget');
            return false;
        } finally {
            setSaving(false);
        }
    }, [empresaActiva?.id, widgets.length, loadWidgets]);

    const deleteWidget = useCallback(async (id: string) => {
        if (!empresaActiva?.id) return;
        try {
            const { error } = await supabase
                .from('empresa_custom_widgets')
                .delete()
                .eq('id', id)
                .eq('empresa_id', empresaActiva.id);
            if (error) throw error;
            toast.success('Widget eliminado');
            await loadWidgets();
        } catch (err) {
            toast.error('Error al eliminar widget');
        }
    }, [empresaActiva?.id, loadWidgets]);

    const checkWidgetViability = useCallback(async (config: CustomWidgetConfig): Promise<boolean> => {
        if (!empresaActiva?.id) return false;
        try {
            let query = supabase
                .from(config.data_source)
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', empresaActiva.id);

            if (config.filter_field && config.filter_value) {
                query = (query as any).eq(config.filter_field, config.filter_value);
            }

            const { count, error } = await query;
            if (error) throw error;
            return (count && count > 0) ? true : false;
        } catch (err) {
            console.error('Error checking widget viability:', err);
            return false;
        }
    }, [empresaActiva?.id]);

    return { widgets, loading, saving, saveWidget, deleteWidget, refetch: loadWidgets, checkWidgetViability };
};
