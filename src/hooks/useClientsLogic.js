import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClientes, useDeleteCliente, useQuickDateCliente, useRegistrarVisitaCliente } from '../hooks/useClientes';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { descargarModeloClientes, importarClientesExcel, exportarClientesExcel } from '../lib/excelExport';

export const useClientsLogic = () => {
    const { user, userName, empresaActiva } = useAuth();
    const [searchParams] = useSearchParams();
    const isAgendaHoy = searchParams.get('agenda') === 'hoy';

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [exportLoading, setExportLoading] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        nombre: '',
        telefono: '',
        direccion: '',
        estado: 'Todos',
        situacion: 'Todos',
        responsable: '',
        rubro: '',
        interes: '',
        estilo: '',
        tipoContacto: 'Todos',
        proximos7: false,
        vencidos: false,
        creadoDesde: '',
        creadoHasta: ''
    });

    const [sortBy, setSortBy] = useState('updated');
    const [rubrosValidos, setRubrosValidos] = useState([]);
    const [expandedActivities, setExpandedActivities] = useState({});

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [actModalOpen, setActModalOpen] = useState(false);
    const [actTargetId, setActTargetId] = useState(null);
    const [actTargetName, setActTargetName] = useState('');

    const { data, isLoading: loading, refetch: fetchClientes } = useClientes({
        empresaId: empresaActiva?.id,
        page, pageSize, isAgendaHoy,
        fEstado: filters.estado, fSituacion: filters.situacion, fTipoContacto: filters.tipoContacto, 
        fResponsable: filters.responsable, fRubro: filters.rubro, fInteres: filters.interes, 
        fEstilo: filters.estilo, fProximos7: filters.proximos7, fVencidos: filters.vencidos,
        fNombre: filters.nombre, fTelefono: filters.telefono, fDireccion: filters.direccion, 
        fCreadoDesde: filters.creadoDesde, fCreadoHasta: filters.creadoHasta, sortBy
    });

    const { clientes = [], total = 0, activities = {} } = data || {};
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const queryClient = useQueryClient();

    const deleteClienteMutation = useDeleteCliente();
    const quickDateMutation = useQuickDateCliente();
    const visitaMutation = useRegistrarVisitaCliente();

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

    const updateFilter = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const handleCreate = useCallback(() => {
        setEditingId(null);
        setModalOpen(true);
    }, []);

    const handleEdit = useCallback((id) => {
        setEditingId(id);
        setModalOpen(true);
    }, []);

    const handleDelete = useCallback((id) => {
        if (!window.confirm("¿Seguro que querés marcar como inactivo este cliente?")) return;
        deleteClienteMutation.mutate({ id, empresaActiva });
    }, [empresaActiva, deleteClienteMutation]);

    const handleOpenActivity = useCallback((id, nombre) => {
        setActTargetId(id);
        setActTargetName(nombre || 'Sin nombre');
        setActModalOpen(true);
    }, []);

    const toggleHistory = useCallback((id) => {
        setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const handleQuickDate = useCallback((clienteId, daysOffset) => {
        quickDateMutation.mutate({ clienteId, daysOffset, empresaActiva, userName, user });
    }, [empresaActiva, userName, user, quickDateMutation]);

    const handleRegistrarVisita = useCallback((clienteId, nombre) => {
        visitaMutation.mutate({ clienteId, nombre, empresaActiva, userName, user });
    }, [empresaActiva, userName, user, visitaMutation]);

    const handleImportExcel = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await importarClientesExcel(file, empresaActiva, userName, user?.email, () => fetchClientes());
        e.target.value = '';
    };

    const handleDescargarExcel = async () => {
        setExportLoading(true);
        await exportarClientesExcel(empresaActiva, () => setExportLoading(false));
    };

    return {
        isAgendaHoy, page, setPage, totalPages, loading, clientes, total, activities,
        filters, updateFilter, rubrosValidos, sortBy, setSortBy, expandedActivities, toggleHistory,
        exportLoading, handleDescargarExcel, handleImportExcel, handleDescargarModelo: descargarModeloClientes,
        modalOpen, setModalOpen, editingId, handleCreate, handleEdit, handleDelete,
        actModalOpen, setActModalOpen, actTargetId, actTargetName, handleOpenActivity,
        handleQuickDate, handleRegistrarVisita, queryClient
    };
};
