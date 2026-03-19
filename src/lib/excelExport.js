import { supabase } from './supabase';
import toast from 'react-hot-toast';

export const descargarModeloClientes = () => {
    const toastId = toast.loading("Generando modelo...");
    try {
        if (!window.XLSX) {
            throw new Error("La librería de Excel no ha cargado aún. Por favor, refrescá la página.");
        }
        const wb = window.XLSX.utils.book_new();
        const headers = ["nombre", "telefono", "direccion", "rubro", "estado", "responsable", "tipo_contacto", "fecha_proximo_contacto", "hora_proximo_contacto", "notas", "fecha_creacion"];
        const data = [
            headers,
            ["Ejemplo SRL", "11-2345-6789", "Av. Rivadavia 1234", "Almacén", "1 - Cliente relevado", "Toto", "Visita Presencial", "2025-01-15", "09:00", "Ejemplo de nota", "2024-12-01"]
        ];
        const ws = window.XLSX.utils.aoa_to_sheet(data);
        window.XLSX.utils.book_append_sheet(wb, ws, "Modelo");

        const b64 = window.XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
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
    } catch (error) {
        console.error("Error al generar modelo:", error);
        toast.error(error.message || "Error al generar el archivo Excel", { id: toastId });
    }
};

export const descargarModeloConsumidores = () => {
    const toastId = toast.loading("Generando modelo...");
    try {
        if (!window.XLSX) {
            throw new Error("La librería de Excel no ha cargado aún. Por favor, refrescá la página.");
        }
        const wb = window.XLSX.utils.book_new();
        const headers = ["nombre", "telefono", "direccion", "localidad", "notas", "fecha_creacion"];
        const data = [
            headers,
            ["Juan Pérez", "11-2345-6789", "Calle Falsa 123", "Moreno", "Ejemplo de nota", "2024-11-20"]
        ];
        const ws = window.XLSX.utils.aoa_to_sheet(data);
        window.XLSX.utils.book_append_sheet(wb, ws, "Modelo Consumidores");

        const b64 = window.XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
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
    } catch (error) {
        console.error("Error al generar modelo consumidores:", error);
        toast.error(error.message || "Error al generar el archivo Excel", { id: toastId });
    }
};

export const descargarModeloRepartidores = () => {
    const toastId = toast.loading("Generando modelo...");
    try {
        if (!window.XLSX) {
            throw new Error("La librería de Excel no ha cargado aún. Por favor, refrescá la página.");
        }
        const wb = window.XLSX.utils.book_new();
        const headers = ["nombre", "telefono", "email", "direccion", "localidad", "responsable", "notas", "estado", "fecha_creacion"];
        const data = [
            headers,
            ["Carlos Delivery", "11-9876-5432", "carlos@reparto.com", "Av. Principal 100", "Morón", "Toto", "Tiene moto propia", "Activo", "2025-01-10"]
        ];
        const ws = window.XLSX.utils.aoa_to_sheet(data);
        window.XLSX.utils.book_append_sheet(wb, ws, "Modelo Repartidores");

        const b64 = window.XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
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
    } catch (error) {
        console.error("Error al generar modelo repartidores:", error);
        toast.error(error.message || "Error al generar el archivo Excel", { id: toastId });
    }
};

export const importarClientesExcel = async (file, empresaActiva, userName, userEmail, onSuccess) => {
    if (!file) return;

    const toastId = toast.loading('Procesando archivo...');
    try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = window.XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = window.XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('El archivo está vacío', { id: toastId });
                    return;
                }

                let successCount = 0;
                for (const row of data) {
                    try {
                        // 1. Create universal client
                        const { data: newC, error: cErr } = await supabase.from('clientes').insert([{
                            nombre: row.nombre || row.nombre_local || 'Nuevo Cliente',
                            nombre_local: row.nombre_local || row.nombre || '',
                            direccion: row.direccion || '',
                            telefono: String(row.telefono || ''),
                            mail: row.mail || '',
                            cuit: String(row.cuit || ''),
                            created_at: row.fecha_creacion || undefined
                        }]).select('id').single();

                        if (cErr) throw cErr;

                        // 2. Link to company
                        const { error: ecErr } = await supabase.from('empresa_cliente').insert([{
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
                            created_at: row.fecha_creacion || undefined
                        }]);

                        if (ecErr) throw ecErr;
                        successCount++;
                    } catch (err) {
                        console.error('Error importando fila:', row, err);
                    }
                }

                toast.success(`Importación finalizada: ${successCount} clientes cargados`, { id: toastId });
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

export const exportarClientesCSV = async (empresaActiva, filters = {}, onFinally) => {
    const toastId = toast.loading('Generando CSV conforme a los filtros...');
    try {
        let query = supabase
            .from("empresa_cliente")
            .select("*, clientes!inner(*)")
            .eq("empresa_id", empresaActiva?.id)
            .eq("activo", true);

        // Apply filters (same logic as before)
        if (filters.estado && filters.estado !== 'Todos') query = query.eq('estado', filters.estado);
        if (filters.situacion && filters.situacion !== 'Todos') query = query.eq('situacion', filters.situacion);
        if (filters.tipoContacto && filters.tipoContacto !== 'Todos') query = query.eq('tipo_contacto', filters.tipoContacto);
        if (filters.responsable && filters.responsable.length > 0) query = query.in('responsable', filters.responsable);
        if (filters.rubro) query = query.eq('rubro', filters.rubro);
        if (filters.interes) query = query.eq('interes', filters.interes);
        if (filters.estilo) query = query.eq('estilo_contacto', filters.estilo);
        
        if (filters.creadoDesde) query = query.gte('created_at', `${filters.creadoDesde}T00:00:00.000Z`);
        if (filters.creadoHasta) query = query.lte('created_at', `${filters.creadoHasta}T23:59:59.999Z`);

        if (filters.nombre) query = query.ilike('clientes.nombre_local', `%${filters.nombre}%`);
        if (filters.telefono) query = query.ilike('clientes.telefono', `%${filters.telefono}%`);
        if (filters.direccion) query = query.ilike('clientes.direccion', `%${filters.direccion}%`);

        const { data: allRows, error: errCli } = await query;
        if (errCli) throw errCli;

        if (!allRows || allRows.length === 0) {
            toast.error('No hay datos para exportar', { id: toastId });
            return;
        }

        // Generate CSV content
        const firstRow = allRows[0];
        const ecKeys = Object.keys(firstRow).filter(k => k !== 'clientes');
        const cKeys = Object.keys(firstRow.clientes || {});
        
        const headers = [...cKeys.map(k => `c_${k}`), ...ecKeys];
        
        let csvContent = headers.join(";") + "\n"; // Using semicolon for Spanish Excel compatibility

        allRows.forEach(r => {
            const c = r.clientes || {};
            const values = [];
            
            cKeys.forEach(k => values.push(`"${String(c[k] || "").replace(/"/g, '""')}"`));
            ecKeys.forEach(k => values.push(`"${String(r[k] || "").replace(/"/g, '""')}"`));
            
            csvContent += values.join(";") + "\n";
        });

        // Create Data URI instead of Blob for better filename persistence
        // Note: Incorporating BOM inside encodeURIComponent for better reliability
        const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent("\ufeff" + csvContent);
        const link = document.createElement("a");
        
        const rawCompName = empresaActiva?.nombre || 'clientes';
        const safeCompName = rawCompName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `crm_export_${safeCompName}_${timestamp}.csv`;
        
        link.href = encodedUri;
        link.setAttribute("download", fileName);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // Slightly longer timeout and don't revoke anything (it's a data URI)
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
        
        toast.success(`Exportados ${allRows.length} registros en CSV`, { id: toastId });
    } catch (error) {
        console.error("Error en exportación CSV:", error);
        toast.error('Error al exportar CSV', { id: toastId });
    } finally {
        if (onFinally) onFinally();
    }
};

export const exportarClientesExcel = exportarClientesCSV; 

export const importarConsumidoresExcel = async (file, empresaActiva, onSuccess) => {
    if (!file) return;

    const toastId = toast.loading('Procesando archivo...');
    try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = window.XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = window.XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('El archivo está vacío', { id: toastId });
                    return;
                }

                let successCount = 0;
                for (const row of data) {
                    try {
                        const { error } = await supabase.from('consumidores').insert([{
                            nombre: row.nombre || 'Nuevo Consumidor',
                            telefono: String(row.telefono || ''),
                            direccion: row.direccion || '',
                            localidad: row.localidad || '',
                            notas: row.notas || '',
                            empresa_id: empresaActiva.id,
                            created_at: row.fecha_creacion || undefined
                        }]);

                        if (error) throw error;
                        successCount++;
                    } catch (err) {
                        console.error('Error importando consumidor:', row, err);
                    }
                }

                toast.success(`Importación finalizada: ${successCount} consumidores cargados`, { id: toastId });
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

export const importarRepartidoresExcel = async (file, empresaActiva, onSuccess) => {
    if (!file) return;

    const toastId = toast.loading('Procesando archivo...');
    try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = window.XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = window.XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('El archivo está vacío', { id: toastId });
                    return;
                }

                let successCount = 0;
                for (const row of data) {
                    try {
                        const { error } = await supabase.from('repartidores').insert([{
                            nombre: row.nombre || 'Nuevo Repartidor',
                            telefono: String(row.telefono || ''),
                            email: row.email || '',
                            direccion: row.direccion || '',
                            localidad: row.localidad || '',
                            responsable: row.responsable || '',
                            notas: row.notas || '',
                            estado: row.estado || 'Activo',
                            empresa_id: empresaActiva.id,
                            created_at: row.fecha_creacion || undefined
                        }]);

                        if (error) throw error;
                        successCount++;
                    } catch (err) {
                        console.error('Error importando repartidor:', row, err);
                    }
                }

                toast.success(`Importación finalizada: ${successCount} repartidores cargados`, { id: toastId });
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
