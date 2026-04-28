/**
 * AI Provider Service v8 (Domain Expert Intelligence)
 * Precise integration of Business Rules (States 1-6 and Situations)
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
    async summarizeActivities(activities: ActivityRecord[], context: ClientContext): Promise<AISummaryResult> {
        const allText = activities.map(a => `${a.descripcion} ${a.notas || ''}`).join(' ').toLowerCase();
        await new Promise(resolve => setTimeout(resolve, 800));

        // Puntuaciones semánticas
        const scores = {
            resistencia: this._calcScore(allText, SEMANTIC_DICO.ADOPCION.resistencia) * 2,
            soporte: this._calcScore(allText, SEMANTIC_DICO.PRODUCTO.bugs) * 3,
            churn: this._calcScore(allText, SEMANTIC_DICO.COMERCIAL.churn)
        };

        // 1. LÓGICA DE ESTADO (MAPEADO A REGLAS DE NEGOCIO)
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

        // 2. LÓGICA DE SITUACIÓN
        const sit = context.situacion?.toLowerCase() || '';
        if (sit === 'en funcionamiento') {
            digitalLabel = 'Operativo';
            digitalColor = '#10b981';
            digitalIcon = '🚀';
            digitalDesc = 'App descargada, catálogo listo y vendiendo.';
        } else if (sit === 'en proceso') {
            digitalDesc += ' (Cargando catálogo actualmente)';
        } else if (sit === 'sin comunicacion nueva') {
            digitalDesc += ' (Estado de funcionamiento desconocido)';
        }

        // 3. ALERTAS CRÍTICAS
        const alertas = [];
        if (context.diasSinContacto > 60) alertas.push(`Abandono Crítico: ${context.diasSinContacto} días.`);
        if (scores.soporte > 5) alertas.push("Bloqueo técnico detectado.");
        if (estadoNum === 3 && sit === 'sin comunicacion nueva') alertas.push("App muerta: Descargó pero no avanzó.");

        // 4. PATRONES
        const patrones = [];
        if (scores.resistencia > 3) patrones.push("Barrera tecnológica detectada.");
        if (allText.includes('folleto')) patrones.push("Cuenta con material físico.");
        if (allText.includes('video 1')) patrones.push("Entrenamiento audiovisual en curso.");
        if (sit === 'en funcionamiento') patrones.push("Caso de éxito digital.");

        // 5. PLAN DE ACCIÓN ESPECÍFICO
        const planAccion = [];
        if (estadoNum === 3) {
            planAccion.push("Ayudar a crear la tienda (Paso crítico).");
            planAccion.push("Enviar Video 1 y 2 de configuración inicial.");
        } else if (sit === 'en proceso') {
            planAccion.push("Finalizar carga de catálogo.");
            planAccion.push("Pasar tienda a 'En Funcionamiento'.");
        } else if (estadoNum === 1) {
            planAccion.push("Primera visita de conversión.");
            planAccion.push("Entregar folleto e instalar App.");
        } else if (estadoNum === 2 || estadoNum === 6) {
            planAccion.push("Re-intentar en 3 meses con nuevos beneficios.");
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
            resumenEjecutivo: `Análisis para Cliente Estado ${estadoNum} (${context.situacion || 'Sin Situación'}).`
        };
    },

    async suggestClientDetails(name: string, _address: string): Promise<AISuggestion> {
        // ... (Same as before, keep logic for new clients)
        return {
            rubro: 'Gastronomía', // Placeholder logic remains
            interes: 'Medio',
            notas: 'Estrategia Digital...',
            estado: '1 - Solo Relevado'
        };
    },

    _calcScore(text: string, keywords: string[]): number {
        return keywords.reduce((acc, k) => acc + (text.includes(k) ? 1 : 0), 0);
    }
};
