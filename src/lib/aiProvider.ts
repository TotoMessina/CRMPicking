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

// Memoria de contexto local (Simulación de hilo de conversación)
let lastContext: { clientId?: string, clientName?: string, lastTopic?: string } = {};

export const aiProvider = {
    /**
     * CoqueBot: Master Conversational Engine
     */
    /**
     * CoqueBot: Master Conversational Engine v18 (Intent-Based)
     */
    async ask(message: string): Promise<string> {
        const msg = message.toLowerCase();
        await new Promise(resolve => setTimeout(resolve, 800));

        // 0. DETECCIÓN DE CONTEXTO (Pronombres y referencias)
        const contextTriggers = ['como llego', 'como llegar', 'donde queda', 'ubicacion', 'que onda', 'decime mas', 'el', 'ella'];
        const isContextual = contextTriggers.some(t => msg.startsWith(t) || msg === t) && lastContext.clientName;

        // 1. ANALIZADOR DE INTENCIÓN (Sistema de Pesos)
        const intentScores = {
            lookup: 0,
            knowledge: 0
        };

        // Pesos para búsqueda en Base de Datos (Lookup)
        const lookupTerms = ['quien', 'como esta', 'info', 'buscar', 'decime de', 'datos', 'onda', 'sabes algo', 'conoces', 'donde', 'ubicacion', 'direccion'];
        lookupTerms.forEach(t => { if (msg.includes(t)) intentScores.lookup += 2; });
        
        // Si el mensaje tiene un nombre propio (capitalizado o al menos 2 palabras), suma puntos a lookup
        const words = message.trim().split(' ');
        if (words.length >= 1 && words[0][0] === words[0][0].toUpperCase() && words[0].length > 2) intentScores.lookup += 3;
        if (words.length >= 2) intentScores.lookup += 2;

        // Pesos para Base de Conocimiento (Manuales/Tutoriales)
        const knowledgeTerms = ['crear', 'alta', 'como', 'hacer', 'que es', 'pasos', 'explicame', 'ayuda', 'manual', 'videos', 'objeciones', 'competencia'];
        knowledgeTerms.forEach(t => { if (msg.includes(t)) intentScores.knowledge += 2; });

        // 2. EJECUCIÓN BASADA EN INTENCIÓN PREDOMINANTE
        
        // Prioridad 1: Si es contextual (pronombres), vamos directo al lookup
        if (isContextual) {
            const result = await this._handleLookup(lastContext.clientName || '');
            if (result) return result;
        }

        // Prioridad 2: Decidir entre Lookup y Knowledge
        if (intentScores.lookup >= intentScores.knowledge && intentScores.lookup > 0) {
            // Intentar extraer nombre
            let nameToSearch = msg;
            lookupTerms.forEach(t => nameToSearch = nameToSearch.replace(t, ''));
            nameToSearch = nameToSearch.replace(/[?¿!¡]/g, '').trim();
            
            if (nameToSearch.length > 2) {
                const lookupResult = await this._handleLookup(nameToSearch);
                if (lookupResult) return lookupResult;
            }
        }

        // Prioridad 3: Dynamic Knowledge (Modo Maestro - Respuestas entrenadas)
        if (intentScores.knowledge >= intentScores.lookup || intentScores.knowledge > 0) {
            try {
                const { data: trainedAnswers } = await (supabase.from('ai_unknown_queries' as any) as any)
                    .select('response, keywords')
                    .not('response', 'is', null);

                if (trainedAnswers && trainedAnswers.length > 0) {
                    for (const row of trainedAnswers) {
                        const kwList = (row.keywords || '').toLowerCase().split(',').map((k: string) => k.trim());
                        if (kwList.some((kw: string) => {
                            const words = kw.split(' ');
                            if (words.length > 1) return words.every((w: string) => msg.includes(w));
                            return msg.includes(kw);
                        })) {
                            return row.response;
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching trained answers:', e);
            }
        }

        // Prioridad 4: Knowledge Base Estática (coqueKnowledge.ts)
        const knowledgeResult = findBestCoqueResponse(message);
        if (knowledgeResult) {
            if (knowledgeResult.tutorialId) {
                window.dispatchEvent(new CustomEvent('coque-start-tutorial', { 
                    detail: { tutorialId: knowledgeResult.tutorialId } 
                }));
            }
            return knowledgeResult.response;
        }

        // Prioridad 5: Inteligencia Colectiva (Fallback de Chat Interno)
        // Buscamos si algún compañero ya respondió algo similar en el chat general
        if (msg.length > 5) {
            try {
                // Buscamos palabras clave importantes (sacando artículos cortos)
                const searchWords = words.filter(w => w.length > 3).join(' | ');
                if (searchWords) {
                    const { data: chatMatch } = await supabase
                        .from('mensajes_chat')
                        .select('mensaje, de_usuario')
                        .textSearch('mensaje', searchWords)
                        .limit(1);

                    if (chatMatch && chatMatch.length > 0) {
                        return `No lo tengo en mi manual oficial, pero leí que **${chatMatch[0].de_usuario.split('@')[0]}** comentó esto en el chat: \n*"${chatMatch[0].mensaje}"*.\n¿Te sirve? 🕵️‍♂️💬`;
                    }
                }
            } catch (e) {
                console.error('Error searching chat:', e);
            }
        }

        // 6. MECANISMO DE APRENDIZAJE
        const { error: insertError } = await (supabase.from('ai_unknown_queries' as any) as any).insert({
            query: message,
            created_at: new Date().toISOString()
        });

        return "Uy, fiera, esa me mataste. 😅 No la tengo en mi manual todavía, pero ya me la anoté en mi base de datos para estudiarla y que la próxima no me agarres desprevenido. ¿Querés preguntarme algo sobre el CRM (mapas, rutas, tareas), objeciones o buscar algún Cliente?";
    },

    /**
     * Helper para buscar clientes en DB y manejar contexto
     */
    async _handleLookup(potentialName: string): Promise<string | null> {
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

                // Fetch últimas actividades (Bitácora)
                const { data: actData } = await supabase
                    .from('actividades')
                    .select('descripcion, fecha, usuario')
                    .eq('cliente_id', client.id)
                    .order('fecha', { ascending: false })
                    .limit(2);

                const nombre = client.nombre_local || client.nombre;
                lastContext = { clientId: String(client.id), clientName: nombre };

                if (bizData && bizData.length > 0) {
                    const b = bizData[0];
                    const estado = b.estado || 'Sin estado';
                    const situacion = b.situacion || 'sin comunicación';
                    const last = b.ultima_actividad ? new Date(b.ultima_actividad).toLocaleDateString() : 'nunca';
                    
                    let actResumen = '';
                    if (actData && actData.length > 0) {
                        const ultimas = actData.map((a: any) => `- *${a.descripcion}* (${a.usuario || 'Alguien'})`).join('\n');
                        actResumen = `\n\n📝 **Últimas notas en la calle:**\n${ultimas}`;
                        
                        // Radar rápido de riesgo/sentimiento
                        const textAll = actData.map((a: any) => a.descripcion).join(' ').toLowerCase();
                        if (textAll.includes('enojado') || textAll.includes('queja') || textAll.includes('error')) {
                            actResumen += `\n\n⚠️ **Radar de Retención:** Detecté palabras de riesgo en las visitas. Andá con cuidado y resolvé sus problemas técnicos.`;
                        }
                    }

                    return `¡Lo encontré! 🕵️‍♂️ Te cuento de **${nombre}**: Está en **${estado}** y su situación es **"${situacion}"**. Lo visitamos ${b.visitas || 0} veces y la última fue el ${last}.${actResumen} \n\n¡Metele pilas! 🚀`;
                }
                return `Encontré a **${nombre}**, pero parece que es un prospecto nuevo sin historial todavía. ¡Es tu oportunidad para convertirlo! 🎯`;
            }
            return null;
        } catch (e) {
            console.error('Error in lookup:', e);
            return null;
        }
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
