import { supabase } from './supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { applyClientFilters, ClientFilters } from '../utils/filterUtils';

export const descargarModeloClientes = () => {
    const toastId = toast.loading("Generando modelo...");
    try {
        const wb = XLSX.utils.book_new();
        const headers = ["nombre", "telefono", "direccion", "rubro", "estado", "responsable", "tipo_contacto", "fecha_proximo_contacto", "hora_proximo_contacto", "notas", "fecha_creacion"];
        const data = [
            headers,
            ["Ejemplo SRL", "11-2345-6789", "Av. Rivadavia 1234", "Almacén", "1 - Cliente relevado", "Toto", "Visita Presencial", "2025-01-15", "09:00", "Ejemplo de nota", "2024-12-01"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Modelo");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_clientes_crm.xlsx";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
        toast.success("Modelo descargado correctamente", { id: toastId });
    } catch (error: any) {
        console.error("Error al generar modelo:", error);
        toast.error(error.message || "Error al generar el archivo Excel", { id: toastId });
    }
};

export const descargarModeloConsumidores = () => {
    const toastId = toast.loading("Generando modelo...");
    try {
        const wb = XLSX.utils.book_new();
        const headers = ["nombre", "telefono", "mail", "localidad", "barrio", "notas", "fecha_creacion"];
        const data = [
            headers,
            ["Juan Pérez", "11-2345-6789", "juan.perez@ejemplo.com", "Moreno", "Barrio Norte", "Ejemplo de nota", "2024-11-20"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Modelo Consumidores");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_consumidores_crm.xlsx";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
        toast.success("Modelo descargado correctamente", { id: toastId });
    } catch (error: any) {
        console.error("Error al generar modelo consumidores:", error);
        toast.error(error.message || "Error al generar el archivo Excel", { id: toastId });
    }
};

export const descargarModeloRepartidores = () => {
    const toastId = toast.loading("Generando modelo...");
    try {
        const wb = XLSX.utils.book_new();
        const headers = ["nombre", "telefono", "email", "direccion", "localidad", "responsable", "notas", "estado", "fecha_creacion"];
        const data = [
            headers,
            ["Carlos Delivery", "11-9876-5432", "carlos@reparto.com", "Av. Principal 100", "Morón", "Toto", "Tiene moto propia", "Activo", "2025-01-10"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Modelo Repartidores");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_repartidores_crm.xlsx";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
        toast.success("Modelo descargado correctamente", { id: toastId });
    } catch (error: any) {
        console.error("Error al generar modelo repartidores:", error);
        toast.error(error.message || "Error al generar el archivo Excel", { id: toastId });
    }
};

export const importarClientesExcel = async (
    file: File | null, 
    empresaActiva: any, 
    userName: string | null, 
    userEmail: string | null, 
    onSuccess?: () => void
) => {
    if (!file) return;

    const toastId = toast.loading('Procesando archivo...');
    try {
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('El archivo está vacío', { id: toastId });
                    return;
                }

                const clientsPayload: any[] = [];
                const rowsData: any[] = [];

                for (const row of data) {
                    let rawFecha = row.fecha_creacion || row.created_at || row.fecha || row.Fecha || undefined;
                    let fechaNorm = undefined;
                    
                    if (rawFecha) {
                        if (typeof rawFecha === 'string') {
                            if (rawFecha.includes('/')) {
                                const parts = rawFecha.split(' ')[0].split('/');
                                if (parts.length === 3) {
                                    const day = parts[0].padStart(2, '0');
                                    const month = parts[1].padStart(2, '0');
                                    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                                    fechaNorm = `${year}-${month}-${day}T00:00:00Z`;
                                }
                            } else {
                                const d = new Date(rawFecha);
                                if (!isNaN(d.getTime())) fechaNorm = d.toISOString();
                            }
                        } else if (typeof rawFecha === 'number') {
                            const d = new Date((rawFecha - 25569) * 86400 * 1000);
                            if (!isNaN(d.getTime())) fechaNorm = d.toISOString();
                        }
                    }

                    clientsPayload.push({
                        nombre: row.nombre || row.nombre_local || 'Nuevo Cliente',
                        nombre_local: row.nombre_local || row.nombre || '',
                        direccion: row.direccion || '',
                        telefono: String(row.telefono || ''),
                        mail: row.mail || '',
                        cuit: String(row.cuit || ''),
                        created_at: fechaNorm || undefined
                    });

                    rowsData.push({
                        row,
                        fechaNorm
                    });
                }

                // 1. Crear clientes base por lote
                const { data: newClients, error: cErr } = await supabase
                    .from('clientes')
                    .insert(clientsPayload)
                    .select('id');

                if (cErr) throw cErr;
                if (!newClients || newClients.length === 0) {
                    throw new Error('No se pudieron crear los registros de clientes base.');
                }

                // 2. Asociar a empresa por lote
                const empresaClientePayload = newClients.map((newC, index) => {
                    const { row, fechaNorm } = rowsData[index];
                    return {
                        cliente_id: newC.id,
                        empresa_id: empresaActiva.id,
                        estado: row.estado || '1 - Cliente relevado',
                        rubro: row.rubro || '',
                        responsable: row.responsable || '',
                        situacion: row.situacion || '',
                        notas: row.notas || '',
                        tipo_contacto: row.tipo_contacto || '',
                        fecha_proximo_contacto: row.fecha_proximo_contacto || null,
                        hora_proximo_contacto: row.hora_proximo_contacto || null,
                        creado_por: userName || userEmail || 'Importación',
                        activo: true,
                        created_at: fechaNorm || undefined
                    };
                });

                const { error: ecErr } = await supabase
                    .from('empresa_cliente')
                    .insert(empresaClientePayload);

                if (ecErr) throw ecErr;

                toast.success(`Importación finalizada: ${newClients.length} clientes cargados`, { id: toastId });
                if (onSuccess) onSuccess();
            } catch (err) {
                console.error(err);
                toast.error('Error al procesar el Excel', { id: toastId });
            }
        };
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error(error);
        toast.error('Error al leer el archivo', { id: toastId });
    }
};

export const exportarClientesExcel = async (empresaActiva: any, filters: ClientFilters = {}, onFinally?: () => void) => {
    const toastId = toast.loading('Generando Excel de clientes conforme a los filtros...');
    try {
        let allRows: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
            toast.loading(`Descargando registros ${allRows.length}...`, { id: toastId });
            let selectStr = "*, clientes!inner(*)";
            if (filters.grupos && filters.grupos.length > 0) {
                selectStr = "*, clientes!inner(*, cliente_grupos!inner(grupos(*)))";
            }

            let query = supabase
                .from("empresa_cliente")
                .select(selectStr)
                .eq("empresa_id", empresaActiva?.id)
                .eq("activo", true)
                .order('created_at', { ascending: false })
                .range(from, to);

            // Aplicar filtros centralizados (DT-07)
            query = applyClientFilters(query, filters);

            const { data, error: errCli } = await query;
            if (errCli) throw errCli;

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allRows = [...allRows, ...data];
                if (data.length < 1000) {
                    hasMore = false;
                } else {
                    from += 1000;
                    to += 1000;
                }
            }
        }

        if (allRows.length === 0) {
            toast.error('No hay datos para exportar', { id: toastId });
            return;
        }

        // Generate Excel content
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(allRows.map(r => {
            const c = r.clientes || {};
            return {
                ID: r.cliente_id,
                "Nombre Local": c.nombre_local || "",
                "Dirección": c.direccion || "",
                "Nombre Contacto": c.nombre || "",
                "Teléfono": c.telefono || "",
                "Email": c.mail || "",
                "CUIT": c.cuit || "",
                "Lat": c.lat || "",
                "Lng": c.lng || "",
                "Estado": r.estado || "",
                "Situación": r.situacion || "",
                "Responsable": r.responsable || "",
                "Tipo Contacto": r.tipo_contacto || "",
                "Rubro": r.rubro || "",
                "Venta Digital": r.venta_digital ? "Si" : "No",
                "Notas": r.notes || r.notas || "",
                "Próximo Contacto": r.fecha_proximo_contacto || "",
                "Hora Próximo Contacto": r.hora_proximo_contacto || "",
                "Creado el": r.created_at ? new Date(r.created_at).toLocaleDateString() : ""
            };
        }));
        
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        
        const rawCompName = empresaActiva?.nombre || 'clientes';
        const safeCompName = rawCompName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `clientes_${safeCompName}_${timestamp}.xlsx`;
        
        link.href = url;
        link.setAttribute("download", fileName);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
        
        toast.success(`Exportados ${allRows.length} clientes a Excel`, { id: toastId });
    } catch (error) {
        console.error("Error en exportación Excel:", error);
        toast.error('Error al exportar Excel', { id: toastId });
    } finally {
        if (onFinally) onFinally();
    }
};

export const exportarClientesCSV = exportarClientesExcel;

export const exportarConsumidoresExcel = async (empresaActiva: any, filters: any = {}) => {
    const toastId = toast.loading('Generando Excel de consumidores...');
    try {
        let rows: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
            toast.loading(`Descargando registros ${rows.length}...`, { id: toastId });
            let query = supabase
                .from("consumidores")
                .select("*")
                .eq("empresa_id", empresaActiva?.id)
                .eq("activo", true)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (filters.estado && filters.estado !== 'Todos') query = query.eq('estado', filters.estado);
            if (filters.nombre) query = query.ilike('nombre', `%${filters.nombre}%`);
            if (filters.telefono) query = query.ilike('telefono', `%${filters.telefono}%`);
            if (filters.localidad) query = query.ilike('localidad', `%${filters.localidad}%`);
            if (filters.responsable) query = query.eq('responsable', filters.responsable);

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                rows = [...rows, ...data];
                if (data.length < 1000) {
                    hasMore = false;
                } else {
                    from += 1000;
                    to += 1000;
                }
            }
        }

        if (rows.length === 0) {
            toast.error('No hay datos para exportar', { id: toastId });
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
            ID: r.id,
            Nombre: r.nombre,
            Teléfono: r.telefono,
            Email: r.mail,
            Localidad: r.localidad,
            Barrio: r.barrio,
            Lat: r.lat,
            Lng: r.lng,
            Estado: r.estado,
            Responsable: r.responsable,
            Notas: r.notas,
            "Creado en": r.created_at ? new Date(r.created_at).toLocaleDateString() : ""
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Consumidores");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        link.href = url;
        link.download = `consumidores_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 1000);
        
        toast.success(`Exportados ${rows.length} consumidores`, { id: toastId });
    } catch (error) {
        console.error("Error exportando consumidores:", error);
        toast.error('Error al exportar', { id: toastId });
    }
};

export const exportarRepartidoresExcel = async (empresaActiva: any, filters: any = {}) => {
    const toastId = toast.loading('Generando Excel de repartidores...');
    try {
        let rows: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
            toast.loading(`Descargando registros ${rows.length}...`, { id: toastId });
            let query = supabase
                .from("repartidores")
                .select("*")
                .eq("empresa_id", empresaActiva?.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (filters.estado && filters.estado !== 'Todos') query = query.eq('estado', filters.estado);
            if (filters.responsable) query = query.eq('responsable', filters.responsable);
            if (filters.search) {
                const term = `%${filters.search}%`;
                query = query.or(`nombre.ilike.${term},telefono.ilike.${term},localidad.ilike.${term}`);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                rows = [...rows, ...data];
                if (data.length < 1000) {
                    hasMore = false;
                } else {
                    from += 1000;
                    to += 1000;
                }
            }
        }

        if (rows.length === 0) {
            toast.error('No hay datos para exportar', { id: toastId });
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
            ID: r.id,
            Nombre: r.nombre,
            Teléfono: r.telefono,
            Email: r.email || r.mail,
            Dirección: r.direccion,
            Localidad: r.localidad,
            Lat: r.lat,
            Lng: r.lng,
            Responsable: r.responsable,
            Estado: r.estado,
            Notas: r.notas,
            "Creado en": r.created_at ? new Date(r.created_at).toLocaleDateString() : ""
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Repartidores");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        link.href = url;
        link.download = `repartidores_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 1000);
        
        toast.success(`Exportados ${rows.length} repartidores`, { id: toastId });
    } catch (error) {
        console.error("Error exportando repartidores:", error);
        toast.error('Error al exportar', { id: toastId });
    }
};

export const importarConsumidoresExcel = async (file: File | null, empresaActiva: any, onSuccess?: () => void) => {
    if (!file) return;

    const toastId = toast.loading('Procesando archivo...');
    try {
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('El archivo está vacío', { id: toastId });
                    return;
                }

                let successCount = 0;
                let updateCount = 0;

                for (const row of data) {
                    try {
                        const nombre = row.nombre || row.Nombre || row.nombre_local || row.Nombre_Local || 'Nuevo Consumidor';
                        const telRaw = String(row.telefono || row.Telefono || row.Teléfono || row.tel || row.Tel || '').trim();
                        const email = row.mail || row.Mail || row.email || row.Email || '';
                        const localidad = row.localidad || row.Localidad || '';
                        const barrio = row.barrio || row.Barrio || row.direccion || row.Dirección || '';
                        const notas = row.notas || row.Notas || '';
                        const lat = row.lat || row.Lat || row.latitud || row.Latitud || null;
                        const lng = row.lng || row.Lng || row.longitud || row.Longitud || null;

                        if (!telRaw) continue; // Skip if no phone

                        // Look for existing consumer by phone
                        const { data: existing } = await supabase
                            .from('consumidores')
                            .select('id')
                            .eq('empresa_id', empresaActiva.id)
                            .eq('telefono', telRaw)
                            .maybeSingle();

                        const payload = {
                            nombre,
                            telefono: telRaw,
                            mail: email,
                            localidad: localidad || null,
                            barrio: barrio || null,
                            notas: notas || null,
                            lat: lat ? parseFloat(lat) : null,
                            lng: lng ? parseFloat(lng) : null,
                            empresa_id: empresaActiva.id
                        };

                        if (existing) {
                            // Update existing (don't touch created_at, don't overwrite with empty values)
                            const updatePayload: Record<string, any> = {};
                            for (const [key, value] of Object.entries(payload)) {
                                if (key === 'empresa_id') continue;
                                if (value !== null && value !== undefined && value !== '') {
                                    updatePayload[key] = value;
                                }
                            }
                            const { error } = await supabase.from('consumidores').update(updatePayload).eq('id', existing.id);
                            if (error) throw error;
                            updateCount++;
                        } else {
                            // Insert new
                            let rawFecha = row.fecha_creacion || row.Fecha_Creacion || row.created_at || row.Created_At || undefined;
                            let fechaNorm = rawFecha ? new Date(rawFecha).toISOString() : new Date().toISOString();
                            if (isNaN(new Date(fechaNorm).getTime())) fechaNorm = new Date().toISOString();

                            const { error } = await supabase.from('consumidores').insert([{
                                ...payload,
                                created_at: fechaNorm
                            } as any]);
                            if (error) throw error;
                            successCount++;
                        }
                    } catch (err) {
                        console.error('Error importando consumidor:', row, err);
                    }
                }

                toast.success(`Carga finalizada: ${successCount} nuevos y ${updateCount} actualizados`, { id: toastId });
                if (onSuccess) onSuccess();
            } catch (err) {
                console.error(err);
                toast.error('Error al procesar el Excel', { id: toastId });
            }
        };
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error(error);
        toast.error('Error al leer el archivo', { id: toastId });
    }
};

export const importarRepartidoresExcel = async (file: File | null, empresaActiva: any, onSuccess?: () => void) => {
    if (!file) return;

    const toastId = toast.loading('Procesando archivo...');
    try {
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('El archivo está vacío', { id: toastId });
                    return;
                }

                let successCount = 0;
                let updateCount = 0;

                for (const row of data) {
                    try {
                        const nombre = row.nombre || row.Nombre || 'Nuevo Repartidor';
                        const telRaw = String(row.telefono || row.Telefono || row.Teléfono || row.tel || row.Tel || '').trim();
                        const email = row.email || row.Email || row.mail || row.Mail || '';
                        const localidad = row.localidad || row.Localidad || '';
                        const direccion = row.direccion || row.Dirección || '';
                        const responsable = row.responsable || row.Responsable || '';
                        const notas = row.notas || row.Notas || '';
                        const estado = row.estado || row.Estado || 'Activo';
                        const lat = row.lat || row.Lat || row.latitud || row.Latitud || null;
                        const lng = row.lng || row.Lng || row.longitud || row.Longitud || null;

                        if (!telRaw) continue;

                        // Look for existing repartidor by phone
                        const { data: existing } = await supabase
                            .from('repartidores')
                            .select('id')
                            .eq('empresa_id', empresaActiva.id)
                            .eq('telefono', telRaw)
                            .maybeSingle();

                        const payload = {
                            nombre,
                            telefono: telRaw,
                            email,
                            localidad: localidad || null,
                            direccion: direccion || null,
                            responsable: responsable || null,
                            notas: notas || null,
                            estado,
                            lat: lat ? parseFloat(lat) : null,
                            lng: lng ? parseFloat(lng) : null,
                            empresa_id: empresaActiva.id
                        };

                        if (existing) {
                            // Update existing (don't touch created_at, don't overwrite with empty values)
                            const updatePayload: Record<string, any> = {};
                            for (const [key, value] of Object.entries(payload)) {
                                if (key === 'empresa_id') continue;
                                if (value !== null && value !== undefined && value !== '') {
                                    updatePayload[key] = value;
                                }
                            }
                            const { error } = await supabase.from('repartidores').update(updatePayload).eq('id', existing.id);
                            if (error) throw error;
                            updateCount++;
                        } else {
                            // Insert new
                            let rawFecha = row.fecha_creacion || row.Fecha_Creacion || row.created_at || row.Created_At || row.fecha || row.Fecha || undefined;
                            let fechaNorm = undefined;
                            
                            if (rawFecha) {
                                if (typeof rawFecha === 'string' && rawFecha.includes('/')) {
                                    const parts = rawFecha.split(' ')[0].split('/');
                                    if (parts.length === 3) {
                                        const day = parts[0].padStart(2, '0');
                                        const month = parts[1].padStart(2, '0');
                                        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                                        fechaNorm = `${year}-${month}-${day}T00:00:00Z`;
                                    }
                                } else {
                                    const d = new Date(rawFecha);
                                    if (!isNaN(d.getTime())) fechaNorm = d.toISOString();
                                }
                            }
                            
                            if (!fechaNorm) fechaNorm = new Date().toISOString();

                            const { error } = await supabase.from('repartidores').insert([{
                                ...payload,
                                created_at: fechaNorm
                            } as any]);
                            if (error) throw error;
                            successCount++;
                        }
                    } catch (err) {
                        console.error('Error importando repartidor:', row, err);
                    }
                }

                toast.success(`Carga finalizada: ${successCount} nuevos y ${updateCount} actualizados`, { id: toastId });
                if (onSuccess) onSuccess();
            } catch (err) {
                console.error(err);
                toast.error('Error al procesar el Excel', { id: toastId });
            }
        };
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error(error);
        toast.error('Error al leer el archivo', { id: toastId });
    }
};

// ── LLAMADAS EXCEL UTILS ───────────────────────────────────

export const descargarModeloLlamadas = () => {
    const toastId = toast.loading("Generando modelo de llamadas...");
    try {
        const wb = XLSX.utils.book_new();
        const headers = [
            "nombre", "apellido", "telefono", "mail",
            "direccion", "localidad", "provincia", "nombre_comercio", "rol_contacto", "instagram",
            "origen_contacto", "rubro", "nombre_operador", "respuesta_llamado", "tiempo_llamado",
            "envio_whatsapp", "siguio_redes", "completo_formulario", "envio_listo", "cantidad_llamadas"
        ];
        const sampleRow = [
            "Juan", "Pérez", "+54 11 2345-6789", "juan@ejemplo.com",
            "Av. Rivadavia 1234", "Morón", "Buenos Aires", "Kiosco Juan", "Dueño", "@kioscojuan",
            "Publicidad en instagram", "Kiosco / Almacén", "Operador 1", "Llamada Exitosa", "3 minutos",
            "Sí", "Instagram", "Sí", "Sí", 1
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
        XLSX.utils.book_append_sheet(wb, ws, "Modelo Llamadas");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_llamadas_crm.xlsx";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
        }, 1000);
        toast.success("Modelo descargado correctamente", { id: toastId });
    } catch (error: any) {
        console.error("Error al generar modelo llamadas:", error);
        toast.error(error.message || "Error al generar el archivo Excel", { id: toastId });
    }
};

export const exportarLlamadasExcel = async (empresaActiva: any, filters: any = {}, onFinally?: () => void, sortBy: string = 'created_desc') => {
    const toastId = toast.loading('Generando Excel de llamadas...');
    try {
        if (!empresaActiva?.id) throw new Error('No hay empresa activa');

        let allRows: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
            let query = (supabase as any)
                .from('llamadas')
                .select('*')
                .eq('empresa_id', empresaActiva.id);

            switch (sortBy) {
                case 'updated_desc':
                    query = query.order('updated_at', { ascending: false, nullsFirst: false });
                    break;
                case 'created_asc':
                    query = query.order('created_at', { ascending: true });
                    break;
                case 'nombre_asc':
                    query = query.order('nombre', { ascending: true, nullsFirst: false }).order('apellido', { ascending: true, nullsFirst: false });
                    break;
                case 'nombre_desc':
                    query = query.order('nombre', { ascending: false, nullsFirst: false }).order('apellido', { ascending: false, nullsFirst: false });
                    break;
                case 'comercio_asc':
                    query = query.order('nombre_comercio', { ascending: true, nullsFirst: false });
                    break;
                case 'comercio_desc':
                    query = query.order('nombre_comercio', { ascending: false, nullsFirst: false });
                    break;
                case 'operador_asc':
                    query = query.order('nombre_operador', { ascending: true, nullsFirst: false });
                    break;
                case 'created_desc':
                default:
                    query = query.order('created_at', { ascending: false });
                    break;
            }

            query = query.range(from, to);

            if (filters.busqueda && filters.busqueda.trim()) {
                const rawTerm = filters.busqueda.trim().replace(/"/g, '');
                const safeTerm = `"%${rawTerm}%"`;
                query = query.or(
                    `nombre.ilike.${safeTerm},apellido.ilike.${safeTerm},telefono.ilike.${safeTerm},nombre_comercio.ilike.${safeTerm},direccion.ilike.${safeTerm},localidad.ilike.${safeTerm},provincia.ilike.${safeTerm},mail.ilike.${safeTerm},nombre_operador.ilike.${safeTerm}`
                );
            }
            if (filters.operador) {
                query = query.ilike('nombre_operador', `%${filters.operador.trim()}%`);
            }
            if (filters.rubro) {
                query = query.eq('rubro', filters.rubro);
            }
            if (filters.respuesta) {
                query = query.eq('respuesta_llamado', filters.respuesta);
            }
            if (filters.etiqueta) {
                query = query.eq('etiqueta', filters.etiqueta);
            }
            if (filters.origen_contacto) {
                query = query.eq('origen_contacto', filters.origen_contacto);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allRows = [...allRows, ...data];
                if (data.length < 1000) {
                    hasMore = false;
                } else {
                    from += 1000;
                    to += 1000;
                }
            }
        }

        if (allRows.length === 0) {
            toast.error('No hay fichas de llamada para exportar', { id: toastId });
            if (onFinally) onFinally();
            return;
        }

        const formatted = allRows.map((l: any) => ({
            "Nombre": l.nombre || '',
            "Apellido": l.apellido || '',
            "Teléfono": l.telefono || '',
            "Mail": l.mail || '',
            "Dirección": l.direccion || '',
            "Localidad": l.localidad || '',
            "Provincia": l.provincia || '',
            "Nombre del Comercio": l.nombre_comercio || '',
            "Rol Contacto": l.rol_contacto || '',
            "Instagram": l.instagram || '',
            "Cómo llegaron a la BD": l.origen_contacto || '',
            "Rubro": l.rubro || '',
            "Operador": l.nombre_operador || '',
            "Respuesta del Llamado": l.respuesta_llamado || '',
            "Tiempo Llamado": l.tiempo_llamado || '',
            "Envío WhatsApp": l.envio_whatsapp ? 'Sí' : l.envio_whatsapp === false ? 'No' : '',
            "Siguió en Redes": l.siguio_redes || '',
            "Completó Formulario": l.completo_formulario ? 'Sí' : l.completo_formulario === false ? 'No' : '',
            "Envió Listo": l.envio_listo ? 'Sí' : l.envio_listo === false ? 'No' : '',
            "Cantidad de Llamadas": l.cantidad_llamadas || 1,
            "Etiqueta": l.etiqueta ? (l.etiqueta.toLowerCase() === 'cliente nuevo' ? 'Cliente Nuevo' : l.etiqueta.toLowerCase() === 'cliente actualizado' ? 'Cliente Actualizado' : l.etiqueta) : '',
            "Fecha Creación": l.created_at ? new Date(l.created_at).toLocaleString() : ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(formatted);
        XLSX.utils.book_append_sheet(wb, ws, "Llamadas");

        const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
        const link = document.createElement("a");
        link.href = url;
        link.download = `llamadas_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
        }, 1000);

        toast.success(`Exportadas ${allRows.length} llamadas a Excel`, { id: toastId });
    } catch (error: any) {
        console.error('Error al exportar llamadas:', error);
        toast.error(error.message || 'Error al exportar llamadas', { id: toastId });
    } finally {
        if (onFinally) onFinally();
    }
};

export const importarLlamadasExcel = async (
    file: File | null,
    empresaActiva: any,
    onSuccess?: () => void
) => {
    if (!file || !empresaActiva?.id) return;
    const toastId = toast.loading("Leyendo archivo Excel...");

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (!json || json.length === 0) {
                    toast.error("El archivo está vacío", { id: toastId });
                    return;
                }

                let insertCount = 0;
                let updateCount = 0;

                const getVal = (row: any, ...possibleKeys: string[]) => {
                    if (!row) return null;
                    const rowKeys = Object.keys(row);
                    for (const key of possibleKeys) {
                        if (row[key] !== undefined && row[key] !== null) return row[key];
                    }
                    const normPossible = possibleKeys.map(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
                    for (const rKey of rowKeys) {
                        const normRKey = rKey.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                        if (normPossible.includes(normRKey)) {
                            const val = row[rKey];
                            if (val !== undefined && val !== null) return val;
                        }
                    }
                    return null;
                };

                const parseBool = (v: any) => {
                    if (v === true || v === 'Sí' || v === 'si' || v === 'SI' || v === '1' || v === 1) return true;
                    if (v === false || v === 'No' || v === 'no' || v === 'NO' || v === '0' || v === 0) return false;
                    return null;
                };

                for (const row of json) {
                    const nombre = getVal(row, "nombre", "Nombre");
                    const apellido = getVal(row, "apellido", "Apellido");
                    const telefono = getVal(row, "telefono", "Teléfono", "TELÉFONO", "Telefono", "celular", "Phone", "Celular");
                    const mail = getVal(row, "mail", "Mail", "email", "Email");
                    const direccion = getVal(row, "direccion", "Dirección", "Direccion");
                    const localidad = getVal(row, "localidad", "Localidad");
                    const provincia = getVal(row, "provincia", "Provincia");
                    const nombre_comercio = getVal(row, "nombre_comercio", "Nombre del Comercio", "comercio", "Comercio");
                    const rol_contacto = getVal(row, "rol_contacto", "Rol Contacto", "Dueño/Empleado", "rol");
                    const instagram = getVal(row, "instagram", "Instagram", "IG");
                    const origen_contacto = getVal(row, "origen_contacto", "Cómo llegaron a la BD", "Como llegaron a la BD", "origen", "Origen", "como_llegaron", "Como llegaron", "como_nos_conocio", "Como nos conocio");
                    const rubro = getVal(row, "rubro", "Rubro");
                    const nombre_operador = getVal(row, "nombre_operador", "Operador", "Nombre del Operador");
                    const respuesta_llamado = getVal(row, "respuesta_llamado", "Respuesta del Llamado", "respuesta", "Respuesta");
                    const tiempo_llamado = getVal(row, "tiempo_llamado", "Tiempo Llamado", "tiempo", "Tiempo");
                    const envio_whatsapp = parseBool(getVal(row, "envio_whatsapp", "Envío WhatsApp", "Envio WhatsApp", "whatsapp"));
                    const siguio_redes = getVal(row, "siguio_redes", "Siguió en Redes", "Siguio en Redes", "redes");
                    const completo_formulario = parseBool(getVal(row, "completo_formulario", "Completó Formulario", "Completo Formulario", "formulario"));
                    const envio_listo = parseBool(getVal(row, "envio_listo", "Envió Listo", "Envio Listo", "listo"));
                    const rawLlamadas = getVal(row, "cantidad_llamadas", "Cantidad de Llamadas", "llamadas", "Llamadas", "intentos", "Intentos");

                    if (!telefono && !nombre && !nombre_comercio) continue;

                    const cleanPhone = telefono ? String(telefono).trim() : null;

                    const payload: Record<string, any> = {
                        empresa_id: empresaActiva.id,
                        nombre: nombre ? String(nombre).trim() : null,
                        apellido: apellido ? String(apellido).trim() : null,
                        telefono: cleanPhone,
                        mail: mail ? String(mail).trim() : null,
                        direccion: direccion ? String(direccion).trim() : null,
                        localidad: localidad ? String(localidad).trim() : null,
                        provincia: provincia ? String(provincia).trim() : null,
                        nombre_comercio: nombre_comercio ? String(nombre_comercio).trim() : null,
                        rol_contacto: rol_contacto ? String(rol_contacto).trim() : null,
                        instagram: instagram ? String(instagram).trim() : null,
                        origen_contacto: origen_contacto ? String(origen_contacto).trim() : null,
                        rubro: rubro ? String(rubro).trim() : null,
                        nombre_operador: nombre_operador ? String(nombre_operador).trim() : null,
                        respuesta_llamado: respuesta_llamado ? String(respuesta_llamado).trim() : null,
                        tiempo_llamado: tiempo_llamado ? String(tiempo_llamado).trim() : null,
                        envio_whatsapp,
                        siguio_redes: siguio_redes ? String(siguio_redes).trim() : null,
                        completo_formulario,
                        envio_listo,
                    };

                    let existingInLlamadas: any = null;
                    let existingInClientes: any = null;

                    if (cleanPhone) {
                        const digitsOnly = cleanPhone.replace(/\D/g, '');
                        
                        // 1. Buscar en llamadas
                        const { data: foundExact } = await (supabase as any)
                            .from('llamadas')
                            .select('id, cantidad_llamadas')
                            .eq('empresa_id', empresaActiva.id)
                            .eq('telefono', cleanPhone)
                            .maybeSingle();

                        if (foundExact) {
                            existingInLlamadas = foundExact;
                        } else if (digitsOnly && digitsOnly.length >= 6) {
                            const { data: foundDigits } = await (supabase as any)
                                .from('llamadas')
                                .select('id, cantidad_llamadas')
                                .eq('empresa_id', empresaActiva.id)
                                .ilike('telefono', `%${digitsOnly}%`)
                                .limit(1);

                            if (foundDigits && foundDigits.length > 0) {
                                existingInLlamadas = foundDigits[0];
                            }
                        }

                        // 2. Buscar en empresa_cliente / clientes si no está en llamadas
                        if (!existingInLlamadas) {
                            const { data: foundEC } = await (supabase as any)
                                .from('empresa_cliente')
                                .select('id, cliente_id, clientes(id, nombre, nombre_local, telefono, direccion, mail, rubro)')
                                .eq('empresa_id', empresaActiva.id)
                                .ilike('telefono', `%${digitsOnly || cleanPhone}%`)
                                .limit(1);

                            if (foundEC && foundEC.length > 0) {
                                existingInClientes = foundEC[0];
                            } else if (digitsOnly && digitsOnly.length >= 6) {
                                const { data: foundC } = await (supabase as any)
                                    .from('clientes')
                                    .select('id, nombre, nombre_local, telefono, direccion, mail, rubro')
                                    .ilike('telefono', `%${digitsOnly}%`)
                                    .limit(1);
                                if (foundC && foundC.length > 0) {
                                    existingInClientes = foundC[0];
                                }
                            }
                        }
                    }

                    const isExisting = !!(existingInLlamadas || existingInClientes);
                    const calculatedEtiqueta = isExisting ? 'cliente actualizado' : 'cliente nuevo';

                    if (existingInLlamadas) {
                        // Actualizar ficha existente e incrementar contador de llamadas
                        const currentCalls = Number(existingInLlamadas.cantidad_llamadas) || 1;
                        const parsedRaw = rawLlamadas ? parseInt(rawLlamadas) : null;
                        const newCalls = parsedRaw && !isNaN(parsedRaw) ? parsedRaw : currentCalls + 1;

                        const updatePayload: Record<string, any> = {
                            etiqueta: calculatedEtiqueta,
                            cantidad_llamadas: newCalls,
                            updated_at: new Date().toISOString()
                        };
                        for (const [key, value] of Object.entries(payload)) {
                            if (key === 'empresa_id') continue;
                            if (value !== null && value !== undefined && value !== '') {
                                updatePayload[key] = value;
                            }
                        }

                        let updateRes = await (supabase as any)
                            .from('llamadas')
                            .update(updatePayload)
                            .eq('id', existingInLlamadas.id);

                        if (updateRes.error && (updateRes.error.message?.includes('etiqueta') || updateRes.error.message?.includes('cantidad_llamadas') || updateRes.error.message?.includes('origen_contacto'))) {
                            // Fallback en caso de que alguna columna no esté presente en la BD
                            if (updateRes.error.message?.includes('etiqueta')) delete updatePayload.etiqueta;
                            if (updateRes.error.message?.includes('cantidad_llamadas')) delete updatePayload.cantidad_llamadas;
                            if (updateRes.error.message?.includes('origen_contacto')) delete updatePayload.origen_contacto;
                            updateRes = await (supabase as any)
                                .from('llamadas')
                                .update(updatePayload)
                                .eq('id', existingInLlamadas.id);
                        }

                        if (updateRes.error) {
                            console.error('Error al actualizar llamada:', updateRes.error);
                        } else {
                            updateCount++;
                        }
                    } else {
                        // Crear nueva ficha con su etiqueta y cantidad de llamadas inicial
                        const parsedRaw = rawLlamadas ? parseInt(rawLlamadas) : null;
                        const initialCalls = parsedRaw && !isNaN(parsedRaw) ? Math.max(1, parsedRaw) : 1;

                        const insertPayload: Record<string, any> = {
                            ...payload,
                            etiqueta: calculatedEtiqueta,
                            cantidad_llamadas: initialCalls,
                        };

                        let insertRes = await (supabase as any)
                            .from('llamadas')
                            .insert(insertPayload);

                        if (insertRes.error && (insertRes.error.message?.includes('etiqueta') || insertRes.error.message?.includes('cantidad_llamadas') || insertRes.error.message?.includes('origen_contacto'))) {
                            // Fallback en caso de que alguna columna no esté presente en la BD
                            if (insertRes.error.message?.includes('etiqueta')) delete insertPayload.etiqueta;
                            if (insertRes.error.message?.includes('cantidad_llamadas')) delete insertPayload.cantidad_llamadas;
                            if (insertRes.error.message?.includes('origen_contacto')) delete insertPayload.origen_contacto;
                            insertRes = await (supabase as any)
                                .from('llamadas')
                                .insert(insertPayload);
                        }

                        if (insertRes.error) {
                            console.error('Error al insertar llamada:', insertRes.error);
                        } else {
                            if (isExisting) {
                                updateCount++;
                            } else {
                                insertCount++;
                            }
                        }
                    }
                }

                if (insertCount === 0 && updateCount === 0) {
                    toast.error("No se procesaron registros válidos del Excel", { id: toastId });
                    return;
                }

                toast.success(`Importación finalizada: ${insertCount} nuevos y ${updateCount} actualizados`, { id: toastId });
                if (onSuccess) onSuccess();
            } catch (err: any) {
                console.error(err);
                toast.error(err.message || 'Error al procesar el Excel', { id: toastId });
            }
        };
        reader.readAsBinaryString(file);
    } catch (error: any) {
        console.error(error);
        toast.error('Error al leer el archivo', { id: toastId });
    }
};
