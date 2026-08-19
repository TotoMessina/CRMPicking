import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Llamada } from './useLlamadas';

export interface OperadorStat {
    nombre: string;
    totalFichas: number;
    totalLlamadas: number;
    contactosLlamados: number;
    exitosas: number;
    tasaExito: number;
}

export interface LlamadasPorDiaData {
    labels: string[];
    fullDates: string[];
    totalLlamadas: number[];
    contactosAtendidos: number[];
    llamadasExitosas: number[];
    promedioDiario: number;
    diaPico: { fecha: string; total: number };
    totalDiasActivos: number;
}

export interface LlamadasStatsData {
    totalFichas: number;
    totalHistorico: number;
    totalIntentos: number;
    contactosLlamados: number;
    contactosSinLlamar: number;
    clientesNuevos: number;
    clientesActualizados: number;
    totalModificados: number;
    tasaExito: number;
    respuestas: { label: string; count: number; color: string }[];
    origenes: { label: string; count: number }[];
    rubros: { label: string; count: number }[];
    operadores: OperadorStat[];
    conversiones: {
        whatsappCount: number;
        whatsappPct: number;
        formularioCount: number;
        formularioPct: number;
        listoCount: number;
        listoPct: number;
        redesCount: number;
        redesPct: number;
    };
    evolucionDiaria: {
        labels: string[];
        creados: number[];
        modificados: number[];
    };
    llamadasPorDia: LlamadasPorDiaData;
    ultimasModificaciones: Llamada[];
    isFilteredByDate: boolean;
}

const RESPUESTA_LABELS: Record<string, { label: string; color: string }> = {
    exitosa: { label: 'Llamada Exitosa', color: '#10b981' },
    sin_respuesta: { label: 'Sin Respuesta', color: '#64748b' },
    numero_incorrecto: { label: 'Número Incorrecto', color: '#ef4444' },
    otro_momento: { label: 'Llamar en otro momento', color: '#f59e0b' },
    sin_interes: { label: 'Sin Interés', color: '#8b5cf6' },
    sin_comercio: { label: 'Sin Comercio', color: '#ec4899' },
};

const RUBRO_LABELS: Record<string, string> = {
    kiosco: 'Kiosco / Almacén',
    almacen: 'Almacén',
    autoservicio: 'Autoservicio',
    otro: 'Otro',
    sin_comercio: 'Sin Comercio',
};

export function useLlamadasStats({ dateFrom, dateTo, useDateFilter = false }: { dateFrom?: string; dateTo?: string; useDateFilter?: boolean }) {
    const { empresaActiva } = useAuth();

    return useQuery({
        queryKey: ['llamadas-stats', empresaActiva?.id, dateFrom, dateTo, useDateFilter],
        queryFn: async (): Promise<LlamadasStatsData> => {
            const emptyResult: LlamadasStatsData = {
                totalFichas: 0,
                totalHistorico: 0,
                totalIntentos: 0,
                contactosLlamados: 0,
                contactosSinLlamar: 0,
                clientesNuevos: 0,
                clientesActualizados: 0,
                totalModificados: 0,
                tasaExito: 0,
                respuestas: [],
                origenes: [],
                rubros: [],
                operadores: [],
                conversiones: {
                    whatsappCount: 0, whatsappPct: 0,
                    formularioCount: 0, formularioPct: 0,
                    listoCount: 0, listoPct: 0,
                    redesCount: 0, redesPct: 0
                },
                evolucionDiaria: { labels: [], creados: [], modificados: [] },
                llamadasPorDia: {
                    labels: [],
                    fullDates: [],
                    totalLlamadas: [],
                    contactosAtendidos: [],
                    llamadasExitosas: [],
                    promedioDiario: 0,
                    diaPico: { fecha: '—', total: 0 },
                    totalDiasActivos: 0
                },
                ultimasModificaciones: [],
                isFilteredByDate: false
            };

            if (!empresaActiva?.id) return emptyResult;

            // Consultar todos los registros de la empresa
            const { data, error } = await (supabase as any)
                .from('llamadas')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error al obtener llamadas para estadísticas:', error);
                throw error;
            }

            const allRows: Llamada[] = data || [];
            const totalHistorico = allRows.length;

            let rows = allRows;
            let isFiltered = false;

            if (useDateFilter && dateFrom && dateTo && totalHistorico > 0) {
                const fromTime = new Date(dateFrom + 'T00:00:00').getTime();
                const toDate = new Date(dateTo + 'T23:59:59.999');
                const toTime = toDate.getTime();

                const filtered = allRows.filter(r => {
                    const dStr = r.updated_at || r.created_at;
                    if (!dStr) return true;
                    const t = new Date(dStr).getTime();
                    return t >= fromTime && t <= toTime;
                });

                if (filtered.length > 0) {
                    rows = filtered;
                    isFiltered = true;
                }
            }

            const totalFichas = rows.length;

            let totalIntentos = 0;
            let contactosLlamados = 0;
            let contactosSinLlamar = 0;
            let clientesNuevos = 0;
            let clientesActualizados = 0;
            let totalModificados = 0;
            let exitosasCount = 0;

            const respuestasMap: Record<string, number> = {};
            const origenesMap: Record<string, number> = {};
            const rubrosMap: Record<string, number> = {};
            const operadoresMap: Record<string, { totalFichas: number; totalLlamadas: number; contactosLlamados: number; exitosas: number }> = {};
            const diasMap: Record<string, { creados: number; modificados: number; totalLlamadas: number; contactosAtendidos: number; exitosas: number }> = {};

            let whatsappCount = 0;
            let formularioCount = 0;
            let listoCount = 0;
            let redesCount = 0;

            for (const r of rows) {
                const calls = Number(r.cantidad_llamadas ?? 0);
                totalIntentos += calls;

                const hasBeenCalled = calls > 0 || (!!r.respuesta_llamado && r.respuesta_llamado.trim() !== '');
                if (hasBeenCalled) {
                    contactosLlamados++;
                } else {
                    contactosSinLlamar++;
                }

                const etiq = (r.etiqueta || '').toLowerCase().trim();
                if (etiq.includes('nuevo')) clientesNuevos++;
                else if (etiq.includes('actualiz')) clientesActualizados++;
                else clientesNuevos++;

                // Detectar si fue modificado con posterioridad a la creación
                const hasTimeDiff = r.updated_at && r.created_at && (Math.abs(new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) > 5000);
                if (hasTimeDiff || calls > 0 || etiq.includes('actualiz')) {
                    totalModificados++;
                }

                // Respuestas
                const respKey = r.respuesta_llamado || 'sin_respuesta';
                respuestasMap[respKey] = (respuestasMap[respKey] || 0) + 1;
                if (respKey === 'exitosa') exitosasCount++;

                // Orígenes
                const origKey = r.origen_contacto || 'Sin especificar';
                origenesMap[origKey] = (origenesMap[origKey] || 0) + 1;

                // Rubros
                if (r.rubro) {
                    const rubroName = RUBRO_LABELS[r.rubro] || r.rubro;
                    rubrosMap[rubroName] = (rubrosMap[rubroName] || 0) + 1;
                }

                // Operadores
                const opName = r.nombre_operador?.trim() || 'Sin asignar';
                if (!operadoresMap[opName]) {
                    operadoresMap[opName] = { totalFichas: 0, totalLlamadas: 0, contactosLlamados: 0, exitosas: 0 };
                }
                operadoresMap[opName].totalFichas += 1;
                operadoresMap[opName].totalLlamadas += calls;
                if (hasBeenCalled) {
                    operadoresMap[opName].contactosLlamados += 1;
                }
                if (respKey === 'exitosa') {
                    operadoresMap[opName].exitosas += 1;
                }

                // Conversiones booleanas
                if (r.envio_whatsapp) whatsappCount++;
                if (r.completo_formulario) formularioCount++;
                if (r.envio_listo) listoCount++;
                if (r.siguio_redes && r.siguio_redes !== 'no') redesCount++;

                // Agrupación de actividad de llamadas usando fecha_ultima_llamada real
                const callDateStr = r.fecha_ultima_llamada || (hasBeenCalled ? (r.updated_at || r.created_at) : null);
                if (callDateStr && hasBeenCalled) {
                    const callDateKey = callDateStr.substring(0, 10);
                    if (!diasMap[callDateKey]) {
                        diasMap[callDateKey] = { creados: 0, modificados: 0, totalLlamadas: 0, contactosAtendidos: 0, exitosas: 0 };
                    }
                    diasMap[callDateKey].totalLlamadas += calls;
                    diasMap[callDateKey].contactosAtendidos += 1;
                    if (respKey === 'exitosa') {
                        diasMap[callDateKey].exitosas += 1;
                    }
                }

                // Agrupación de altas y modificaciones en base de datos
                const modDateStr = r.updated_at || r.created_at;
                if (modDateStr) {
                    const modDateKey = modDateStr.substring(0, 10);
                    if (!diasMap[modDateKey]) {
                        diasMap[modDateKey] = { creados: 0, modificados: 0, totalLlamadas: 0, contactosAtendidos: 0, exitosas: 0 };
                    }
                    if (hasTimeDiff || calls > 0) diasMap[modDateKey].modificados += 1;
                    else diasMap[modDateKey].creados += 1;
                }
            }

            // Tasa de éxito calculada sobre contactos que realmente fueron llamados (o total si no hay llamadas)
            const denominator = contactosLlamados > 0 ? contactosLlamados : totalFichas;
            const tasaExito = denominator > 0 ? Math.round((exitosasCount / denominator) * 100) : 0;

            // Formatear respuestas
            const respuestas = Object.entries(respuestasMap).map(([key, count]) => ({
                label: RESPUESTA_LABELS[key]?.label || key,
                count,
                color: RESPUESTA_LABELS[key]?.color || '#94a3b8'
            })).sort((a, b) => b.count - a.count);

            // Formatear orígenes
            const origenes = Object.entries(origenesMap).map(([label, count]) => ({
                label,
                count
            })).sort((a, b) => b.count - a.count);

            // Formatear rubros
            const rubros = Object.entries(rubrosMap).map(([label, count]) => ({
                label,
                count
            })).sort((a, b) => b.count - a.count);

            // Formatear operadores
            const operadores: OperadorStat[] = Object.entries(operadoresMap).map(([nombre, stat]) => ({
                nombre,
                totalFichas: stat.totalFichas,
                totalLlamadas: stat.totalLlamadas,
                contactosLlamados: stat.contactosLlamados,
                exitosas: stat.exitosas,
                tasaExito: (stat.contactosLlamados > 0 ? Math.round((stat.exitosas / stat.contactosLlamados) * 100) : (stat.totalFichas > 0 ? Math.round((stat.exitosas / stat.totalFichas) * 100) : 0))
            })).sort((a, b) => b.totalLlamadas - a.totalLlamadas);

            // Evolución y Llamadas diarias ordenadas
            const sortedDates = Object.keys(diasMap).sort();
            const dailyLabels = sortedDates.map(d => {
                const [, m, day] = d.split('-');
                return `${day}/${m}`;
            });

            const dailyLlamadas = sortedDates.map(d => diasMap[d].totalLlamadas);
            const dailyContactos = sortedDates.map(d => diasMap[d].contactosAtendidos);
            const dailyExitosas = sortedDates.map(d => diasMap[d].exitosas);

            let maxCalls = 0;
            let peakDate = '—';
            sortedDates.forEach((d, idx) => {
                if (dailyLlamadas[idx] > maxCalls) {
                    maxCalls = dailyLlamadas[idx];
                    const [, m, day] = d.split('-');
                    peakDate = `${day}/${m}`;
                }
            });

            // Días con llamadas efectivas realizadas
            const diasConLlamadas = sortedDates.filter(d => diasMap[d].totalLlamadas > 0);
            const totalDiasActivos = diasConLlamadas.length > 0 ? diasConLlamadas.length : sortedDates.length;
            const sumLlamadas = dailyLlamadas.reduce((a, b) => a + b, 0);
            const promedioDiario = totalDiasActivos > 0 ? parseFloat((sumLlamadas / totalDiasActivos).toFixed(1)) : 0;

            const llamadasPorDia: LlamadasPorDiaData = {
                labels: dailyLabels,
                fullDates: sortedDates,
                totalLlamadas: dailyLlamadas,
                contactosAtendidos: dailyContactos,
                llamadasExitosas: dailyExitosas,
                promedioDiario,
                diaPico: { fecha: peakDate, total: maxCalls },
                totalDiasActivos
            };

            const evolucionDiaria = {
                labels: dailyLabels,
                creados: sortedDates.map(d => diasMap[d].creados),
                modificados: sortedDates.map(d => diasMap[d].modificados)
            };

            // Últimas 30 modificaciones
            const ultimasModificaciones = [...allRows]
                .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
                .slice(0, 30);

            return {
                totalFichas,
                totalHistorico,
                totalIntentos,
                contactosLlamados,
                contactosSinLlamar,
                clientesNuevos,
                clientesActualizados,
                totalModificados,
                tasaExito,
                respuestas,
                origenes,
                rubros,
                operadores,
                conversiones: {
                    whatsappCount,
                    whatsappPct: totalFichas > 0 ? Math.round((whatsappCount / totalFichas) * 100) : 0,
                    formularioCount,
                    formularioPct: totalFichas > 0 ? Math.round((formularioCount / totalFichas) * 100) : 0,
                    listoCount,
                    listoPct: totalFichas > 0 ? Math.round((listoCount / totalFichas) * 100) : 0,
                    redesCount,
                    redesPct: totalFichas > 0 ? Math.round((redesCount / totalFichas) * 100) : 0,
                },
                evolucionDiaria,
                llamadasPorDia,
                ultimasModificaciones,
                isFilteredByDate: isFiltered
            };
        },
        enabled: !!empresaActiva?.id,
    });
}
