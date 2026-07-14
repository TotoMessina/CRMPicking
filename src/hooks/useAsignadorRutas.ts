import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import toast from 'react-hot-toast';
import { getChurnRisk } from '../utils/riskScoring';
import { getDistance } from '../utils/mapUtils';
import { DropResult } from '@hello-pangea/dnd';
import L from 'leaflet';

export interface Visita {
    id: string;
    cliente_id: number;
    usuario_asignado_email: string;
    fecha_asignada: string;
    estado: string | null;
    orden: number | null;
    comentarios_admin: string | null;
    clientes: {
        id: number;
        nombre_local: string;
        direccion: string;
        lat?: number;
        lng?: number;
    } | null;
}

export function useAsignadorRutas() {
    const { t } = useTranslation();
    const { empresaActiva } = useAuth();
    const { tenantConfig } = useTenant();

    const [distanciaTotal, setDistanciaTotal] = useState(0);
    const [usuarios, setUsuarios] = useState<{ email: string; nombre: string }[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    });
    const [rutaActual, setRutaActual] = useState<Visita[]>([]);
    const [loadingRuta, setLoadingRuta] = useState(false);

    const [tabActiva, setTabActiva] = useState<'riesgo' | 'buscar'>('riesgo');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [sugerenciasRiesgo, setSugerenciasRiesgo] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const [editingComentario, setEditingComentario] = useState<{ id: string | number; texto: string } | null>(null);
    const [verMapa, setVerMapa] = useState(true);
    const [mobileTab, setMobileTab] = useState<'buscar' | 'ruta'>('buscar');

    // 1. Fetch Users
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsuarios = async () => {
            const { data: euData } = await supabase.from('empresa_usuario').select('usuario_email').eq('empresa_id', empresaActiva.id);
            const emails = (euData || []).map((e: any) => e.usuario_email);
            if (emails.length === 0) return;
            const { data: usersData } = await supabase.from('usuarios').select('email, nombre').in('email', emails).order('nombre');
            setUsuarios((usersData || []).map((u: any) => ({
                email: u.email || '',
                nombre: u.nombre || u.email || ''
            })));
        };
        fetchUsuarios();
    }, [empresaActiva]);

    // 2. Fetch Risk Recommendations
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchRiesgo = async () => {
            const { data } = await supabase
                .from('empresa_cliente')
                .select('id, cliente_id, estado, fecha_proximo_contacto, ultima_actividad, updated_at, created_at')
                .eq('empresa_id', empresaActiva.id)
                .eq('activo', true)
                .limit(50);

            if (data && data.length > 0) {
                const clienteIds = (data as any[])
                    .filter(ec => ec.cliente_id !== null && ec.cliente_id !== undefined)
                    .map(ec => ec.cliente_id);

                const uniqueIds = [...new Set(clienteIds)];

                const { data: clientesRaw } = await supabase
                    .from('clientes')
                    .select('id, nombre_local, direccion, lat, lng')
                    .in('id', uniqueIds);

                const clienteMap: Record<string, any> = {};
                (clientesRaw || []).forEach((c: any) => { if (c.id) clienteMap[c.id] = c; });

                const dataConClientes = (data as any[]).map(ec => ({
                    ...ec,
                    clientes: ec.cliente_id ? (clienteMap[ec.cliente_id] || null) : null
                }));

                const conRiesgo = dataConClientes
                    .filter(ec => ec.clientes)
                    .map(ec => ({ ...ec, risk: getChurnRisk(ec) }))
                    .filter(ec => ec.risk.level !== 'bajo')
                    .sort((a, b) => b.risk.score - a.risk.score)
                    .slice(0, 15);
                setSugerenciasRiesgo(conRiesgo);
            } else {
                setSugerenciasRiesgo([]);
            }
        };
        fetchRiesgo();
    }, [empresaActiva]);

    // 3. Fetch current user's route
    const fetchRuta = useCallback(async () => {
        if (!usuarioSeleccionado || !fechaSeleccionada || !empresaActiva?.id) {
            setRutaActual([]);
            setDistanciaTotal(0);
            return;
        }
        setLoadingRuta(true);
        try {
            const { data: visitasRaw, error } = await supabase
                .from('visitas_diarias')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', usuarioSeleccionado)
                .eq('fecha_asignada', fechaSeleccionada)
                .order('orden', { ascending: true });

            if (error) throw error;

            let rutasArmadas: Visita[] = [];
            if (visitasRaw && (visitasRaw as any[]).length > 0) {
                const clienteIds = [...new Set((visitasRaw as any[]).map(v => v.cliente_id))];
                const { data: clientesRaw } = await supabase.from('clientes').select('id, nombre_local, direccion, lat, lng').in('id', clienteIds);
                const clienteMap: Record<string, any> = {};
                (clientesRaw || []).forEach((c: any) => { clienteMap[c.id] = c; });
                rutasArmadas = (visitasRaw as any[]).map(v => ({ ...v, clientes: clienteMap[v.cliente_id] || null }));
            }
            setRutaActual(rutasArmadas);

            let dist = 0;
            for (let i = 0; i < (rutasArmadas.length || 0) - 1; i++) {
                const v1 = rutasArmadas[i].clientes;
                const v2 = rutasArmadas[i + 1].clientes;
                dist += getDistance(v1?.lat, v1?.lng, v2?.lat, v2?.lng);
            }
            setDistanciaTotal(dist);
        } catch (e) {
            toast.error(t('asignador.toast.load_error'));
        } finally {
            setLoadingRuta(false);
        }
    }, [usuarioSeleccionado, fechaSeleccionada, empresaActiva, t]);

    useEffect(() => {
        fetchRuta();
    }, [fetchRuta]);

    // 4. Search handler with debounce
    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }
        const handler = setTimeout(async () => {
            if (!empresaActiva?.id) return;
            setSearching(true);
            const { data } = await supabase.rpc('buscar_clientes_empresa', {
                p_empresa_id: empresaActiva.id,
                p_nombre: searchTerm,
                p_limit: 8
            });
            if (data) {
                setSearchResults((data as any[]).map((d: any) => ({
                    id: d.ec_id,
                    clientes: {
                        id: d.cliente_id,
                        nombre_local: d.nombre_local,
                        direccion: d.direccion,
                        lat: d.lat,
                        lng: d.lng
                    }
                })));
            }
            setSearching(false);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchTerm, empresaActiva]);

    // 5. Handlers
    const agregarAFila = async (ec: any) => {
        if (!empresaActiva?.id) return;
        if (!usuarioSeleccionado) return toast.error(t('asignador.toast.select_user'));
        const yaExiste = rutaActual.find(v => String(v.cliente_id) === String(ec.clientes.id));
        if (yaExiste) return toast.error(t('asignador.toast.already_in_route'));

        const newOrder = rutaActual.length;
        const { data, error } = await supabase
            .from('visitas_diarias')
            .insert([{
                empresa_id: empresaActiva.id,
                cliente_id: Number(ec.clientes.id),
                usuario_asignado_email: usuarioSeleccionado,
                fecha_asignada: fechaSeleccionada,
                estado: 'Pendiente',
                orden: newOrder
            }])
            .select('*')
            .single();

        if (error) return toast.error(t('asignador.toast.add_error'));
        const dataConClientes: Visita = { ...data, clientes: ec.clientes };
        setRutaActual([...rutaActual, dataConClientes]);
        toast.success(t('asignador.toast.add_success', { name: usuarioSeleccionado.split('@')[0] }));
    };

    const quitarVisita = async (id: string) => {
        const { error } = await supabase.from('visitas_diarias').delete().eq('id', id);
        if (error) return toast.error(t('asignador.toast.delete_error'));
        const nueva = rutaActual.filter(v => v.id !== id);
        setRutaActual(nueva);
        const updates = nueva.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id));
        await Promise.all(updates);
    };

    const moverVisita = async (index: number, direccion: number) => {
        const nuevoIndex = index + direccion;
        if (nuevoIndex < 0 || nuevoIndex >= rutaActual.length) return;

        const items = [...rutaActual];
        const [movedItem] = items.splice(index, 1);
        items.splice(nuevoIndex, 0, movedItem);
        setRutaActual(items);

        const updates = items.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id));
        await Promise.all(updates);
    };

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(rutaActual);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setRutaActual(items);

        const updates = items.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id));
        await Promise.all(updates);
    };

    const vaciarRuta = async () => {
        if (!usuarioSeleccionado || !fechaSeleccionada || rutaActual.length === 0) return;
        if (!window.confirm(t('asignador.confirm.empty_all'))) return;

        const ids = rutaActual.map(v => v.id);
        const { error } = await supabase.from('visitas_diarias').delete().in('id', ids);

        if (error) {
            toast.error(t('asignador.toast.empty_error'));
        } else {
            setRutaActual([]);
            toast.success(t('asignador.toast.empty_success'));
        }
    };

    const clonarUltimaRuta = async () => {
        if (!usuarioSeleccionado || !empresaActiva?.id) return;
        setLoadingRuta(true);
        const { data: lastOne } = await supabase
            .from('visitas_diarias')
            .select('fecha_asignada')
            .eq('usuario_asignado_email', usuarioSeleccionado)
            .lt('fecha_asignada', fechaSeleccionada)
            .order('fecha_asignada', { ascending: false })
            .limit(1);

        if (!lastOne?.[0]) {
            toast.error(t('asignador.toast.no_prev_route'));
            setLoadingRuta(false);
            return;
        }

        const lastDate = lastOne[0].fecha_asignada;

        const { data: aClonar } = await supabase
            .from('visitas_diarias')
            .select('cliente_id, orden, comentarios_admin')
            .eq('usuario_asignado_email', usuarioSeleccionado)
            .eq('fecha_asignada', lastDate);

        if (aClonar) {
            const logs = (aClonar as any[]).map(v => ({
                empresa_id: empresaActiva.id,
                cliente_id: Number(v.cliente_id),
                usuario_asignado_email: usuarioSeleccionado,
                fecha_asignada: fechaSeleccionada,
                estado: 'Pendiente',
                orden: v.orden,
                comentarios_admin: v.comentarios_admin
            }));
            const { error } = await supabase.from('visitas_diarias').insert(logs);
            if (!error) {
                toast.success(t('asignador.toast.cloned_success', { date: lastDate }));
                fetchRuta();
            } else {
                toast.error(t('asignador.toast.cloning_error'));
            }
        }
        setLoadingRuta(false);
    };

    const compartirWhatsApp = () => {
        if (rutaActual.length === 0) return;
        const nombreVendedor = usuarios.find(u => u.email === usuarioSeleccionado)?.nombre || usuarioSeleccionado;
        const header = `📍 *HOJA DE RUTA - ${fechaSeleccionada}*\n👤 Vendedor: ${nombreVendedor}\n📊 Locales: ${rutaActual.length}\n---------------------------\n\n`;
        const body = rutaActual.map((v, i) => {
            const c = v.clientes;
            const mapsLink = c?.lat ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : '';
            return `${i + 1}. *${c?.nombre_local}*\n🏠 ${c?.direccion}\n${v.comentarios_admin ? `📝 _${v.comentarios_admin}_\n` : ''}${mapsLink ? `🔗 GPS: ${mapsLink}\n` : ''}`;
        }).join('\n');

        const texto = encodeURIComponent(header + body + `\n\n${t('asignador.whatsapp.generated_by')} ${tenantConfig.app.name}`);
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };

    const guardarComentario = async () => {
        if (!editingComentario) return;
        const { error } = await supabase
            .from('visitas_diarias')
            .update({ comentarios_admin: editingComentario.texto })
            .eq('id', String(editingComentario.id));

        if (error) {
            toast.error(t('asignador.toast.save_note_error'));
            return;
        }
        setRutaActual(prev => prev.map(v => v.id === editingComentario.id ? { ...v, comentarios_admin: editingComentario.texto } : v));
        setEditingComentario(null);
        toast.success(t('asignador.toast.save_note_success'));
    };

    const optimizarRuta = async () => {
        if (rutaActual.length < 3) return toast(t('asignador.toast.add_more'), { icon: 'ℹ️' });

        toast.loading(t('asignador.toast.optimizing'), { id: 'opt' });
        let ruta = [...rutaActual];
        let optimizada: Visita[] = [];
        let p = [...ruta];
        let actual = p.shift()!;
        optimizada.push(actual);
        while (p.length > 0) {
            let idx = 0, minDist = Infinity;
            for (let i = 0; i < p.length; i++) {
                const d = getDistance(actual.clientes?.lat, actual.clientes?.lng, p[i].clientes?.lat, p[i].clientes?.lng);
                if (d < minDist) {
                    minDist = d;
                    idx = i;
                }
            }
            actual = p.splice(idx, 1)[0];
            optimizada.push(actual);
        }

        setRutaActual(optimizada);
        await Promise.all(optimizada.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id)));
        toast.success(t('asignador.toast.optimized_success'), { id: 'opt' });
    };

    const polylinePoints = useMemo(() =>
        rutaActual.map(v => v.clientes?.lat && v.clientes?.lng ? [v.clientes.lat, v.clientes.lng] as L.LatLngExpression : null).filter((p): p is L.LatLngExpression => p !== null)
    , [rutaActual]);

    return {
        distanciaTotal,
        usuarios,
        usuarioSeleccionado,
        setUsuarioSeleccionado,
        fechaSeleccionada,
        setFechaSeleccionada,
        rutaActual,
        setRutaActual,
        loadingRuta,
        tabActiva,
        setTabActiva,
        searchTerm,
        setSearchTerm,
        searchResults,
        sugerenciasRiesgo,
        searching,
        editingComentario,
        setEditingComentario,
        verMapa,
        setVerMapa,
        mobileTab,
        setMobileTab,
        agregarAFila,
        quitarVisita,
        moverVisita,
        onDragEnd,
        vaciarRuta,
        clonarUltimaRuta,
        compartirWhatsApp,
        optimizarRuta,
        polylinePoints,
        guardarComentario
    };
}
