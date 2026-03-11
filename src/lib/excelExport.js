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

        const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([new Uint8Array(wbout)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "modelo_consumidores_crm.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

        const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([new Uint8Array(wbout)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "modelo_repartidores_crm.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

export const exportarClientesExcel = async (empresaActiva, onFinally) => {
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
        a.download = `crm_${empresaActiva?.nombre || 'export'}_clientes.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Excel descargado correctamente', { id: toastId });
    } catch (error) {
        console.error(error);
        toast.error('Error al exportar clientes', { id: toastId });
    } finally {
        if (onFinally) onFinally();
    }
};

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
