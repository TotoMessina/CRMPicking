import { supabase } from './supabase';
import { findBestCoqueResponse } from './coqueKnowledge';

/**
 * AI Provider Service v17 (CoqueBot Infinite Knowledge Edition)
 * Master engine with external knowledge base, DB lookup and learning mechanism.
 */

export interface AISuggestion {
    rubro?: string;
    interes?: string;
    notas?: string;
    estado?: string;
}

export interface ActivityRecord {
    fecha: string;
    descripcion: string;
    notas?: string;
}

export interface ClientContext {
    estado?: string;
    situacion?: string;
    interes?: string;
    diasSinContacto: number;
    rubro?: string;
}

export interface AISummaryResult {
    estadoDigital: {
        label: string;
        color: string;
        icon: string;
        desc: string;
    };
    alertas: string[];
    patrones: string[];
    planAccion: string[];
    resumenEjecutivo: string;
}

export interface BulkRiskResult {
    probability: number;
    sentiment: 'POSITIVO' | 'NEGATIVO' | 'NEUTRAL';
}

const SEMANTIC_DICO = {
    ADOPCION: {
        hitos: ['descargo', 'instalo', 'tiene la app', 'usuario activo', 'tienda rosa'],
        progreso: ['video 1', 'video 2', 'folleto', 'flyer', 'tutorial'],
        operacion: ['cargo catalogo', 'ajusto precios', 'subio fotos', 'tienda armada'],
        resistencia: ['no sabe usar', 'señor grande', 'celular viejo', 'no tiene espacio', 'prefieren whatsapp', 'mucha tecnologia']
    },
    PRODUCTO: {
        bugs: ['error', 'falla', 'bug', 'no anda', 'se tilda', 'lento', 'no veo productos'],
        feedback_pos: ['le gusto', 'comoda', 'agil', 'buen precio', 'facil'],
        competencia: ['pedidos ya', 'rappi', 'comision', 'peya']
    },
    COMERCIAL: {
        interes_alto: ['muy interesado', 'quiere activar', 'cuando pasan', 'pedi folleto'],
        logistica: ['local cerrado', 'estaba cerrao', 'pasar mañana', 'no se encontraba'],
        churn: ['no responde', 'sin tiempo', 'esta a full', 'despues', 'cuenta suspendida']
    }
};

export const aiProvider = {
    /**
     * CoqueBot: Master Conversational Engine
     */
    async ask(message: string): Promise<string> {
        const msg = message.toLowerCase();
        await new Promise(resolve => setTimeout(resolve, 800));

        // 1. DATA LOOKUP (Base de datos en tiempo real)
        const lookupTriggers = ['quien es', 'como esta', 'info de', 'buscar', 'decime de', 'datos de', 'que onda con', 'sabes algo de', 'conoces a', 'que es'];
        const isLookup = lookupTriggers.some(t => msg.includes(t));

        if (isLookup) {
            let potentialName = message.toLowerCase();
            lookupTriggers.forEach(t => potentialName = potentialName.replace(t, ''));
            potentialName = potentialName.replace(/[?¿!¡]/g, '').trim();
            
            if (potentialName && potentialName.length > 1) {
                try {
                    const { data: clients } = await supabase
                        .from('clientes')
                        .select('id, nombre, nombre_local')
                        .or(`nombre.ilike.%${potentialName}%,nombre_local.ilike.%${potentialName}%`)
                        .limit(1);

                    if (clients && clients.length > 0) {
                        const client = clients[0];
                        const { data: bizData } = await supabase
                            .from('empresa_cliente')
                            .select('estado, situacion, ultima_actividad, visitas')
                            .eq('cliente_id', client.id)
                            .limit(1);

                        const nombre = client.nombre_local || client.nombre;
                        if (bizData && bizData.length > 0) {
                            const b = bizData[0];
                            const estado = b.estado || 'Sin estado';
                            const situacion = b.situacion || 'sin comunicación';
                            const last = b.ultima_actividad ? new Date(b.ultima_actividad).toLocaleDateString() : 'nunca';
                            const visitas = b.visitas || 0;
                            
                            return `¡Lo encontré! 🕵️‍♂️ Te cuento de **${nombre}**: Está en **${estado}** y su situación es **"${situacion}"**. Lo visitamos ${visitas} veces y la última vez fue el ${last}. ¡Metele pilas! 🚀`;
                        } else {
                            return `Encontré a **${nombre}**, pero parece que es un prospecto nuevo y no tiene historial de negocio todavía. ¡Es tu oportunidad para convertirlo! 🎯`;
                        }
                    }
                } catch (e) {
                    console.error('Error in lookup:', e);
                }
            }
        }

        // 2. CONOCIMIENTO MASIVO (coqueKnowledge.ts)
        const knowledgeResult = findBestCoqueResponse(message);
        if (knowledgeResult) {
            // El componente CoqueBot.tsx detectará si hay un tutorialId en la respuesta
            // Podríamos enviarlo como un metadato si el formato fuera JSON, 
            // pero para mantenerlo simple, usaremos un evento global o una marca en el texto.
            if (knowledgeResult.tutorialId) {
                // Disparamos un evento para que el componente UI lo capture
                window.dispatchEvent(new CustomEvent('coque-start-tutorial', { 
                    detail: { tutorialId: knowledgeResult.tutorialId } 
                }));
            }
            return knowledgeResult.response;
        }

        // 3. MECANISMO DE APRENDIZAJE (Machine Learning Local)
        // Si no encontró respuesta en la base de datos ni en el Knowledge Base, lo guarda.
        const { error: insertError } = await (supabase.from('ai_unknown_queries' as any) as any).insert({
            query: message,
            created_at: new Date().toISOString()
        });

        if (insertError) {
            console.error('Error saving unknown query to Supabase:', insertError);
        }

        return "Uy, fiera, esa me mataste. 😅 No la tengo en mi manual todavía, pero ya me la anoté en mi base de datos para estudiarla y que la próxima no me agarres desprevenido. ¿Querés preguntarme algo sobre el CRM (mapas, rutas, tareas), objeciones o buscar algún Cliente?";
    },

    async summarizeActivities(activities: ActivityRecord[], context: ClientContext): Promise<AISummaryResult> {
        const allText = activities.map(a => `${a.descripcion} ${a.notas || ''}`).join(' ').toLowerCase();
        await new Promise(resolve => setTimeout(resolve, 800));

        const scores = {
            resistencia: this._calcScore(allText, SEMANTIC_DICO.ADOPCION.resistencia) * 2,
            soporte: this._calcScore(allText, SEMANTIC_DICO.PRODUCTO.bugs) * 3,
            churn: this._calcScore(allText, SEMANTIC_DICO.COMERCIAL.churn)
        };

        const estadoNum = context.estado ? parseInt(context.estado.split(' ')[0]) : 0;
        let digitalLabel = 'Prospecto';
        let digitalColor = '#64748b';
        let digitalIcon = '📋';
        let digitalDesc = 'Información relevada, pendiente de contacto.';

        if (estadoNum === 2 || estadoNum === 6) {
            digitalLabel = 'No Interesado';
            digitalColor = '#ef4444';
            digitalIcon = '🚫';
            digitalDesc = 'El cliente manifestó que no le interesa la App.';
        } else if (estadoNum === 3) {
            digitalLabel = 'App Instalada';
            digitalColor = '#f59e0b';
            digitalIcon = '📱';
            digitalDesc = 'Tiene la app, pero NO creó su tienda todavía.';
        } else if (estadoNum === 4) {
            digitalLabel = 'Tienda Orgánica';
            digitalColor = '#8b5cf6';
            digitalIcon = '✨';
            digitalDesc = 'Descargó y creó tienda solo (sin visita).';
        } else if (estadoNum === 5) {
            digitalLabel = 'Convertido (Field)';
            digitalColor = '#10b981';
            digitalIcon = '🤝';
            digitalDesc = 'Descargó la app tras visita presencial.';
        }

        const sit = context.situacion?.toLowerCase() || '';
        if (sit === 'en funcionamiento') {
            digitalLabel = 'Operativo';
            digitalColor = '#10b981';
            digitalIcon = '🚀';
            digitalDesc = 'App descargada, catálogo listo y vendiendo.';
        } else if (sit === 'en proceso') {
            digitalDesc += ' (Cargando catálogo actualmente)';
        }

        const alertas = [];
        if (context.diasSinContacto > 60) alertas.push(`Abandono Crítico: ${context.diasSinContacto} días.`);
        if (scores.soporte > 5) alertas.push("Bloqueo técnico detectado.");
        if (estadoNum === 3 && sit === 'sin comunicacion nueva') alertas.push("App muerta: Descargó pero no avanzó.");

        const patrones = [];
        if (scores.resistencia > 3) patrones.push("Barrera tecnológica detectada.");
        if (allText.includes('folleto')) patrones.push("Cuenta con material físico.");
        if (sit === 'en funcionamiento') patrones.push("Caso de éxito digital.");

        const planAccion = [];
        if (estadoNum === 3) {
            planAccion.push("Ayudar a crear la tienda (Paso crítico).");
            planAccion.push("Enviar Video 1 y 2 de configuración inicial.");
        } else if (sit === 'en proceso') {
            planAccion.push("Finalizar carga de catálogo.");
            planAccion.push("Pasar tienda a 'En Funcionamiento'.");
        } else if (context.diasSinContacto > 30) {
            planAccion.push("Llamada de cortesía para reactivar.");
        } else {
            planAccion.push("Seguimiento de ventas por la App.");
        }

        return {
            estadoDigital: { label: digitalLabel, color: digitalColor, icon: digitalIcon, desc: digitalDesc },
            alertas,
            patrones,
            planAccion,
            resumenEjecutivo: `Análisis para Cliente Estado ${estadoNum}.`
        };
    },

    async calculateBulkRisk(clientData: any, _history: any[] = []): Promise<BulkRiskResult> {
        const allText = (clientData.notas || '').toLowerCase();
        const estadoNum = clientData.estado ? parseInt(clientData.estado.split(' ')[0]) : 0;
        const lastDate = clientData.ultima_actividad ? new Date(clientData.ultima_actividad) : new Date(clientData.created_at);
        const diasInactivo = Math.floor((new Date().getTime() - lastDate.getTime()) / 86400000);

        let probability = 0;
        if (diasInactivo > 60) probability += 0.6;
        else if (diasInactivo > 30) probability += 0.3;

        if (estadoNum === 2 || estadoNum === 6) probability += 0.3;
        if (allText.includes('error') || allText.includes('falla')) probability += 0.2;

        let sentiment: 'POSITIVO' | 'NEGATIVO' | 'NEUTRAL' = 'NEUTRAL';
        if (allText.includes('enojado') || allText.includes('queja')) sentiment = 'NEGATIVO';
        else if (allText.includes('interesado') || allText.includes('conforme')) sentiment = 'POSITIVO';

        return { probability: Math.min(probability, 1), sentiment };
    },

    async suggestClientDetails(name: string, _address: string): Promise<AISuggestion> {
        return { rubro: 'Gastronomía', interes: 'Medio', notas: 'Estrategia Digital...', estado: '1 - Solo Relevado' };
    },

    _calcScore(text: string, keywords: string[]): number {
        return keywords.reduce((acc, k) => acc + (text.includes(k) ? 1 : 0), 0);
    }
};
