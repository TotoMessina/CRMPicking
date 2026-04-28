/**
 * AI Provider Service v13 (CoqueBot Master Edition)
 * Ultra-complete conversational engine for CoqueBot.
 * Includes objection handling, competitor info, materials, and motivational tactics.
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

        // 1. SALUDOS Y PERSONALIDAD
        if (msg.includes('hola') || msg.includes('quien sos') || msg.includes('quien eres')) {
            return "¡Buenas, buenas! Acá CoqueBot al habla. 🦾 Tu copiloto de ventas, el que nunca duerme y siempre tiene un consejo a mano. ¿A qué local vamos a digitalizar hoy?";
        }

        // 2. RESPUESTAS POR ESTADOS (1-6)
        if (msg.includes('estado 1')) return "Estado 1: El cliente es un prospecto virgen. 📋 Solo tenemos su info. ¡Es el momento de la primera visita! No te olvides de llevar folletos y una buena sonrisa.";
        if (msg.includes('estado 2')) return "Estado 2: Lo visitaste y dijo que no. 🚫 Pero ojo, un 'no' hoy puede ser un 'sí' cuando vea que al de al lado le va bien con la App Rosa. ¡Volvé en un tiempo!";
        if (msg.includes('estado 3')) return "¡Estado 3 detectado! 📱 El cliente bajó la app pero tiene la tienda más vacía que heladera de soltero. ¡Metele pilas con el Video 1 y 2 para que cree la tienda ya!";
        if (msg.includes('estado 4')) return "¡Un Estado 4! ✨ Estos son cracks: bajaron la app y crearon la tienda solos. ¡Felicitalo y pasalo a 'En Funcionamiento' para que empiece a vender!";
        if (msg.includes('estado 5')) return "Estado 5... ¡Mística de campo! 🤝 Lo convenciste en la visita. Ahora asegurate de que cargue el catálogo, sino la app no sirve para nada.";
        if (msg.includes('estado 6')) return "Estado 6: No le interesa nada de nada. 🛑 No pierdas pólvora en chimangos, che. Busquemos a alguien que quiera crecer.";

        // 3. RESPUESTAS POR SITUACIONES
        if (msg.includes('sin comunicacion')) return "Situación 'Sin Comunicación': Estamos a ciegas. ❓ Hay que llamarlo o pasar para ver si la tienda está operativa o si le agarró miedo al éxito.";
        if (msg.includes('en proceso')) return "Está 'En Proceso', o sea, cocinando el catálogo. ⚒️ Si ves que tarda, tirale un centro y ayudalo con las fotos. ¡Que no se queme el guiso!";
        if (msg.includes('en funcionamiento')) return "🚀 ¡MODO COHETE! Está en funcionamiento. Ya es un cliente digital. Ahora asegurate de que los clientes del local se enteren.";

        // 4. MANEJO DE OBJECIONES (NUEVO v13)
        if (msg.includes('comision') || msg.includes('caro') || msg.includes('precio')) {
            return "Decile esto: 'Don, con la App Rosa las comisiones son historia'. 💸 Comparalo con PedidosYa o Rappi y se va a dar cuenta que se está ahorrando un dineral.";
        }
        if (msg.includes('tiempo') || msg.includes('full') || msg.includes('ocupado')) {
            return "El clásico 'no tengo tiempo'. ⏳ Decile que cargar el catálogo lleva 15 minutos y que después la App labura sola por él. ¡Es una inversión de tiempo, no un gasto!";
        }
        if (msg.includes('whatsapp')) {
            return "Si prefiere WhatsApp, decile que la App es como WhatsApp pero profesional: 📱 Sin mensajes perdidos, con stock automático y sin tener que estar respondiendo '¿A cuánto el cuarto de helado?' mil veces.";
        }
        if (msg.includes('viejo') || msg.includes('tecnologia') || msg.includes('no sabe')) {
            return "Barrera tecnológica... 📵 No te preocupes. Mostrale lo fácil que es. Si puede usar WhatsApp, puede usar la App Rosa. ¡Acompañalo en los primeros pasos!";
        }

        // 5. COMPETENCIA
        if (msg.includes('pedidos ya') || msg.includes('rappi') || msg.includes('peya')) {
            return "¡Peya y Rappi nos sirven para comparar! 🥊 Ellos cobran comisiones asesinas. Nosotros le damos autonomía y ahorro. ¡Resaltale que la plata se la queda él, no la plataforma!";
        }

        // 6. MATERIALES Y CAPACITACIÓN
        if (msg.includes('videos')) return "🎬 Cuatro videos clave: 1 y 2 (Setup Tienda), 3 (Fotos Pro) y 4 (Gestión de Pedidos). ¡Son cortos y van al grano!";
        if (msg.includes('folleto') || msg.includes('flyer') || msg.includes('qr')) {
            return "¡Folletería al poder! 📄 El QR en el mostrador es fundamental. Sin QR, los clientes no se enteran. ¡Pegale un sticker en la vidriera si podés!";
        }

        // 7. MOTIVACIÓN Y CONSEJOS ALEATORIOS
        if (msg.includes('consejo') || msg.includes('ayuda') || msg.includes('que hago') || msg.includes('tip')) {
            const tips = [
                "Tip de Coque: El que no arriesga no gana, pero el que no visita no vende. 🚶‍♂️",
                "Che, revisá los días sin contacto. Si pasaron 30 días, el cliente ya se olvidó de tu cara. ¡Llamalo!",
                "La clave está en los 'Estado 3'. Están a un pasito de ser operativos. ¡Empujalos!",
                "¡Ojo con los que cargan mal los precios! Avisales para que no pierdan plata y se enojen con la App.",
                "¡Metéle onda! El entusiasmo vende más que cualquier manual técnico. 🚀"
            ];
            return tips[Math.floor(Math.random() * tips.length)];
        }

        if (msg.includes('chiste')) {
            const jokes = [
                "¿Por qué el preventista cruzó la calle? Para instalar la App Rosa en el local de enfrente... ¡pero estaba cerrado! 😂",
                "Un dueño de local dice: 'Mi hijo me instaló la app'. El preventista: '¿Y funciona?'. El dueño: 'El hijo sí, la app todavía no cargó nada'. 🤦‍♂️ ¡Metele pilas!",
                "¿Qué le dice un Estado 1 a un Estado 5? 'Cuando sea grande quiero ser como vos'. 🚀"
            ];
            return jokes[Math.floor(Math.random() * jokes.length)];
        }

        if (msg.includes('gracias')) return "¡De nada, fiera! Andá y cerrá ese local que hoy se vende fuerte. 🚀";

        return "No te entendí ni medio, che. 😅 Pero recordá que sé todo sobre Estados (1-6), Situaciones, Objeciones (precios/tiempo), Competencia y Videos. ¡Preguntame algo de eso!";
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
