import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getChurnRisk } from '../utils/riskScoring';
import toast from 'react-hot-toast';
import L from 'leaflet';

export interface TinderClient {
    id: string | number;
    cliente_id: string | number;
    estado: string;
    rubro?: string | null;
    ultima_actividad?: string | null;
    updated_at?: string;
    created_at?: string;
    fecha_proximo_contacto?: string | null;
    clientes?: {
        id: string;
        nombre_local: string;
        direccion?: string | null;
        lat?: number | null;
        lng?: number | null;
    } | null;
    risk?: {
        level: string;
        score: number;
        color: string;
        diasSinContacto: number;
    };
}

export function useTinderClientes() {
    const { t } = useTranslation();
    const { empresaActiva } = useAuth();
    const [clients, setClients] = useState<TinderClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [usuarios, setUsuarios] = useState<{ email: string; nombre: string }[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    });

    const [stats, setStats] = useState({ added: 0, postponed: 0, scheduled: 0 });
    const [existingVisits, setExistingVisits] = useState<any[]>([]);

    // Map Refs
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const currentMarkerRef = useRef<L.LayerGroup | null>(null);
    const routeLineRef = useRef<L.FeatureGroup | null>(null);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (!mapRef.current) {
            const m = L.map(mapContainerRef.current, { zoomControl: false }).setView([-34.62, -58.44], 12);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap",
            }).addTo(m);

            L.control.zoom({ position: 'bottomright' }).addTo(m);
            markersLayerRef.current = L.layerGroup().addTo(m);
            currentMarkerRef.current = L.layerGroup().addTo(m);
            routeLineRef.current = L.featureGroup().addTo(m);
            mapRef.current = m;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Load clients candidates
    const fetchCandidates = useCallback(async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('empresa_cliente')
                .select('id, cliente_id, estado, rubro, ultima_actividad, updated_at, created_at, fecha_proximo_contacto')
                .eq('empresa_id', empresaActiva.id)
                .eq('activo', true)
                .limit(100);

            if (data) {
                const clienteIds = (data.map(ec => ec.cliente_id).filter(Boolean) as unknown) as number[];
                const { data: raw } = await supabase
                    .from('clientes')
                    .select('id, nombre_local, direccion, lat, lng')
                    .in('id', clienteIds);

                const clientMap: Record<string, any> = {};
                (raw || []).forEach(c => clientMap[c.id] = c);

                const processed = data
                    .map(ec => ({
                        ...ec,
                        clientes: ec.cliente_id ? clientMap[ec.cliente_id] : null,
                        risk: getChurnRisk(ec)
                    }))
                    .filter(c => c.clientes);

                processed.sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0));

                setClients(processed as unknown as TinderClient[]);
            }
        } catch (e) {
            console.error(e);
            toast.error(t('tinder.toast.load_error'));
        } finally {
            setLoading(false);
        }
    }, [empresaActiva, t]);

    // Fetch existing visits for stats and map
    const fetchExistingVisits = useCallback(async () => {
        if (!empresaActiva?.id || !usuarioSeleccionado || !fechaSeleccionada) {
            setExistingVisits([]);
            setStats(prev => ({ ...prev, scheduled: 0 }));
            return;
        }

        try {
            const { data: visitasRaw, error: vError } = await supabase
                .from('visitas_diarias')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', usuarioSeleccionado)
                .eq('fecha_asignada', fechaSeleccionada)
                .order('orden', { ascending: true });

            if (vError) throw vError;
            if (!visitasRaw || visitasRaw.length === 0) {
                setExistingVisits([]);
                setStats(prev => ({ ...prev, scheduled: 0 }));
                return;
            }

            const clienteIds = [...new Set(visitasRaw.map((v: any) => v.cliente_id))];
            const { data: clientesRaw, error: cError } = await supabase
                .from('clientes')
                .select('id, nombre_local, lat, lng')
                .in('id', (clienteIds as unknown as number[]));

            if (cError) throw cError;

            const clienteMap: Record<string, any> = {};
            (clientesRaw || []).forEach(c => { clienteMap[c.id] = c; });

            const enriched = visitasRaw.map((v: any) => ({
                ...v,
                clientes: clienteMap[v.cliente_id] || null
            }));

            setExistingVisits(enriched);
            setStats(prev => ({ ...prev, scheduled: enriched.length }));
        } catch (e) {
            console.error('Error fetching existing visits:', e);
        }
    }, [empresaActiva, usuarioSeleccionado, fechaSeleccionada]);

    // Load users for assignment
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsers = async () => {
            const { data: euData } = await supabase.from('empresa_usuario').select('usuario_email').eq('empresa_id', empresaActiva.id);
            const emails = (euData || []).map(e => e.usuario_email);
            if (emails.length === 0) return;
            const { data: usersData } = await supabase.from('usuarios').select('email, nombre').in('email', emails).order('nombre');
            setUsuarios((usersData || []).map((u: any) => ({ email: u.email, nombre: u.nombre || u.email })));
        };
        fetchUsers();
    }, [empresaActiva]);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    useEffect(() => {
        fetchExistingVisits();
    }, [fetchExistingVisits]);

    // Update Map Markers and Route
    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current || !routeLineRef.current || !currentMarkerRef.current) return;

        markersLayerRef.current.clearLayers();
        currentMarkerRef.current.clearLayers();
        routeLineRef.current.clearLayers();

        const routePoints: L.LatLngExpression[] = [];
        const allPoints: L.LatLngExpression[] = [];

        existingVisits.forEach((v, idx) => {
            if (v.clientes?.lat && v.clientes?.lng) {
                const pos: L.LatLngExpression = [v.clientes.lat, v.clientes.lng];
                const icon = L.divIcon({
                    className: 'custom-marker scheduled',
                    html: `<div style="background: #0c0c0c; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 800; box-shadow: var(--shadow-md);">${idx + 1}</div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                L.marker(pos, { icon }).addTo(markersLayerRef.current!)
                    .bindTooltip(`${idx + 1}. ${v.clientes.nombre_local}`, { direction: 'top', offset: [0, -10] });

                routePoints.push(pos);
                allPoints.push(pos);
            }
        });

        if (routePoints.length > 1) {
            L.polyline(routePoints, { color: '#0c0c0c', weight: 4, opacity: 0.6, lineJoin: 'round' }).addTo(routeLineRef.current);
        }

        const currentClient = clients[0]?.clientes;
        if (currentClient?.lat && currentClient?.lng) {
            const pos: L.LatLngExpression = [currentClient.lat, currentClient.lng];
            const icon = L.divIcon({
                className: 'custom-marker current',
                html: `<div style="position: relative; width: 24px; height: 24px;"><div style="position: absolute; inset: 0; background: #0c0c0c; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div><div style="position: relative; background: #0c0c0c; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; color: white;"><span style="font-size: 10px; font-weight: 900;">★</span></div></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            L.marker(pos, { icon }).addTo(currentMarkerRef.current)
                .bindTooltip('<b>' + t('tinder.map.next') + ':</b> ' + currentClient.nombre_local, { permanent: true, className: 'tooltip-premium', direction: 'top', offset: [0, -15] });

            allPoints.push(pos);

            if (routePoints.length > 0) {
                const lastPoint = routePoints[routePoints.length - 1];
                L.polyline([lastPoint, pos], { color: '#333', weight: 3, opacity: 0.5, dashArray: '8, 8', lineJoin: 'round' }).addTo(routeLineRef.current);
            }
        }

        if (allPoints.length > 0 && mapRef.current) {
            const bounds = L.latLngBounds(allPoints);
            mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        }
    }, [existingVisits, clients, t]);

    const handleSwipe = async (direction: 'left' | 'right', client: TinderClient) => {
        setClients(prev => prev.filter(c => c.id !== client.id));

        if (direction === 'right') {
            if (!usuarioSeleccionado) {
                toast.error(t('tinder.toast.select_vendor'));
                setClients(prev => [client, ...prev]); // Put it back
                return;
            }
            if (!empresaActiva?.id) return;

            const { error } = await supabase.from('visitas_diarias').insert([{
                empresa_id: empresaActiva.id,
                cliente_id: Number(client.cliente_id),
                usuario_asignado_email: usuarioSeleccionado,
                fecha_asignada: fechaSeleccionada,
                estado: 'Pendiente',
                orden: 999
            }]);

            if (error) {
                console.error('Error inserting visit:', error);
                toast.error(t('tinder.toast.add_error'));
                setClients(prev => [client, ...prev]); // Put it back
            } else {
                toast.success(t('tinder.toast.add_success', { name: usuarioSeleccionado.split('@')[0] }), { icon: '🚀' });
                setStats(prev => ({ ...prev, added: prev.added + 1, scheduled: prev.scheduled + 1 }));
                fetchExistingVisits(); // Refresh map
            }
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            const { error } = await supabase
                .from('empresa_cliente')
                .update({ fecha_proximo_contacto: dateStr })
                .eq('id', client.id as any);

            if (error) {
                console.error('Error postponing client:', error);
                toast.error(t('tinder.toast.postpone_error'));
                setClients(prev => [client, ...prev]); // Put it back
            } else {
                toast(t('tinder.toast.postpone_success'), { icon: '⏰' });
                setStats(prev => ({ ...prev, postponed: prev.postponed + 1 }));
            }
        }
    };

    return {
        clients,
        loading,
        usuarios,
        usuarioSeleccionado,
        setUsuarioSeleccionado,
        fechaSeleccionada,
        setFechaSeleccionada,
        stats,
        existingVisits,
        mapContainerRef,
        handleSwipe,
        fetchCandidates
    };
}
