import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Download, Upload, Search, MapPin, Phone, Mail, Calendar, Clock, Store, Tag, User, Hash, Filter, Activity as ActivityIcon, Edit2, Trash2, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { ClienteModal } from '../components/ui/ClienteModal';
import { ActividadClienteModal } from '../components/ui/ActividadClienteModal';

export default function Clientes() {
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
    const [fResponsable, setFResponsable] = useState('');
    const [fRubro, setFRubro] = useState('');
    const [fInteres, setFInteres] = useState('');
    const [fEstilo, setFEstilo] = useState('');

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
            const { data } = await supabase.from('clientes').select('rubro').eq('activo', true);
            if (data) {
                const uniqueRubros = [...new Set(data.map(c => c.rubro).filter(r => r && r.trim() !== ''))].sort();
                setRubrosValidos(uniqueRubros);
            }
        };
        fetchRubros();
    }, []);

    const fetchClientes = async () => {
        setLoading(true);
        let request = supabase
            .from('clientes')
            .select('*', { count: 'exact' })
            .eq('activo', true)
            .order('ultima_actividad', { ascending: false, nullsFirst: false })
            .order('id', { ascending: true })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (isAgendaHoy) {
            request = request.eq('fecha_proximo_contacto', new Date().toISOString().split('T')[0]);
        }

        if (fEstado !== 'Todos') request = request.eq('estado', fEstado);
        if (fNombre) request = request.or(`nombre.ilike.%${fNombre}%,nombre_local.ilike.%${fNombre}%`);
        if (fTelefono) request = request.ilike('telefono', `%${fTelefono}%`);
        if (fDireccion) request = request.ilike('direccion', `%${fDireccion}%`);
        if (fResponsable) request = request.eq('responsable', fResponsable);
        if (fRubro) request = request.eq('rubro', fRubro);
        if (fInteres) request = request.eq('interes', fInteres);
        if (fEstilo) request = request.eq('estilo_contacto', fEstilo);

        const { data, count, error } = await request;

        if (error) {
            toast.error('Error al cargar clientes');
            console.error(error);
        } else {
            setClientes(data || []);
            setTotal(count || 0);

            if (data?.length > 0) {
                const ids = data.map(c => c.id);
                const { data: acts, error: actError } = await supabase
                    .from('actividades')
                    .select('*')
                    .in('cliente_id', ids)
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
    }, [page, pageSize, fNombre, fTelefono, fDireccion, fEstado, fResponsable, fRubro, fInteres, fEstilo, isAgendaHoy]);

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
        const { error } = await supabase.from("clientes").update({ activo: false }).eq("id", id);
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

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const handleDescargarModelo = () => {
        try {
            const wb = window.XLSX.utils.book_new();
            const headers = ["nombre", "telefono", "direccion", "rubro", "estado", "responsable", "fecha_proximo_contacto", "hora_proximo_contacto", "notas"];
            const data = [
                headers,
                ["Ejemplo SRL", "11-2345-6789", "Av. Rivadavia 1234", "Almacén", "1 - Cliente relevado", "Toto", "2025-01-15", "09:00", "Ejemplo de nota"]
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
            const { data: allClientes, error: errCli } = await supabase
                .from("clientes")
                .select("id, nombre, telefono, direccion, rubro, estado, responsable, fecha_proximo_contacto, hora_proximo_contacto, notas")
                .eq("activo", true);

            if (errCli) throw errCli;

            const ids = (allClientes || []).map(c => c.id);
            const { data: allActividades, error: errAct } = await supabase
                .from("actividades")
                .select("cliente_id, fecha, usuario, descripcion")
                .in("cliente_id", ids);

            if (errAct) throw errAct;

            const wb = window.XLSX.utils.book_new();

            // Sheet 1: Clientes
            const dataClientes = [["id", "nombre", "telefono", "direccion", "rubro", "estado", "responsable", "fecha_proximo_contacto", "hora_proximo_contacto", "notas"]];
            allClientes.forEach(c => {
                dataClientes.push([
                    c.id, c.nombre || "", c.telefono || "", c.direccion || "", c.rubro || "",
                    c.estado || "", c.responsable || "", c.fecha_proximo_contacto || "",
                    c.hora_proximo_contacto || "", c.notas || ""
                ]);
            });
            const wsClientes = window.XLSX.utils.aoa_to_sheet(dataClientes);
            window.XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

            // Sheet 2: Historial
            const clientePorId = {};
            allClientes.forEach(c => (clientePorId[c.id] = c));
            const dataHist = [["cliente_id", "nombre_cliente", "telefono_cliente", "fecha", "usuario", "descripcion"]];
            (allActividades || []).forEach(a => {
                const cli = clientePorId[a.cliente_id] || {};
                dataHist.push([a.cliente_id, cli.nombre || "", cli.telefono || "", a.fecha || "", a.usuario || "", a.descripcion || ""]);
            });
            const wsHist = window.XLSX.utils.aoa_to_sheet(dataHist);
            window.XLSX.utils.book_append_sheet(wb, wsHist, "Historial");

            const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([new Uint8Array(wbout)], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "crm_clientes_historial.xlsx";
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
                {/* Subtle light effect top edge */}
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
                </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        Listado <span className="muted" style={{ fontWeight: 500, fontSize: '1.2rem' }}>({total})</span>
                    </h2>
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
                        const acts = activities[c.id] || [];
                        const isExpanded = expandedActivities[c.id];

                        const hasPhone = Boolean(c.telefono);
                        const hasEmail = Boolean(c.mail);
                        const hasAddress = Boolean(c.direccion);

                        return (
                            <div key={c.id} className="bento-card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
                                {/* Accent line for active clients */}
                                {c.estado === '5 - Local Visitado Activo' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--success)' }}></div>}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, paddingRight: '12px' }}>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                                            {c.nombre_local || c.nombre || "(Sin nombre)"}
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
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

                                    {/* Quick actions top right */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => handleEdit(c.id)} className="" style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(c.id)} className="" style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', cursor: 'pointer' }} title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Badges row */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {c.estado && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                            {c.estado}
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

                                {/* Footer / Activities */}
                                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <button onClick={() => toggleHistory(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', transition: 'color 0.2s' }}>
                                            <Clock size={16} style={{ color: isExpanded ? 'var(--accent)' : 'inherit' }} /> Historial ({acts.length})
                                        </button>
                                        <Button variant="secondary" onClick={() => handleOpenActivity(c.id, c.nombre || c.nombre_local)} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px' }}>
                                            <Plus size={14} style={{ marginRight: '4px' }} /> Actividad
                                        </Button>
                                    </div>

                                    {/* Animated Expandable History */}
                                    <div style={{
                                        maxHeight: isExpanded ? '300px' : '0',
                                        opacity: isExpanded ? 1 : 0,
                                        overflowY: 'auto',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        paddingRight: '4px'
                                    }} className={isExpanded ? "table-wrap-soft" : ""}>
                                        {isExpanded && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                                                {acts.length > 0 ? acts.map(a => (
                                                    <div key={a.id} style={{ borderLeft: '3px solid rgba(59, 130, 246, 0.4)', paddingLeft: '12px' }}>
                                                        <div style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '4px' }}>{a.descripcion}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {new Date(a.fecha).toLocaleString('es-AR')} {a.usuario && <span>· <strong>{a.usuario}</strong></span>}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="muted" style={{ fontSize: '0.9rem', textAlign: 'center', padding: '12px 0' }}>No hay actividades registradas.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
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
                    <select
                        className="input"
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        style={{ width: '80px' }}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                </div>
            )}

            <ClienteModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                clienteId={editingId}
                onSaved={() => { setModalOpen(false); fetchClientes(); }}
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
