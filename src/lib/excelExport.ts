import { supabase } from './supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { applyClientFilters, ClientFilters } from '../utils/filterUtils';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { ImportProgressState, ImportRowResult } from '../types/excelImport';

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
    onSuccess?: () => void,
    onProgress?: (progress: Partial<ImportProgressState>) => void
) => {
    if (!file) return;

    if (onProgress) {
        onProgress({ status: 'reading', fileName: file.name, title: 'Importando Clientes desde Excel' });
    }

    try {
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    if (onProgress) {
                        onProgress({ status: 'error', errorMessage: 'El archivo está vacío' });
                    }
                    toast.error('El archivo está vacío');
                    return;
                }

                const totalRows = data.length;
                let processedRows = 0;
                let successCount = 0;
                let updatedCount = 0;
                let errorCount = 0;
                const items: ImportRowResult[] = [];

                if (onProgress) {
                    onProgress({
                        status: 'processing',
                        totalRows,
                        processedRows: 0,
                        remainingRows: totalRows,
                        successCount: 0,
                        updatedCount: 0,
                        errorCount: 0,
                        items: []
                    });
                }

                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    const rowIndex = i + 1;
                    const nombre = row.nombre || row.Nombre || row.nombre_local || row.Nombre_Local || 'Nuevo Cliente';
                    const rawPhone = row.telefono || row.Telefono || row.tel || row.Tel || row.celular || '';

                    // Validar formato de teléfono
                    const phoneVal = validatePhoneNumber(rawPhone, false);

                    if (!phoneVal.isValid) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(nombre),
                            phone: String(rawPhone),
                            status: 'error',
                            reason: phoneVal.reason
                        });
                        processedRows++;
                        if (onProgress) {
                            onProgress({
                                processedRows,
                                remainingRows: totalRows - processedRows,
                                errorCount,
                                currentRowName: String(nombre),
                                items: [...items]
                            });
                        }
                        await new Promise(r => setTimeout(r, 15));
                        continue;
                    }

                    try {
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

                        // 1. Crear cliente base
                        const { data: newC, error: cErr } = await supabase
                            .from('clientes')
                            .insert([{
                                nombre: String(nombre),
                                nombre_local: row.nombre_local || row.nombre || '',
                                direccion: row.direccion || '',
                                telefono: phoneVal.cleanPhone || '',
                                mail: row.mail || '',
                                cuit: String(row.cuit || ''),
                                created_at: fechaNorm || undefined
                            }])
                            .select('id')
                            .single();

                        if (cErr) throw cErr;

                        // 2. Asociar a empresa
                        const { error: ecErr } = await supabase
                            .from('empresa_cliente')
                            .insert([{
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
                            }]);

                        if (ecErr) throw ecErr;

                        successCount++;
                        items.push({
                            rowIndex,
                            name: String(nombre),
                            phone: phoneVal.cleanPhone || undefined,
                            status: 'success'
                        });
                    } catch (err: any) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(nombre),
                            phone: phoneVal.cleanPhone || undefined,
                            status: 'error',
                            reason: err.message || 'Error al guardar el registro en la base de datos'
                        });
                    }

                    processedRows++;
                    if (onProgress) {
                        onProgress({
                            processedRows,
                            remainingRows: totalRows - processedRows,
                            successCount,
                            errorCount,
                            currentRowName: String(nombre),
                            items: [...items]
                        });
                    }
                    await new Promise(r => setTimeout(r, 15));
                }

                if (onProgress) {
                    onProgress({
                        status: 'completed',
                        processedRows: totalRows,
                        remainingRows: 0,
                        successCount,
                        updatedCount,
                        errorCount,
                        items: [...items]
                    });
                }

                toast.success(`Importación finalizada: ${successCount} clientes cargados${errorCount > 0 ? `, ${errorCount} omitidos` : ''}`);
                if (onSuccess) onSuccess();
            } catch (err: any) {
                console.error(err);
                if (onProgress) {
                    onProgress({ status: 'error', errorMessage: err.message || 'Error al procesar el Excel' });
                }
                toast.error('Error al procesar el Excel');
            }
        };
        reader.readAsBinaryString(file);
    } catch (error: any) {
        console.error(error);
        if (onProgress) {
            onProgress({ status: 'error', errorMessage: error.message || 'Error al leer el archivo' });
        }
        toast.error('Error al leer el archivo');
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
            if (filters.search && filters.search.trim()) {
                const tokens = filters.search.trim().split(/\s+/).filter(Boolean);
                tokens.forEach((token: string) => {
                    const cleanToken = token.replace(/"/g, '');
                    if (cleanToken) {
                        const term = `"%${cleanToken}%"`;
                        query = query.or(`nombre.ilike.${term},telefono.ilike.${term},localidad.ilike.${term}`);
                    }
                });
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

export const importarConsumidoresExcel = async (
    file: File | null, 
    empresaActiva: any, 
    onSuccess?: () => void,
    onProgress?: (progress: Partial<ImportProgressState>) => void
) => {
    if (!file) return;

    if (onProgress) {
        onProgress({ status: 'reading', fileName: file.name, title: 'Importando Consumidores desde Excel' });
    }

    try {
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    if (onProgress) {
                        onProgress({ status: 'error', errorMessage: 'El archivo está vacío' });
                    }
                    toast.error('El archivo está vacío');
                    return;
                }

                const totalRows = data.length;
                let processedRows = 0;
                let successCount = 0;
                let updatedCount = 0;
                let errorCount = 0;
                const items: ImportRowResult[] = [];

                if (onProgress) {
                    onProgress({
                        status: 'processing',
                        totalRows,
                        processedRows: 0,
                        remainingRows: totalRows,
                        successCount: 0,
                        updatedCount: 0,
                        errorCount: 0,
                        items: []
                    });
                }

                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    const rowIndex = i + 1;
                    const nombre = row.nombre || row.Nombre || row.nombre_local || row.Nombre_Local || 'Nuevo Consumidor';
                    const telRaw = String(row.telefono || row.Telefono || row.Teléfono || row.tel || row.Tel || '').trim();
                    const email = row.mail || row.Mail || row.email || row.Email || '';
                    const localidad = row.localidad || row.Localidad || '';
                    const barrio = row.barrio || row.Barrio || row.direccion || row.Dirección || '';
                    const notas = row.notas || row.Notas || '';
                    const lat = row.lat || row.Lat || row.latitud || row.Latitud || null;
                    const lng = row.lng || row.Lng || row.longitud || row.Longitud || null;

                    // Phone validation
                    const phoneVal = validatePhoneNumber(telRaw, true);

                    if (!phoneVal.isValid) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(nombre),
                            phone: telRaw,
                            status: 'error',
                            reason: phoneVal.reason
                        });
                        processedRows++;
                        if (onProgress) {
                            onProgress({
                                processedRows,
                                remainingRows: totalRows - processedRows,
                                errorCount,
                                currentRowName: String(nombre),
                                items: [...items]
                            });
                        }
                        await new Promise(r => setTimeout(r, 15));
                        continue;
                    }

                    try {
                        const cleanTel = phoneVal.cleanPhone || telRaw;

                        // Look for existing consumer by phone
                        const { data: existing } = await supabase
                            .from('consumidores')
                            .select('id')
                            .eq('empresa_id', empresaActiva.id)
                            .eq('telefono', cleanTel)
                            .maybeSingle();

                        const payload = {
                            nombre: String(nombre),
                            telefono: cleanTel,
                            mail: email,
                            localidad: localidad || null,
                            barrio: barrio || null,
                            notas: notas || null,
                            lat: lat ? parseFloat(lat) : null,
                            lng: lng ? parseFloat(lng) : null,
                            empresa_id: empresaActiva.id
                        };

                        if (existing) {
                            const updatePayload: Record<string, any> = {};
                            for (const [key, value] of Object.entries(payload)) {
                                if (key === 'empresa_id') continue;
                                if (value !== null && value !== undefined && value !== '') {
                                    updatePayload[key] = value;
                                }
                            }
                            const { error } = await supabase.from('consumidores').update(updatePayload).eq('id', existing.id);
                            if (error) throw error;
                            updatedCount++;
                            items.push({
                                rowIndex,
                                name: String(nombre),
                                phone: cleanTel,
                                status: 'updated'
                            });
                        } else {
                            let rawFecha = row.fecha_creacion || row.Fecha_Creacion || row.created_at || row.Created_At || undefined;
                            let fechaNorm = rawFecha ? new Date(rawFecha).toISOString() : new Date().toISOString();
                            if (isNaN(new Date(fechaNorm).getTime())) fechaNorm = new Date().toISOString();

                            const { error } = await supabase.from('consumidores').insert([{
                                ...payload,
                                created_at: fechaNorm
                            } as any]);
                            if (error) throw error;
                            successCount++;
                            items.push({
                                rowIndex,
                                name: String(nombre),
                                phone: cleanTel,
                                status: 'success'
                            });
                        }
                    } catch (err: any) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(nombre),
                            phone: phoneVal.cleanPhone || telRaw,
                            status: 'error',
                            reason: err.message || 'Error al guardar en base de datos'
                        });
                    }

                    processedRows++;
                    if (onProgress) {
                        onProgress({
                            processedRows,
                            remainingRows: totalRows - processedRows,
                            successCount,
                            updatedCount,
                            errorCount,
                            currentRowName: String(nombre),
                            items: [...items]
                        });
                    }
                    await new Promise(r => setTimeout(r, 15));
                }

                if (onProgress) {
                    onProgress({
                        status: 'completed',
                        processedRows: totalRows,
                        remainingRows: 0,
                        successCount,
                        updatedCount,
                        errorCount,
                        items: [...items]
                    });
                }

                toast.success(`Carga finalizada: ${successCount} nuevos y ${updatedCount} actualizados${errorCount > 0 ? `, ${errorCount} omitidos` : ''}`);
                if (onSuccess) onSuccess();
            } catch (err: any) {
                console.error(err);
                if (onProgress) {
                    onProgress({ status: 'error', errorMessage: err.message || 'Error al procesar el Excel' });
                }
                toast.error('Error al procesar el Excel');
            }
        };
        reader.readAsBinaryString(file);
    } catch (error: any) {
        console.error(error);
        if (onProgress) {
            onProgress({ status: 'error', errorMessage: error.message || 'Error al leer el archivo' });
        }
        toast.error('Error al leer el archivo');
    }
};

export const importarRepartidoresExcel = async (
    file: File | null, 
    empresaActiva: any, 
    onSuccess?: () => void,
    onProgress?: (progress: Partial<ImportProgressState>) => void
) => {
    if (!file) return;

    if (onProgress) {
        onProgress({ status: 'reading', fileName: file.name, title: 'Importando Repartidores desde Excel' });
    }

    try {
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    if (onProgress) {
                        onProgress({ status: 'error', errorMessage: 'El archivo está vacío' });
                    }
                    toast.error('El archivo está vacío');
                    return;
                }

                const totalRows = data.length;
                let processedRows = 0;
                let successCount = 0;
                let updatedCount = 0;
                let errorCount = 0;
                const items: ImportRowResult[] = [];

                if (onProgress) {
                    onProgress({
                        status: 'processing',
                        totalRows,
                        processedRows: 0,
                        remainingRows: totalRows,
                        successCount: 0,
                        updatedCount: 0,
                        errorCount: 0,
                        items: []
                    });
                }

                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    const rowIndex = i + 1;
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

                    // Phone validation
                    const phoneVal = validatePhoneNumber(telRaw, true);

                    if (!phoneVal.isValid) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(nombre),
                            phone: telRaw,
                            status: 'error',
                            reason: phoneVal.reason
                        });
                        processedRows++;
                        if (onProgress) {
                            onProgress({
                                processedRows,
                                remainingRows: totalRows - processedRows,
                                errorCount,
                                currentRowName: String(nombre),
                                items: [...items]
                            });
                        }
                        await new Promise(r => setTimeout(r, 15));
                        continue;
                    }

                    try {
                        const cleanTel = phoneVal.cleanPhone || telRaw;

                        // Look for existing repartidor by phone
                        const { data: existing } = await supabase
                            .from('repartidores')
                            .select('id')
                            .eq('empresa_id', empresaActiva.id)
                            .eq('telefono', cleanTel)
                            .maybeSingle();

                        const payload = {
                            nombre: String(nombre),
                            telefono: cleanTel,
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
                            const updatePayload: Record<string, any> = {};
                            for (const [key, value] of Object.entries(payload)) {
                                if (key === 'empresa_id') continue;
                                if (value !== null && value !== undefined && value !== '') {
                                    updatePayload[key] = value;
                                }
                            }
                            const { error } = await supabase.from('repartidores').update(updatePayload).eq('id', existing.id);
                            if (error) throw error;
                            updatedCount++;
                            items.push({
                                rowIndex,
                                name: String(nombre),
                                phone: cleanTel,
                                status: 'updated'
                            });
                        } else {
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
                            items.push({
                                rowIndex,
                                name: String(nombre),
                                phone: cleanTel,
                                status: 'success'
                            });
                        }
                    } catch (err: any) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(nombre),
                            phone: phoneVal.cleanPhone || telRaw,
                            status: 'error',
                            reason: err.message || 'Error al guardar en base de datos'
                        });
                    }

                    processedRows++;
                    if (onProgress) {
                        onProgress({
                            processedRows,
                            remainingRows: totalRows - processedRows,
                            successCount,
                            updatedCount,
                            errorCount,
                            currentRowName: String(nombre),
                            items: [...items]
                        });
                    }
                    await new Promise(r => setTimeout(r, 15));
                }

                if (onProgress) {
                    onProgress({
                        status: 'completed',
                        processedRows: totalRows,
                        remainingRows: 0,
                        successCount,
                        updatedCount,
                        errorCount,
                        items: [...items]
                    });
                }

                toast.success(`Carga finalizada: ${successCount} nuevos y ${updatedCount} actualizados${errorCount > 0 ? `, ${errorCount} omitidos` : ''}`);
                if (onSuccess) onSuccess();
            } catch (err: any) {
                console.error(err);
                if (onProgress) {
                    onProgress({ status: 'error', errorMessage: err.message || 'Error al procesar el Excel' });
                }
                toast.error('Error al procesar el Excel');
            }
        };
        reader.readAsBinaryString(file);
    } catch (error: any) {
        console.error(error);
        if (onProgress) {
            onProgress({ status: 'error', errorMessage: error.message || 'Error al leer el archivo' });
        }
        toast.error('Error al leer el archivo');
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
            "envio_whatsapp", "siguio_redes", "completo_formulario", "envio_listo", "cantidad_llamadas", "fecha_ultima_llamada"
        ];
        const sampleRow = [
            "Juan", "Pérez", "+54 11 2345-6789", "juan@ejemplo.com",
            "Av. Rivadavia 1234", "Morón", "Buenos Aires", "Kiosco Juan", "Dueño", "@kioscojuan",
            "Publicidad en instagram", "Kiosco / Almacén", "Operador 1", "Llamada Exitosa", "3 minutos",
            "Sí", "Instagram", "Sí", "Sí", 0, "2026-08-18 15:30"
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
                const tokens = filters.busqueda.trim().split(/\s+/).filter(Boolean);
                tokens.forEach((token: string) => {
                    const cleanToken = token.replace(/"/g, '');
                    if (cleanToken) {
                        const safeTerm = `"%${cleanToken}%"`;
                        query = query.or(
                            `nombre.ilike.${safeTerm},apellido.ilike.${safeTerm},telefono.ilike.${safeTerm},nombre_comercio.ilike.${safeTerm},direccion.ilike.${safeTerm},localidad.ilike.${safeTerm},provincia.ilike.${safeTerm},mail.ilike.${safeTerm},nombre_operador.ilike.${safeTerm}`
                        );
                    }
                });
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
                query = query.ilike('origen_contacto', `%${filters.origen_contacto.trim()}%`);
            }
            if (filters.localidad && filters.localidad.trim()) {
                query = query.ilike('localidad', `%${filters.localidad.trim()}%`);
            }
            if (filters.provincia && filters.provincia.trim()) {
                query = query.ilike('provincia', `%${filters.provincia.trim()}%`);
            }
            if (filters.cantidad_llamadas) {
                switch (filters.cantidad_llamadas) {
                    case '0':
                        query = query.or('cantidad_llamadas.is.null,cantidad_llamadas.eq.0');
                        break;
                    case '1':
                        query = query.eq('cantidad_llamadas', 1);
                        break;
                    case '1+':
                        query = query.gte('cantidad_llamadas', 1);
                        break;
                    case '2+':
                        query = query.gte('cantidad_llamadas', 2);
                        break;
                    case '3+':
                        query = query.gte('cantidad_llamadas', 3);
                        break;
                    case '5+':
                        query = query.gte('cantidad_llamadas', 5);
                        break;
                }
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
            "Cantidad de Llamadas": l.cantidad_llamadas ?? 0,
            "Fecha Última Llamada": l.fecha_ultima_llamada ? new Date(l.fecha_ultima_llamada).toLocaleString() : '',
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
    onSuccess?: () => void,
    onProgress?: (progress: Partial<ImportProgressState>) => void,
    options?: { sinEtiqueta?: boolean }
) => {
    if (!file) return;

    if (onProgress) {
        onProgress({ status: 'reading', fileName: file.name, title: options?.sinEtiqueta ? 'Importando Clientes Sin Etiqueta desde Excel' : 'Importando Llamadas desde Excel' });
    }

    if (!empresaActiva?.id) {
        if (onProgress) {
            onProgress({ status: 'error', errorMessage: 'Debe seleccionar una empresa activa para importar' });
        }
        toast.error('Debe seleccionar una empresa activa para importar');
        return;
    }

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
                    if (onProgress) {
                        onProgress({ status: 'error', errorMessage: 'El archivo está vacío' });
                    }
                    toast.error("El archivo está vacío");
                    return;
                }

                const totalRows = json.length;
                let processedRows = 0;
                let insertCount = 0;
                let updateCount = 0;
                let errorCount = 0;
                const items: ImportRowResult[] = [];

                if (onProgress) {
                    onProgress({
                        status: 'processing',
                        totalRows,
                        processedRows: 0,
                        remainingRows: totalRows,
                        successCount: 0,
                        updatedCount: 0,
                        errorCount: 0,
                        items: []
                    });
                }

                const normalizeKey = (str: string): string => {
                    if (!str) return '';
                    return String(str)
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "") // remove accents
                        .replace(/[^a-z0-9]/g, "");     // remove all spaces, symbols, punctuation, quotes, question marks, slashes, newlines
                };

                const getVal = (row: any, ...possibleKeys: string[]) => {
                    if (!row || typeof row !== 'object') return null;
                    const rowKeys = Object.keys(row);
                    
                    // 1. Direct match (exact key name)
                    for (const key of possibleKeys) {
                        if (row[key] !== undefined && row[key] !== null) {
                            const strVal = String(row[key]).trim();
                            if (strVal !== '') return row[key];
                        }
                    }
                    
                    // 2. Normalized match (accents, spaces, punctuation removed)
                    const normPossible = possibleKeys.map(k => normalizeKey(k)).filter(Boolean);
                    for (const rKey of rowKeys) {
                        const normRKey = normalizeKey(rKey);
                        if (!normRKey) continue;
                        if (normPossible.includes(normRKey)) {
                            const val = row[rKey];
                            if (val !== undefined && val !== null) {
                                const strVal = String(val).trim();
                                if (strVal !== '') return val;
                            }
                        }
                    }

                    // 3. Substring / contains match for compound headers
                    for (const rKey of rowKeys) {
                        const normRKey = normalizeKey(rKey);
                        if (!normRKey) continue;
                        for (const pKey of normPossible) {
                            if (pKey.length >= 4 && (normRKey.includes(pKey) || (normPossible.length <= 3 && pKey.includes(normRKey)))) {
                                const val = row[rKey];
                                if (val !== undefined && val !== null) {
                                    const strVal = String(val).trim();
                                    if (strVal !== '') return val;
                                }
                            }
                        }
                    }
                    return null;
                };

                const parseBool = (v: any): boolean | null => {
                    if (v === true) return true;
                    if (v === false) return false;
                    if (v === null || v === undefined) return null;
                    const str = String(v).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (['si', 's', 'true', '1', 'x', 'ok', 'yes', 'y'].includes(str)) return true;
                    if (['no', 'n', 'false', '0'].includes(str)) return false;
                    return null;
                };

                const normalizeRolValue = (v: any): string | null => {
                    if (!v) return null;
                    const str = String(v).trim();
                    const lower = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (lower.includes('duen') || lower.includes('propietari') || lower.includes('titular') || lower.includes('socio')) {
                        return 'dueño';
                    }
                    if (lower.includes('emplead') || lower.includes('encargad') || lower.includes('gerente') || lower.includes('cajer') || lower.includes('vendedor') || lower.includes('administrador')) {
                        return 'empleado';
                    }
                    if (lower.includes('otro')) {
                        return 'otro';
                    }
                    return str;
                };

                const normalizeOrigenValue = (v: any): string | null => {
                    if (!v) return null;
                    const str = String(v).trim();
                    const lower = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (lower.includes('llamada') || lower.includes('contactaron por llamada') || lower.includes('telefono') || lower.includes('telefonico')) {
                        return 'Me contactaron por llamada';
                    }
                    if (lower.includes('instagram') || lower.includes('ig') || lower.includes('publicidad en instagram') || lower.includes('redes')) {
                        return 'Publicidad en instagram';
                    }
                    if (lower.includes('instalshop') || lower.includes('ya conocia') || lower.includes('ya conocia instalshop') || lower.includes('conocido')) {
                        return 'Ya conocia Instalshop';
                    }
                    return str;
                };

                const normalizeRubroValue = (v: any): string | null => {
                    if (!v) return null;
                    const str = String(v).trim();
                    const lower = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (lower.includes('kiosco') || lower.includes('almacen')) return 'kiosco';
                    if (lower.includes('autoservicio') || lower.includes('supermercado') || lower.includes('mercado')) return 'autoservicio';
                    if (lower.includes('sin comercio') || lower.includes('sin_comercio') || lower.includes('sin negocio')) return 'sin_comercio';
                    if (lower.includes('otro')) return 'otro';
                    return str;
                };

                const normalizeRespuestaValue = (v: any): string | null => {
                    if (!v) return null;
                    const str = String(v).trim();
                    const lower = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (lower.includes('exitosa') || lower.includes('exitoso') || lower.includes('concretada') || lower.includes('positiva')) return 'exitosa';
                    if (lower.includes('sin respuesta') || lower.includes('no contesta') || lower.includes('no responde') || lower.includes('ocupado') || lower.includes('buzon')) return 'sin_respuesta';
                    if (lower.includes('incorrecto') || lower.includes('inexistente') || lower.includes('equivocado') || lower.includes('invalido')) return 'numero_incorrecto';
                    if (lower.includes('otro momento') || lower.includes('llamar despues') || lower.includes('reagendar') || lower.includes('despues')) return 'otro_momento';
                    if (lower.includes('sin interes') || lower.includes('no interesado') || lower.includes('rechazado') || lower.includes('no le interesa')) return 'sin_interes';
                    if (lower.includes('catalogo') || lower.includes('video') || lower.includes('material')) return 'catalogo_video_enviado';
                    if (lower.includes('sin comercio') || lower.includes('sin negocio')) return 'sin_comercio';
                    return str;
                };

                const normalizeTiempoValue = (v: any): string | null => {
                    if (!v) return null;
                    const str = String(v).trim();
                    const lower = str.toLowerCase();
                    if (lower === '1' || lower.startsWith('1 min') || lower.startsWith('1min') || lower === '1 minuto') return '1';
                    if (lower === '2' || lower.startsWith('2 min') || lower.startsWith('2min') || lower === '2 minutos') return '2';
                    if (lower === '3' || lower.startsWith('3 min') || lower.startsWith('3min') || lower === '3 minutos') return '3';
                    if (lower === '4' || lower.startsWith('4 min') || lower.startsWith('4min') || lower === '4 minutos') return '4';
                    if (lower === '5' || lower.startsWith('5 min') || lower.startsWith('5min') || lower === '5 minutos') return '5';
                    if (lower.includes('mayor') || lower.includes('>') || lower.includes('mas de 5') || lower.includes('más de 5') || lower.includes('+5')) return 'mayor_5';
                    const num = parseInt(str);
                    if (!isNaN(num)) {
                        if (num >= 1 && num <= 5) return String(num);
                        if (num > 5) return 'mayor_5';
                    }
                    return str;
                };

                const normalizeRedesValue = (v: any): string | null => {
                    if (!v) return null;
                    const str = String(v).trim();
                    const lower = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (lower.includes('ambas') || lower.includes('ambos') || (lower.includes('instagram') && lower.includes('facebook'))) return 'ambas';
                    if (lower.includes('instagram') || lower.includes('ig')) return 'instagram';
                    if (lower.includes('facebook') || lower.includes('fb')) return 'facebook';
                    if (lower === 'no' || lower.includes('no')) return 'no';
                    return str;
                };

                for (let i = 0; i < json.length; i++) {
                    const row = json[i];
                    const rowIndex = i + 1;

                    const nombre = getVal(
                        row, 
                        "nombre", "Nombre", "nombre_contacto", "Nombre Contacto", "first_name", "First Name",
                        "contacto", "Contacto", "cliente", "Cliente", "Nombre Cliente", "Nombre del Cliente",
                        "Nombre y Apellido", "Nombre Completo"
                    );
                    const apellido = getVal(
                        row, 
                        "apellido", "Apellido", "last_name", "Last Name", "apellidos", "Apellidos"
                    );
                    const rawTelefono = getVal(
                        row, 
                        "telefono", "Teléfono", "TELÉFONO", "Telefono", "celular", "Celular", "phone", "Phone",
                        "mobile", "Mobile", "tel", "Tel", "whatsapp", "WhatsApp", "Teléfono Móvil", "Telefono Movil",
                        "Teléfono Contacto", "Telefono Contacto", "numero", "Numero", "Número"
                    );
                    const mail = getVal(
                        row, 
                        "mail", "Mail", "email", "Email", "correo", "Correo", "Correo Electrónico",
                        "Correo Electronico", "E-mail", "e-mail"
                    );
                    const direccion = getVal(
                        row, 
                        "direccion", "Dirección", "Direccion", "Calle", "calle", "Domicilio", "domicilio",
                        "Address", "address", "Direccion del Local", "Dirección del Local"
                    );
                    const localidad = getVal(
                        row, 
                        "localidad", "Localidad", "Ciudad", "ciudad", "Municipio", "municipio",
                        "City", "city", "Zona", "zona", "Barrio", "barrio"
                    );
                    const provincia = getVal(
                        row, 
                        "provincia", "Provincia", "State", "state", "Region", "region",
                        "Departamento", "departamento"
                    );
                    const nombre_comercio_raw = getVal(
                        row, 
                        "nombre_comercio", "Nombre del Comercio", "Nombre de Comercio", "Nombre Comercio",
                        "comercio", "Comercio",
                        "nombre_local", "Nombre Local", "Nombre del Local", "Nombre de Local",
                        "local", "Local",
                        "nombre_negocio", "Nombre Negocio", "Nombre del Negocio", "Nombre de Negocio",
                        "negocio", "Negocio",
                        "nombre_empresa", "Nombre Empresa", "Nombre de la Empresa",
                        "empresa", "Empresa",
                        "razon_social", "Razon Social", "Razón Social",
                        "nombre_fantasia", "Nombre Fantasia", "Nombre de Fantasía", "Fantasia", "Fantasía",
                        "store", "Store", "shop", "Shop", "business", "Business", "business_name"
                    );
                    const rol_contacto_raw = getVal(
                        row, 
                        "rol_contacto", "Rol Contacto", "Rol del Contacto", "Rol de Contacto", "Rol en el negocio", "Rol en la empresa",
                        "rol", "Rol",
                        "Dueño/Empleado", "Dueño / Empleado", "Dueño o Empleado", "Dueno/Empleado", "Dueno o Empleado", "dueño/empleado", "dueno/empleado",
                        "¿Sos dueño o empleado?", "Sos dueño o empleado?", "Sos dueño o empleado", "Sos dueno o empleado?", "Sos dueno o empleado",
                        "Sos dueño/empleado", "Sos dueno/empleado", "Sos el dueño o empleado", "¿Sos el dueño o empleado?",
                        "cargo", "Cargo", "puesto", "Puesto", "posicion", "Posición", "Posicion",
                        "¿Cuál es tu rol?", "Cual es tu rol?", "Cual es tu rol",
                        "tipo_contacto", "Tipo de contacto", "relacion_con_el_comercio", "Relación con el comercio", "dueño", "dueno", "empleado"
                    );
                    const instagram = getVal(
                        row, 
                        "instagram", "Instagram", "IG", "ig", "Instagram (Negocio o Personal)", "Instagram Negocio",
                        "Instagram Personal", "Cuenta de Instagram", "Redes Sociales", "Usuario IG", "Usuario Instagram"
                    );
                    const origen_contacto_raw = getVal(
                        row, 
                        "origen_contacto", "Cómo llegaron a la BD", "Como llegaron a la BD", "¿Cómo llegaron a la BD?", "Como llegaron a la BD?",
                        "¿Cómo llegaron a la base de datos?", "Como llegaron a la base de datos?", "Como llegaron a la base de datos", "Cómo llegaron a la base de datos",
                        "¿Cómo nos conociste?", "Como nos conociste?", "Cómo nos conociste?", "Como nos conociste", "Cómo nos conociste",
                        "¿Cómo nos conoció?", "Como nos conoció?", "Como nos conocio?", "Como nos conocio", "Cómo nos conoció",
                        "¿Cómo nos conocieron?", "Como nos conocieron?", "Como nos conocieron",
                        "¿Cómo te enteraste de nosotros?", "Como te enteraste de nosotros?", "Como te enteraste de nosotros",
                        "¿Cómo llegaste a nosotros?", "Como llegaste a nosotros?", "Como llegaste a nosotros",
                        "¿Cómo llegaron a nosotros?", "Como llegaron a nosotros",
                        "origen", "Origen", "Origen Contacto", "Origen de Contacto", "Origen del Contacto",
                        "como_llegaron", "Como llegaron", "como_nos_conocio", "Como nos conocio",
                        "canal", "Canal", "Canal de ingreso", "Canal de contacto",
                        "medio", "Medio", "procedencia", "Procedencia",
                        "fuente", "Fuente", "Fuente de contacto", "Fuente del contacto",
                        "campaña", "Campana", "publicidad", "Publicidad"
                    );
                    const rubro_raw = getVal(
                        row, 
                        "rubro", "Rubro", "Actividad", "actividad", "Giro", "giro", "Sector", "sector",
                        "Categoria", "Categoría", "Tipo de Negocio", "Tipo de Comercio"
                    );
                    const nombre_operador = getVal(
                        row, 
                        "nombre_operador", "Operador", "operador", "Nombre del Operador", "Nombre Operador",
                        "Responsable", "responsable", "Agente", "agente", "Vendedor", "vendedor", "Asesor", "asesor"
                    );
                    const respuesta_llamado_raw = getVal(
                        row, 
                        "respuesta_llamado", "Respuesta del Llamado", "Respuesta de Llamado", "Respuesta Llamado",
                        "respuesta", "Respuesta", "Resultado", "resultado", "Estado de la llamada", "Estado llamada"
                    );
                    const tiempo_llamado_raw = getVal(
                        row, 
                        "tiempo_llamado", "Tiempo Llamado", "Tiempo del Llamado", "tiempo", "Tiempo",
                        "Duración", "Duracion", "duracion"
                    );
                    const envio_whatsapp = parseBool(getVal(row, "envio_whatsapp", "Envío WhatsApp", "Envio WhatsApp", "whatsapp", "WhatsApp"));
                    const siguio_redes_raw = getVal(row, "siguio_redes", "Siguió en Redes", "Siguio en Redes", "Nos siguió en redes", "redes", "Redes");
                    const completo_formulario = parseBool(getVal(row, "completo_formulario", "Completó Formulario", "Completo Formulario", "formulario", "Formulario"));
                    const envio_listo = parseBool(getVal(row, "envio_listo", "Envió Listo", "Envio Listo", "listo", "Listo"));
                    const envio_catalogo_video = parseBool(getVal(row, "envio_catalogo_video", "Envío de Catálogo Video", "Envio Catalogo Video", "Catálogo Video", "video_enviado"));
                    const solicito_video = parseBool(getVal(row, "solicito_video", "Solicitó Video", "Solicito Video", "solicito_video"));
                    const video_url = getVal(row, "video_url", "URL del Video", "Video URL", "Enlace Video", "Link Video", "video", "Video");
                    const rawLlamadas = getVal(row, "cantidad_llamadas", "Cantidad de Llamadas", "Cantidad de llamadas", "llamadas", "Llamadas", "intentos", "Intentos");
                    const rawFechaLlamada = getVal(row, "fecha_ultima_llamada", "Fecha de Llamada", "Fecha Llamada", "Fecha de llamada", "Fecha Llamado", "fecha_llamada", "Fecha y hora de la llamada", "fecha", "Fecha");

                    const nombre_comercio = nombre_comercio_raw ? String(nombre_comercio_raw).trim() : null;
                    const rol_contacto = normalizeRolValue(rol_contacto_raw);
                    const origen_contacto = normalizeOrigenValue(origen_contacto_raw);
                    const rubro = normalizeRubroValue(rubro_raw);
                    const respuesta_llamado = normalizeRespuestaValue(respuesta_llamado_raw);
                    const tiempo_llamado = normalizeTiempoValue(tiempo_llamado_raw);
                    const siguio_redes = normalizeRedesValue(siguio_redes_raw);

                    const rowName = [nombre, apellido].filter(Boolean).join(' ') || nombre_comercio || 'Registro sin Nombre';

                    // 1. Phone validation
                    const phoneVal = validatePhoneNumber(rawTelefono, false);

                    if (!phoneVal.isValid) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(rowName),
                            phone: rawTelefono ? String(rawTelefono) : undefined,
                            status: 'error',
                            reason: phoneVal.reason
                        });
                        processedRows++;
                        if (onProgress) {
                            onProgress({
                                processedRows,
                                remainingRows: totalRows - processedRows,
                                errorCount,
                                currentRowName: String(rowName),
                                items: [...items]
                            });
                        }
                        await new Promise(r => setTimeout(r, 15));
                        continue;
                    }

                    if (!phoneVal.cleanPhone && !nombre && !nombre_comercio) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: 'Sin datos',
                            status: 'skipped',
                            reason: 'La fila no contiene ni teléfono, ni nombre, ni nombre de comercio.'
                        });
                        processedRows++;
                        if (onProgress) {
                            onProgress({
                                processedRows,
                                remainingRows: totalRows - processedRows,
                                errorCount,
                                currentRowName: 'Fila sin datos',
                                items: [...items]
                            });
                        }
                        await new Promise(r => setTimeout(r, 15));
                        continue;
                    }

                    let fechaLlamadaIso: string | null = null;
                    if (rawFechaLlamada) {
                        if (typeof rawFechaLlamada === 'string') {
                            const d = new Date(rawFechaLlamada);
                            if (!isNaN(d.getTime())) fechaLlamadaIso = d.toISOString();
                        } else if (typeof rawFechaLlamada === 'number') {
                            const d = new Date((rawFechaLlamada - 25569) * 86400 * 1000);
                            if (!isNaN(d.getTime())) fechaLlamadaIso = d.toISOString();
                        }
                    }

                    const cleanPhone = phoneVal.cleanPhone;

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
                        envio_catalogo_video,
                        solicito_video,
                        video_url: video_url ? String(video_url).trim() : null,
                    };

                    let existingInLlamadas: any = null;
                    let existingInClientes: any = null;

                    if (cleanPhone) {
                        const digitsOnly = cleanPhone.replace(/\D/g, '');
                        
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
                    const calculatedEtiqueta = options?.sinEtiqueta ? null : (isExisting ? 'cliente actualizado' : 'cliente nuevo');

                    try {
                        if (existingInLlamadas) {
                            const currentCalls = Number(existingInLlamadas.cantidad_llamadas ?? 0);
                            const parsedRaw = rawLlamadas !== null && rawLlamadas !== undefined && String(rawLlamadas).trim() !== '' ? parseInt(String(rawLlamadas)) : null;
                            const newCalls = parsedRaw !== null && !isNaN(parsedRaw) ? Math.max(0, parsedRaw) : currentCalls;

                            const updatePayload: Record<string, any> = {
                                etiqueta: calculatedEtiqueta,
                                cantidad_llamadas: newCalls,
                                updated_at: new Date().toISOString()
                            };
                            if (fechaLlamadaIso) {
                                updatePayload.fecha_ultima_llamada = fechaLlamadaIso;
                            }

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

                            if (updateRes.error) {
                                const optionalCols = ['etiqueta', 'cantidad_llamadas', 'origen_contacto', 'fecha_ultima_llamada', 'video_url', 'envio_catalogo_video', 'solicito_video', 'rol_contacto', 'provincia', 'instagram', 'nombre_comercio'];
                                let hasRemoved = false;
                                for (const col of optionalCols) {
                                    if (updateRes.error.message?.includes(col)) {
                                        delete updatePayload[col];
                                        hasRemoved = true;
                                    }
                                }
                                if (hasRemoved) {
                                    updateRes = await (supabase as any)
                                        .from('llamadas')
                                        .update(updatePayload)
                                        .eq('id', existingInLlamadas.id);
                                }
                            }

                            if (updateRes.error) throw updateRes.error;
                            updateCount++;
                            items.push({
                                rowIndex,
                                name: String(rowName),
                                phone: cleanPhone || undefined,
                                status: 'updated'
                            });
                        } else {
                            const parsedRaw = rawLlamadas ? parseInt(rawLlamadas) : null;
                            const initialCalls = parsedRaw !== null && !isNaN(parsedRaw) ? Math.max(0, parsedRaw) : 0;

                            const insertPayload: Record<string, any> = {
                                ...payload,
                                etiqueta: calculatedEtiqueta,
                                cantidad_llamadas: initialCalls,
                            };
                            if (fechaLlamadaIso) {
                                insertPayload.fecha_ultima_llamada = fechaLlamadaIso;
                            }

                            let insertRes = await (supabase as any)
                                .from('llamadas')
                                .insert(insertPayload);

                            if (insertRes.error) {
                                const optionalCols = ['etiqueta', 'cantidad_llamadas', 'origen_contacto', 'fecha_ultima_llamada', 'video_url', 'envio_catalogo_video', 'solicito_video', 'rol_contacto', 'provincia', 'instagram', 'nombre_comercio'];
                                let hasRemoved = false;
                                for (const col of optionalCols) {
                                    if (insertRes.error.message?.includes(col)) {
                                        delete insertPayload[col];
                                        hasRemoved = true;
                                    }
                                }
                                if (hasRemoved) {
                                    insertRes = await (supabase as any)
                                        .from('llamadas')
                                        .insert(insertPayload);
                                }
                            }

                            if (insertRes.error) throw insertRes.error;

                            if (isExisting) {
                                updateCount++;
                                items.push({
                                    rowIndex,
                                    name: String(rowName),
                                    phone: cleanPhone || undefined,
                                    status: 'updated'
                                });
                            } else {
                                insertCount++;
                                items.push({
                                    rowIndex,
                                    name: String(rowName),
                                    phone: cleanPhone || undefined,
                                    status: 'success'
                                });
                            }
                        }
                    } catch (err: any) {
                        errorCount++;
                        items.push({
                            rowIndex,
                            name: String(rowName),
                            phone: cleanPhone || undefined,
                            status: 'error',
                            reason: err.message || 'Error guardando en base de datos'
                        });
                    }

                    processedRows++;
                    if (onProgress) {
                        onProgress({
                            processedRows,
                            remainingRows: totalRows - processedRows,
                            successCount: insertCount,
                            updatedCount: updateCount,
                            errorCount,
                            currentRowName: String(rowName),
                            items: [...items]
                        });
                    }
                    await new Promise(r => setTimeout(r, 15));
                }

                if (onProgress) {
                    onProgress({
                        status: 'completed',
                        processedRows: totalRows,
                        remainingRows: 0,
                        successCount: insertCount,
                        updatedCount: updateCount,
                        errorCount,
                        items: [...items]
                    });
                }

                toast.success(`Importación finalizada: ${insertCount} nuevos y ${updateCount} actualizados${errorCount > 0 ? `, ${errorCount} omitidos` : ''}`);
                if (onSuccess) onSuccess();
            } catch (err: any) {
                console.error(err);
                if (onProgress) {
                    onProgress({ status: 'error', errorMessage: err.message || 'Error al procesar el Excel' });
                }
                toast.error(err.message || 'Error al procesar el Excel');
            }
        };
        reader.readAsBinaryString(file);
    } catch (error: any) {
        console.error(error);
        if (onProgress) {
            onProgress({ status: 'error', errorMessage: error.message || 'Error al leer el archivo' });
        }
        toast.error('Error al leer el archivo');
    }
};
