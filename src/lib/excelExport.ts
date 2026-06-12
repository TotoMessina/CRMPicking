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
                            // Update existing (don't touch created_at)
                            const { error } = await supabase.from('consumidores').update(payload).eq('id', existing.id);
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
                            // Update existing (don't touch created_at)
                            const { error } = await supabase.from('repartidores').update(payload).eq('id', existing.id);
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
