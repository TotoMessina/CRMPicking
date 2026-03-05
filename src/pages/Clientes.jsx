import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Download, Upload, Search, MapPin, Phone, Mail, Calendar, Clock, Store, Tag, User, Hash, Filter, Activity as ActivityIcon, Edit2, Trash2, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { ClienteModal } from '../components/ui/ClienteModal';
import { ActividadClienteModal } from '../components/ui/ActividadClienteModal';

export default function Clientes() {
    const { empresaActiva } = useAuth();
    const [searchParams] = useSearchParams();
    const isAgendaHoy = searchParams.get('agenda') === 'hoy';

    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [exportLoading, setExportLoading] = useState(false);

    // Filters
    const [fNombre, setFNombre] = useState('');
    const [fTelefono, setFTelefono] = useState('');
    const [fDireccion, setFDireccion] = useState('');
    const [fEstado, setFEstado] = useState('Todos');
    const [fSituacion, setFSituacion] = useState('Todos');
    const [fResponsable, setFResponsable] = useState('');
    const [fRubro, setFRubro] = useState('');
    const [fInteres, setFInteres] = useState('');
    const [fEstilo, setFEstilo] = useState('');
    const [fTipoContacto, setFTipoContacto] = useState('Todos');
    const [fProximos7, setFProximos7] = useState(false);

    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'oldest', 'az', 'za', 'activity_desc', 'activity_asc'

    // Metadata (Rubros to populate select)
    const [rubrosValidos, setRubrosValidos] = useState([]);

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [actModalOpen, setActModalOpen] = useState(false);
    const [actTargetId, setActTargetId] = useState(null);
    const [actTargetName, setActTargetName] = useState('');

    // Activities
    const [activities, setActivities] = useState({});
    const [expandedActivities, setExpandedActivities] = useState({});

    useEffect(() => {
        const fetchRubros = async () => {
            if (!empresaActiva?.id) return;
            const { data } = await supabase.from('empresa_cliente').select('rubro').eq('empresa_id', empresaActiva.id).eq('activo', true);
            if (data) {
                const uniqueRubros = [...new Set(data.map(c => c.rubro).filter(r => r && r.trim() !== ''))].sort();
                setRubrosValidos(uniqueRubros);
            }
        };
        fetchRubros();
    }, [empresaActiva]);

    const fetchClientes = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);

        let request = supabase
            .from('empresa_cliente')
            .select('*, clientes(*)', { count: 'exact' })
            .eq('empresa_id', empresaActiva.id)
            .eq('activo', true);

        // Apply sorting
        if (sortBy === 'recent') {
            request = request.order('created_at', { ascending: false }).order('ultima_actividad', { ascending: false, nullsFirst: false });
        } else if (sortBy === 'oldest') {
            request = request.order('created_at', { ascending: true }).order('ultima_actividad', { ascending: true, nullsFirst: false });
        } else if (sortBy === 'az') {
            request = request.order('updated_at', { ascending: false });
        } else if (sortBy === 'activity_desc') {
            request = request.order('ultima_actividad', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
        } else if (sortBy === 'activity_asc') {
            request = request.order('ultima_actividad', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true });
        }

        request = request.range((page - 1) * pageSize, page * pageSize - 1);

        if (isAgendaHoy) {
            request = request.eq('fecha_proximo_contacto', new Date().toISOString().split('T')[0]);
        }

        if (fEstado !== 'Todos') request = request.eq('estado', fEstado);
        if (fSituacion !== 'Todos') request = request.eq('situacion', fSituacion);
        if (fTipoContacto !== 'Todos') request = request.eq('tipo_contacto', fTipoContacto);
        if (fResponsable) request = request.eq('responsable', fResponsable);
        if (fRubro) request = request.eq('rubro', fRubro);
        if (fInteres) request = request.eq('interes', fInteres);
        if (fEstilo) request = request.eq('estilo_contacto', fEstilo);

        if (fProximos7) {
            const hoy = new Date();
            const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7);
            const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            request = request.gte('fecha_proximo_contacto', fmt(hoy)).lte('fecha_proximo_contacto', fmt(en7));
        }

        // If text filters are active (nombre, teléfono, dirección) use RPC to search across
        // empresa_cliente JOIN clientes server-side — PostgREST can't filter embedded columns
        const hasTextFilter = fNombre || fTelefono || fDireccion;

        if (hasTextFilter) {
            const { data: rpcData, error: rpcError } = await supabase.rpc('buscar_clientes_empresa', {
                p_empresa_id: empresaActiva.id,
                p_nombre: fNombre || null,
                p_telefono: fTelefono || null,
                p_direccion: fDireccion || null,
                p_estado: fEstado !== 'Todos' ? fEstado : null,
                p_situacion: fSituacion !== 'Todos' ? fSituacion : null,
                p_tipo_contacto: fTipoContacto !== 'Todos' ? fTipoContacto : null,
                p_responsable: fResponsable || null,
                p_rubro: fRubro || null,
                p_interes: fInteres || null,
                p_estilo: fEstilo || null,
                p_offset: (page - 1) * pageSize,
                p_limit: pageSize,
            });

            if (rpcError) {
                toast.error('Error al buscar clientes');
                console.error(rpcError);
            } else {
                const mapped = (rpcData || []).map(row => ({
                    // Universal data (from flattened RPC columns)
                    id: row.cliente_id,
                    nombre: row.nombre,
                    nombre_local: row.nombre_local,
                    direccion: row.direccion,
                    telefono: row.telefono,
                    mail: row.mail,
                    cuit: row.cuit,
                    lat: row.lat,
                    lng: row.lng,
                    clientes: { created_at: row.c_created_at },
                    // Company data
                    estado: row.estado,
                    rubro: row.rubro,
                    responsable: row.responsable,
                    situacion: row.situacion,
                    notas: row.notas,
                    estilo_contacto: row.estilo_contacto,
                    interes: row.interes,
                    tipo_contacto: row.tipo_contacto,
                    venta_digital: row.venta_digital,
                    venta_digital_cual: row.venta_digital_cual,
                    fecha_proximo_contacto: row.fecha_proximo_contacto,
                    hora_proximo_contacto: row.hora_proximo_contacto,
                    activador_cierre: row.activador_cierre,
                    created_at: row.ec_created_at,
                }));
                console.log('Clientes cargados (RPC):', mapped.length, new Date().toISOString());
                setClientes(mapped);
                setTotal(rpcData?.length === pageSize ? (page * pageSize) + 1 : (page - 1) * pageSize + (rpcData?.length || 0));

                if (mapped.length > 0) {
                    const ids = mapped.map(c => c.id).filter(Boolean);
                    const { data: acts } = await supabase
                        .from('actividades').select('*')
                        .in('cliente_id', ids).eq('empresa_id', empresaActiva.id)
                        .order('fecha', { ascending: false });
                    if (acts) {
                        const actsObj = {};
                        acts.forEach(a => { if (!actsObj[a.cliente_id]) actsObj[a.cliente_id] = []; actsObj[a.cliente_id].push(a); });
                        setActivities(actsObj);
                    }
                }
            }
            setLoading(false);
            return;
        }

        const { data, count, error } = await request;

        if (error) {
            toast.error('Error al cargar clientes');
            console.error(error);
        } else {
            const mapped = (data || []).map(row => {
                const c = row.clientes || {};
                return {
                    // Universal data
                    id: c.id,
                    nombre: c.nombre,
                    nombre_local: c.nombre_local,
                    direccion: c.direccion,
                    telefono: c.telefono,
                    mail: c.mail,
                    cuit: c.cuit,
                    lat: c.lat,
                    lng: c.lng,
                    clientes: { created_at: c.created_at }, // For the "Created" field
                    // Company data
                    estado: row.estado,
                    rubro: row.rubro,
                    responsable: row.responsable,
                    situacion: row.situacion,
                    notas: row.notas,
                    estilo_contacto: row.estilo_contacto,
                    interes: row.interes,
                    tipo_contacto: row.tipo_contacto,
                    venta_digital: row.venta_digital,
                    venta_digital_cual: row.venta_digital_cual,
                    fecha_proximo_contacto: row.fecha_proximo_contacto,
                    hora_proximo_contacto: row.hora_proximo_contacto,
                    activador_cierre: row.activador_cierre,
                    created_at: row.created_at, // ec.created_at
                };
            });

            console.log('Clientes cargados (direct):', mapped.length);
            setClientes(mapped);
            setTotal(count || 0);

            if (mapped.length > 0) {
                const ids = mapped.map(c => c.id).filter(Boolean);
                const { data: acts, error: actError } = await supabase
                    .from('actividades')
                    .select('*')
                    .in('cliente_id', ids)
                    .eq('empresa_id', empresaActiva.id)
                    .order('fecha', { ascending: false });

                if (!actError && acts) {
                    const actsObj = {};
                    acts.forEach(a => {
                        if (!actsObj[a.cliente_id]) actsObj[a.cliente_id] = [];
                        actsObj[a.cliente_id].push(a);
                    });
                    setActivities(actsObj);
                }
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchClientes();
    }, [page, pageSize, fNombre, fTelefono, fDireccion, fEstado, fSituacion, fTipoContacto, fResponsable, fRubro, fInteres, fEstilo, fProximos7, isAgendaHoy, sortBy, empresaActiva]);

    const handleCreate = () => {
        setEditingId(null);
        setModalOpen(true);
    };

    const handleEdit = (id) => {
        setEditingId(id);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que querés marcar como inactivo este cliente?")) return;
        const { error } = await supabase.from("empresa_cliente").update({ activo: false }).eq("cliente_id", id).eq("empresa_id", empresaActiva?.id);
        if (error) {
            toast.error("No se pudo eliminar.");
        } else {
            toast.success("Cliente eliminado.");
            fetchClientes();
        }
    };

    const handleOpenActivity = (id, nombre) => {
        setActTargetId(id);
        setActTargetName(nombre || 'Sin nombre');
        setActModalOpen(true);
    };

    const toggleHistory = (id) => {
        setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleQuickDate = async (clienteId, daysOffset) => {
        let dateStr = null;
        let toastMsg = 'Fecha de contacto eliminada';
        if (daysOffset !== null) {
            const d = new Date();
            d.setDate(d.getDate() + daysOffset);
            dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            toastMsg = `Próximo contacto: ${d.toLocaleDateString('es-AR')}`;
        }

        // Update empresa_cliente for company-specific date
        const { error } = await supabase
            .from('empresa_cliente')
            .update({ fecha_proximo_contacto: dateStr })
            .eq('cliente_id', clienteId)
            .eq('empresa_id', empresaActiva?.id);

        if (error) {
            toast.error('Error al guardar fecha');
        } else {
            toast.success(toastMsg);
            fetchClientes();
        }
    };

    const handleRegistrarVisita = async (clienteId, nombre) => {
        const now = new Date().toISOString();
        const { error } = await supabase.from('actividades').insert([{
            cliente_id: clienteId,
            descripcion: 'Visita realizada',
            fecha: now,
            empresa_id: empresaActiva?.id
        }]);
        if (error) {
            toast.error('Error al registrar visita');
        } else {
            await supabase.from('empresa_cliente').update({ ultima_actividad: now }).eq('cliente_id', clienteId).eq('empresa_id', empresaActiva?.id);
            toast.success(`Visita registrada para ${nombre || 'cliente'}`);
            fetchClientes();
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const handleDescargarModelo = () => {
        try {
            const wb = window.XLSX.utils.book_new();
            const headers = ["nombre", "telefono", "direccion", "rubro", "estado", "responsable", "tipo_contacto", "fecha_proximo_contacto", "hora_proximo_contacto", "notas"];
            const data = [
                headers,
                ["Ejemplo SRL", "11-2345-6789", "Av. Rivadavia 1234", "Almacén", "1 - Cliente relevado", "Toto", "Visita Presencial", "2025-01-15", "09:00", "Ejemplo de nota"]
            ];
            const ws = window.XLSX.utils.aoa_to_sheet(data);
            window.XLSX.utils.book_append_sheet(wb, ws, "Modelo");

            const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([new Uint8Array(wbout)], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "modelo_clientes_crm.xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error al generar modelo:", error);
            toast.error("Error al generar el archivo Excel");
        }
    };

    const handleDescargarExcel = async () => {
        setExportLoading(true);
        const toastId = toast.loading('Calculando exportación...');
        try {
            const { data: allRows, error: errCli } = await supabase
                .from("empresa_cliente")
                .select("*, clientes(*)")
                .eq("empresa_id", empresaActiva?.id)
                .eq("activo", true);

            if (errCli) throw errCli;

            const ids = (allRows || []).map(r => r.clientes?.id);
            const { data: allActividades, error: errAct } = await supabase
                .from("actividades")
                .select("cliente_id, fecha, usuario, descripcion")
                .in("cliente_id", ids)
                .eq("empresa_id", empresaActiva?.id);

            if (errAct) throw errAct;

            const wb = window.XLSX.utils.book_new();

            // Sheet 1: Clientes
            const dataClientes = [["id", "nombre", "telefono", "direccion", "rubro", "estado", "responsable", "tipo_contacto", "fecha_proximo_contacto", "hora_proximo_contacto", "notas"]];
            allRows.forEach(r => {
                const c = r.clientes || {};
                dataClientes.push([
                    c.id, c.nombre || r.nombre_local || "", c.telefono || "", c.direccion || r.direccion || "", r.rubro || "",
                    r.estado || "", r.responsable || "", r.tipo_contacto || "", r.fecha_proximo_contacto || "",
                    r.hora_proximo_contacto || "", r.notas || ""
                ]);
            });
            const wsClientes = window.XLSX.utils.aoa_to_sheet(dataClientes);
            window.XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

            // Sheet 2: Historial
            const rowByClientId = {};
            allRows.forEach(r => (rowByClientId[r.clientes?.id] = r));
            const dataHist = [["cliente_id", "nombre_cliente", "telefono_cliente", "fecha", "usuario", "descripcion"]];
            (allActividades || []).forEach(a => {
                const r = rowByClientId[a.cliente_id] || {};
                const c = r.clientes || {};
                dataHist.push([a.cliente_id, c.nombre || r.nombre_local || "", c.telefono || "", a.fecha || "", a.usuario || "", a.descripcion || ""]);
            });
            const wsHist = window.XLSX.utils.aoa_to_sheet(dataHist);
            window.XLSX.utils.book_append_sheet(wb, wsHist, "Historial");

            const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([new Uint8Array(wbout)], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `crm_${empresaActiva?.nombre}_clientes.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Excel descargado correctamente', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Error al exportar clientes', { id: toastId });
        }
        setExportLoading(false);
    };

    return (
        <div className="page-container" style={{ padding: '0', maxWidth: '100%', margin: '0 auto', animation: 'page-enter 0.5s ease-out forwards' }}>

            {/* 1. HERO HEADER */}
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isAgendaHoy ? "Agenda de Hoy" : "Directorio de Clientes"}
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                        {isAgendaHoy ? "Clientes programados para contactar hoy." : "Gestión, historial y segmentación interactiva de comercios."}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button variant="secondary" onClick={handleDescargarModelo} style={{ borderRadius: '99px', fontSize: '0.95rem' }} title="Descargar Modelo Excel">
                        Descargar Modelo
                    </Button>
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '99px', border: '1px solid var(--border)', padding: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <Button variant="secondary" onClick={handleDescargarExcel} disabled={exportLoading} style={{ borderRadius: '99px', border: 'none', background: 'transparent' }} title="Exportar Clientes a Excel">
                            <Download size={18} />
                        </Button>
                        <label className="" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: '99px', border: 'none', background: 'transparent', padding: '8px 16px', color: 'var(--text-muted)' }} title="Importar desde Excel">
                            <Upload size={18} />
                            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} />
                        </label>
                    </div>

                    <Button variant="primary" onClick={handleCreate} className="btn-text-hide-mobile" style={{ padding: '10px 24px', fontSize: '1.05rem', fontWeight: 600, borderRadius: '99px', boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.5)' }}>
                        <Plus size={20} /> <span>Nuevo Cliente</span>
                    </Button>
                </div>
            </header>

            {/* 2. GLASSMORPHIC FILTERS */}
            <section style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '24px',
                marginBottom: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 4px 24px -10px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', opacity: 0.5 }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem' }}>
                    <Filter size={18} style={{ color: 'var(--accent)' }} /> Filtros de Búsqueda
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Nombre o local..." value={fNombre} onChange={e => { setFNombre(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Teléfono..." value={fTelefono} onChange={e => { setFTelefono(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Dirección..." value={fDireccion} onChange={e => { setFDireccion(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }} />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Store size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fRubro} onChange={e => { setFRubro(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier rubro</option>
                            {rubrosValidos.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fEstado} onChange={e => { setFEstado(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="Todos">Todos los estados</option>
                            <option value="1 - Cliente relevado">1 - Cliente relevado</option>
                            <option value="2 - Local Visitado No Activo">2 - Local Visitado No Activo</option>
                            <option value="3 - Primer ingreso">3 - Primer Ingreso</option>
                            <option value="4 - Local Creado">4 - Local Creado</option>
                            <option value="5 - Local Visitado Activo">5 - Local Visitado Activo</option>
                            <option value="6 - Local No Interesado">6 - Local No Interesado</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <ActivityIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fSituacion} onChange={e => { setFSituacion(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="Todos">Todas las situaciones</option>
                            <option value="sin comunicacion nueva">Sin comunicación nueva</option>
                            <option value="en proceso">En proceso</option>
                            <option value="en funcionamiento">En funcionamiento</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fTipoContacto} onChange={e => { setFTipoContacto(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="Todos">Todos los tipos de contacto</option>
                            <option value="Visita Presencial">Visita Presencial</option>
                            <option value="Llamada">Llamada</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fResponsable} onChange={e => { setFResponsable(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier responsable</option>
                            <option value="Toto">Toto</option>
                            <option value="Ruben">Ruben</option>
                            <option value="Tincho(B)">Tincho(B)</option>
                            <option value="Fran">Fran</option>
                            <option value="Ari">Ari</option>
                            <option value="Nati">Nati</option>
                            <option value="Dani">Dani</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Tag size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fInteres} onChange={e => { setFInteres(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier interés</option>
                            <option value="Bajo">Bajo</option>
                            <option value="Medio">Medio</option>
                            <option value="Alto">Alto</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Building size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <select className="input" value={fEstilo} onChange={e => { setFEstilo(e.target.value); setPage(1); }} style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px' }}>
                            <option value="">Cualquier estilo</option>
                            <option value="Dueño">Dueño</option>
                            <option value="Empleado">Empleado</option>
                            <option value="Cerrado">Cerrado</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            onClick={() => { setFProximos7(p => !p); setPage(1); }}
                            style={{
                                width: '100%',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.9rem',
                                background: fProximos7 ? 'var(--accent)' : 'var(--bg-elevated)',
                                color: fProximos7 ? '#fff' : 'var(--text-muted)',
                                border: fProximos7 ? '1px solid var(--accent)' : '1px solid var(--border)',
                                boxShadow: fProximos7 ? '0 4px 14px -4px rgba(37,99,235,0.5)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Calendar size={16} style={{ flexShrink: 0 }} />
                            📅 Próximos 7 días{fProximos7 ? ' ✓' : ''}
                        </button>
                    </div>
                </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        Listado <span className="muted" style={{ fontWeight: 500, fontSize: '1.2rem' }}>({total})</span>
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ordenar por</span>
                        <select
                            className="input"
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            style={{ padding: '8px 12px', borderRadius: '10px', minWidth: '180px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}
                        >
                            <option value="recent">Más recientes</option>
                            <option value="oldest">Más antiguos</option>
                            <option value="activity_desc">Última actividad (Recientes primero)</option>
                            <option value="activity_asc">Última actividad (Antiguos primero)</option>
                            <option value="az">Nombre (A - Z)</option>
                            <option value="za">Nombre (Z - A)</option>
                        </select>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bento-card" style={{ padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="skeleton-line medium" style={{ marginBottom: '8px' }}></div>
                                <div className="skeleton-line short"></div>
                                <div className="skeleton-line short"></div>
                            </div>
                        ))
                    ) : clientes.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                            <p className="muted" style={{ fontSize: '1.1rem' }}>No se encontraron clientes con esos filtros.</p>
                        </div>
                    ) : clientes.map(c => {
                        console.log(`DEBUG CARD: Rendering ${c.id}, notas: "${c.notas}", fecha: ${c.fecha_proximo_contacto}`);
                        const acts = activities[c.id] || [];
                        const isExpanded = expandedActivities[c.id];
                        const visitCount = acts.filter(a => a.descripcion === 'Visita realizada').length;

                        const hasPhone = Boolean(c.telefono);
                        const hasEmail = Boolean(c.mail);
                        const hasAddress = Boolean(c.direccion);

                        let accentColor = 'transparent';
                        if (c.estado?.startsWith('4') || c.estado?.startsWith('5')) {
                            if (c.situacion === 'en funcionamiento') accentColor = 'var(--success)';
                            else if (c.situacion === 'en proceso') accentColor = '#f59e0b'; // Amber
                            else accentColor = 'var(--text-muted)';
                        }

                        return (
                            <div key={c.id} className="bento-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
                                {accentColor !== 'transparent' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accentColor }}></div>}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, paddingRight: '12px' }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                                            {c.nombre_local || c.nombre || "(Sin nombre)"}
                                        </h3>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                            Creado: {c.clientes?.created_at ? new Date(c.clientes.created_at).toLocaleDateString('es-AR') : c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '-'}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                            {c.tipo_contacto && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)', fontWeight: 600 }}>
                                                    {c.tipo_contacto === 'Llamada' ? <Phone size={15} color="var(--accent)" /> : <MapPin size={15} color="var(--accent)" />}
                                                    {c.tipo_contacto}
                                                </div>
                                            )}
                                            {hasAddress && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={15} /> {c.direccion}</div>}
                                            {hasPhone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={15} /> {c.telefono}</div>}
                                            {hasEmail && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={15} /> {c.mail}</div>}
                                            {(c.fecha_proximo_contacto || c.hora_proximo_contacto) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
                                                    <Calendar size={15} />
                                                    Próx: {c.fecha_proximo_contacto ? new Date(c.fecha_proximo_contacto).toLocaleDateString('es-AR') : ''}
                                                    {c.hora_proximo_contacto ? ` a las ${c.hora_proximo_contacto.slice(0, 5)}` : ""}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => handleEdit(c.id)} className="" style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(c.id)} className="" style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', cursor: 'pointer' }} title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {c.estado && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                            {c.estado}
                                        </span>
                                    )}
                                    {(c.estado?.startsWith('4') || c.estado?.startsWith('5')) && c.situacion && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: accentColor !== 'transparent' ? `${accentColor}20` : 'var(--bg-elevated)', color: accentColor !== 'transparent' ? accentColor : 'var(--text)', border: `1px solid ${accentColor !== 'transparent' ? accentColor : 'var(--border)'}` }}>
                                            {c.situacion.toUpperCase()}
                                        </span>
                                    )}
                                    {c.rubro && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                            {c.rubro}
                                        </span>
                                    )}
                                    {c.interes && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: c.interes === 'Alto' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg)', color: c.interes === 'Alto' ? '#ef4444' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                            🔥 Interés: {c.interes}
                                        </span>
                                    )}
                                    {c.responsable && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <User size={12} /> {c.responsable}
                                        </span>
                                    )}
                                </div>

                                {c.notas && (
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text)', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', padding: '12px', borderRadius: '12px', fontStyle: 'italic' }}>
                                        "{c.notas}"
                                    </div>
                                )}

                                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '2px' }}>
                                            <Calendar size={13} style={{ marginRight: '4px' }} /> Próx. contacto:
                                        </span>
                                        {[{ label: '+3d', days: 3 }, { label: '+7d', days: 7 }, { label: '+15d', days: 15 }, { label: '+1mes', days: 30 }].map(({ label, days }) => (
                                            <button
                                                key={label}
                                                onClick={() => handleQuickDate(c.id, days)}
                                                className="quick-date-btn"
                                                style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: '99px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer' }}
                                            >{label}</button>
                                        ))}
                                        {c.fecha_proximo_contacto && (
                                            <button onClick={() => handleQuickDate(c.id, null)} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: '99px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <button onClick={() => toggleHistory(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={16} /> Historial ({acts.length})
                                        </button>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleRegistrarVisita(c.id, c.nombre || c.nombre_local)} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>
                                                🏪 Visita {visitCount > 0 && <span>({visitCount})</span>}
                                            </button>
                                            <Button variant="secondary" onClick={() => handleOpenActivity(c.id, c.nombre || c.nombre_local)} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px' }}>
                                                + Actividad
                                            </Button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', paddingRight: '4px' }}>
                                            {acts.length > 0 ? acts.map(a => (
                                                <div key={a.id} style={{ borderLeft: '3px solid rgba(59, 130, 246, 0.4)', paddingLeft: '12px' }}>
                                                    <div style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '4px' }}>{a.descripcion}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {new Date(a.fecha).toLocaleString('es-AR')} {a.usuario && <span>· <strong>{a.usuario}</strong></span>}
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="muted" style={{ fontSize: '0.9rem', textAlign: 'center' }}>No hay actividades registradas.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {!loading && total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                    <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={16} /></Button>
                    <span className="muted">Página {page} de {totalPages}</span>
                    <Button variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={16} /></Button>
                </div>
            )}

            <ClienteModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                clienteId={editingId}
                onSaved={() => {
                    setModalOpen(false);
                    // Small delay to ensure DB reflects changes before re-querying
                    setTimeout(() => fetchClientes(), 300);
                }}
            />

            <ActividadClienteModal
                isOpen={actModalOpen}
                onClose={() => setActModalOpen(false)}
                clienteId={actTargetId}
                clienteNombre={actTargetName}
                onSaved={() => { setActModalOpen(false); fetchClientes(); }}
            />
        </div>
    );
}
