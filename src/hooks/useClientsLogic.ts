import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClientes, useDeleteCliente, useQuickDateCliente, useRegistrarVisitaCliente, useRegistrarLlamadaCliente } from '../hooks/useClientes';
import { useCompanyUsers } from '../hooks/useCompanyUsers';
import { useRubros } from '../hooks/useRubros';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { descargarModeloClientes, importarClientesExcel, exportarClientesExcel } from '../lib/excelExport';
import { Client, ClientActivity } from '../types/client';
import { useGrupos } from './useGrupos';

export interface ClientFilters {
    nombre: string;
    telefono: string;
    direccion: string;
    estado: string[];
    situacion: string[];
    responsable: string[];
    creadoPor: string[];
    rubro: string[];
    interes: string[];
    estilo: string[];
    tipoContacto: string[];
    proximos7: boolean;
    vencidos: boolean;
    creadoDesde: string;
    creadoHasta: string;
    contactoDesde: string;
    contactoHasta: string;
    grupos: string[];
    fMissingCoords?: boolean;
    fMissingContact?: boolean;
    fMissingRubro?: boolean;
}

export const useClientsLogic = () => {
    const { user, userName, empresaActiva }: any = useAuth();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const stateFilters = location.state as Partial<ClientFilters> | null;
    const isAgendaHoy = searchParams.get('agenda') === 'hoy';

    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [exportLoading, setExportLoading] = useState(false);

    // Filters (merge with incoming navigation state for drill-down)
    const [filters, setFilters] = useState<ClientFilters>({
        nombre: stateFilters?.nombre || '',
        telefono: stateFilters?.telefono || '',
        direccion: stateFilters?.direccion || '',
        estado: stateFilters?.estado || [],
        situacion: stateFilters?.situacion || [],
        responsable: stateFilters?.responsable || [],
        creadoPor: stateFilters?.creadoPor || [],
        rubro: stateFilters?.rubro || [],
        interes: stateFilters?.interes || [],
        estilo: stateFilters?.estilo || [],
        tipoContacto: stateFilters?.tipoContacto || [],
        proximos7: stateFilters?.proximos7 || false,
        vencidos: stateFilters?.vencidos || false,
        creadoDesde: stateFilters?.creadoDesde || '',
        creadoHasta: stateFilters?.creadoHasta || '',
        contactoDesde: stateFilters?.contactoDesde || '',
        contactoHasta: stateFilters?.contactoHasta || '',
        grupos: stateFilters?.grupos || [],
        fMissingCoords: stateFilters?.fMissingCoords || false,
        fMissingContact: stateFilters?.fMissingContact || false,
        fMissingRubro: stateFilters?.fMissingRubro || false,
    });

    const [sortBy, setSortBy] = useState('updated');
    const { data: responsablesValidos = [] } = useCompanyUsers(empresaActiva?.id);
    const { data: rubrosValidos = [] } = useRubros();
    const { data: gruposValidos = [] } = useGrupos(empresaActiva?.id);
    const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [actModalOpen, setActModalOpen] = useState(false);
    const [actTargetId, setActTargetId] = useState<string | null>(null);
    const [actTargetName, setActTargetName] = useState('');

    const { data, isLoading: loading, refetch: fetchClientes }: any = useClientes({
        empresaId: empresaActiva?.id,
        page, pageSize, isAgendaHoy,
        fEstado: filters.estado, fSituacion: filters.situacion, fTipoContacto: filters.tipoContacto,
        fResponsable: filters.responsable, fCreadoPor: filters.creadoPor, fRubro: filters.rubro, fInteres: filters.interes,
        fEstilo: filters.estilo, fProximos7: filters.proximos7, fVencidos: filters.vencidos,
        fNombre: filters.nombre, fTelefono: filters.telefono, fDireccion: filters.direccion,
        fCreadoDesde: filters.creadoDesde, fCreadoHasta: filters.creadoHasta, 
        fContactoDesde: filters.contactoDesde, fContactoHasta: filters.contactoHasta, 
        fGrupos: filters.grupos, 
        fMissingCoords: filters.fMissingCoords, fMissingContact: filters.fMissingContact, fMissingRubro: filters.fMissingRubro,
        sortBy
    });

    const { clientes = [] as Client[], total = 0, activities = {} as Record<string, ClientActivity[]> } = data || {};
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const queryClient = useQueryClient();

    const deleteClienteMutation = useDeleteCliente();
    const quickDateMutation = useQuickDateCliente();
    const visitaMutation = useRegistrarVisitaCliente();
    const llamadaMutation = useRegistrarLlamadaCliente();



    const updateFilter = (name: keyof ClientFilters, value: any) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const handleCreate = useCallback(() => {
        setEditingId(null);
        setModalOpen(true);
    }, []);

    const handleEdit = useCallback((id: string) => {
        setEditingId(id);
        setModalOpen(true);
    }, []);

    const handleDelete = useCallback((id: string) => {
        if (!window.confirm("¿Seguro que querés marcar como inactivo este cliente?")) return;
        deleteClienteMutation.mutate({ id, empresaActiva });
    }, [empresaActiva, deleteClienteMutation]);

    const handleOpenActivity = useCallback((id: string, nombre: string) => {
        setActTargetId(id);
        setActTargetName(nombre || 'Sin nombre');
        setActModalOpen(true);
    }, []);

    const toggleHistory = useCallback((id: string) => {
        setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const handleQuickDate = useCallback((clienteId: string, daysOffset: number) => {
        quickDateMutation.mutate({ clienteId, daysOffset, empresaActiva, userName, user });
    }, [empresaActiva, userName, user, quickDateMutation]);

    const handleRegistrarVisita = useCallback((clienteId: string, nombre: string) => {
        visitaMutation.mutate({ clienteId, nombre, empresaActiva, userName, user });
    }, [empresaActiva, userName, user, visitaMutation]);

    const handleRegistrarLlamada = useCallback((clienteId: string, nombre: string) => {
        llamadaMutation.mutate({ clienteId, nombre, empresaActiva, userName, user });
    }, [empresaActiva, userName, user, llamadaMutation]);

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await importarClientesExcel(file, empresaActiva, userName, user?.email, () => fetchClientes());
        e.target.value = '';
    };

    const handleDescargarExcel = async () => {
        setExportLoading(true);
        await exportarClientesExcel(empresaActiva, filters, () => setExportLoading(false));
    };

    return {
        isAgendaHoy, page, setPage, totalPages, loading, clientes, total, activities,
        filters, updateFilter, rubrosValidos, responsablesValidos, gruposValidos, sortBy, setSortBy, expandedActivities, toggleHistory,
        exportLoading, handleDescargarExcel, handleImportExcel, handleDescargarModelo: descargarModeloClientes,
        modalOpen, setModalOpen, editingId, handleCreate, handleEdit, handleDelete,
        actModalOpen, setActModalOpen, actTargetId, actTargetName, handleOpenActivity,
        handleQuickDate, handleRegistrarVisita, handleRegistrarLlamada, queryClient
    };
};
