export const COQUE_KNOWLEDGE: { keywords: string[], response: string, tutorialId?: string }[] = [
    // ==========================================
    // 1. ESTADOS DEL CLIENTE (1 al 6)
    // ==========================================
    {
        keywords: ['estado 1', 'estado uno', 'prospecto', 'relevado'],
        response: "Estado 1: El cliente es un prospecto virgen. 📋 Solo tenemos su info. ¡Es el momento de la primera visita! Llevá folletos, mostrá seguridad y explicale cómo la App Rosa le va a cambiar la vida."
    },
    {
        keywords: ['estado 2', 'estado dos', 'no le interesa', 'rechazo inicial'],
        response: "Estado 2: Lo visitaste y dijo que no. 🚫 No pasa nada. Un 'no' hoy es un 'sí' mañana cuando vea que el local de enfrente vende el doble. Anotá bien las objeciones y volvé en un par de semanas."
    },
    {
        keywords: ['estado 3', 'estado tres', 'app instalada', 'sin tienda'],
        response: "¡Estado 3 detectado! 📱 ¡Paso crítico! Bajó la app pero la tienda está vacía. Metele pilas, mandale los Videos 1 y 2, y si hace falta, pasá a ayudarlo a cargar los primeros productos."
    },
    {
        keywords: ['estado 4', 'estado cuatro', 'organico', 'solo'],
        response: "¡Un Estado 4! ✨ Estos son cracks: bajaron la app y crearon la tienda solos. ¡No los abandones! Llamalo, felicitalo, llevá un QR y pasalo a 'En Funcionamiento'."
    },
    {
        keywords: ['estado 5', 'estado cinco', 'convertido', 'visita'],
        response: "Estado 5... ¡Mística de campo pura! 🤝 Lo visitaste y lo convenciste de descargar la app. Ahora tu misión principal es que no cuelgue con la carga del catálogo."
    },
    {
        keywords: ['estado 6', 'estado seis', 'rechazo total', 'no quiere saber nada'],
        response: "Estado 6: Rechazo total y definitivo. 🛑 No pierdas pólvora en chimangos. Dejalo asentado y vamos a buscar a los que sí quieren crecer."
    },

    // ==========================================
    // 2. SITUACIONES OPERATIVAS
    // ==========================================
    {
        keywords: ['sin comunicacion', 'ciegas', 'no contesta'],
        response: "Situación 'Sin Comunicación': Estamos a ciegas. ❓ No sabemos si abandonó o si está armando todo. Pasá a visitarlo o pegale un llamado de cortesía."
    },
    {
        keywords: ['en proceso', 'cargando', 'armando', 'catalogo incompleto'],
        response: "Está 'En Proceso', cocinando el catálogo. ⚒️ Si ves que pasan los días y no avanza, tirale un centro. Ayudalo con fotos o descripciones. ¡Que no se enfríe!"
    },
    {
        keywords: ['en funcionamiento', 'operativo', 'vendiendo', 'listo'],
        response: "🚀 ¡MODO COHETE! 'En Funcionamiento'. Ya es un cliente 100% digital. Ahora asegurate de que tenga el QR visible y enseñale a trackear los pedidos."
    },

    // ==========================================
    // 3. MAPAS Y RUTAS (SISTEMA)
    // ==========================================
    {
        keywords: ['mapa', 'mapas', 'mapa global', 'mapa clientes', 'pineos', 'chincheta'],
        response: "En la sección de Mapas podés ver a todos tus clientes geolocalizados. 🗺️ Usalo para planificar. Los colores te indican el estado. Si un cliente no aparece, fijate si tiene bien cargada la dirección (Lat/Lng).",
        tutorialId: 'mapa_global'
    },
    {
        keywords: ['ruta', 'modo ruta', 'ruta diaria', 'asignador'],
        response: "¡El Modo Ruta es tu mejor amigo! 🚶‍♂️ Activálo en el menú lateral. El sistema te va a mostrar qué clientes tenés cerca y a cuáles hace mucho no visitás. No des vueltas sin sentido, optimizá tu tiempo.",
        tutorialId: 'modo_ruta'
    },
    {
        keywords: ['asignador de rutas', 'armar ruta', 'planificar'],
        response: "Desde el 'Asignador de Rutas' los coordinadores pueden armarte el recorrido del día. 🗓️ Revisalo cada mañana para saber exactamente a quién atacar hoy."
    },

    // ==========================================
    // 4. TABLERO DE TAREAS Y TICKETS
    // ==========================================
    {
        keywords: ['tarea', 'tablero', 'tareas', 'kanban', 'recordatorio'],
        response: "El Tablero de Tareas es tu memoria externa. 📝 ¿Prometiste llevar un QR? Cargar tarea. ¿Llamar mañana a las 10? Cargar tarea. Usalo para que no se te escape ninguna venta.",
        tutorialId: 'tablero_tareas'
    },
    {
        keywords: ['ticket', 'soporte', 'falla', 'error del sistema', 'bug'],
        response: "Si encontrás una falla en la app del cliente o en el CRM, cargá un Ticket. 🎫 Detallá bien qué pasó, con qué cliente y adjuntá captura si podés. Sistemas lo va a agarrar al toque."
    },

    // ==========================================
    // 5. PRODUCTO: CATÁLOGO, PEDIDOS Y LOGÍSTICA
    // ==========================================
    {
        keywords: ['catalogo', 'fotos', 'productos', 'precios', 'subir foto'],
        response: "El catálogo es la vidriera digital. 📸 Insistile al dueño que suba fotos reales, con buena luz. Un producto sin foto no se vende. Y que mantenga los precios actualizados para no tener problemas."
    },
    {
        keywords: ['pedidos', 'venta', 'entrar pedido', 'notificacion de pedido'],
        response: "Los pedidos le suenan directo en el celu al local (App Rosa). 📦 Él tiene que aceptarlo y prepararlo. Vos podés monitorear desde el CRM si están entrando ventas o si está muerto."
    },
    {
        keywords: ['repartidor', 'repartidores', 'moto', 'envio', 'delivery'],
        response: "Los repartidores usan su propia app. 🛵 Asegurate de que el local los asocie correctamente. En la sección 'Repartidores' del CRM podés ver su estado y ubicación si están activos."
    },
    {
        keywords: ['consumidores', 'clientes del local', 'comprador'],
        response: "Los consumidores son los que le compran al local. 🛍️ En la solapa Consumidores vemos quiénes son. Mientras más promueva su QR el local, más consumidores va a tener en su base."
    },

    // ==========================================
    // 6. MANEJO DE OBJECIONES Y COMPETENCIA
    // ==========================================
    {
        keywords: ['comision', 'caro', 'precio', 'costo', 'pedidos ya', 'rappi', 'peya'],
        response: "¡La objeción de plata es la más fácil! 💸 PedidosYa y Rappi te sacan hasta un 35%. Nosotros le damos tecnología propia para que la ganancia sea 100% suya. Es una inversión, no un gasto."
    },
    {
        keywords: ['tiempo', 'full', 'ocupado', 'sin tiempo', 'despues'],
        response: "El clásico 'no tengo tiempo'. ⏳ Decile: 'Cargar el menú le lleva una tarde. Después la app le ahorra 2 horas por día de contestar mensajes de WhatsApp'. El tiempo es excusa."
    },
    {
        keywords: ['whatsapp', 'prefiero whatsapp', 'pido por whatsapp'],
        response: "¿Prefiere WhatsApp? Decile que con la App Rosa no hay audios inentendibles, no hay errores tomando nota y el catálogo está siempre actualizado. Es WhatsApp pero en nivel Dios. 📱"
    },
    {
        keywords: ['tecnologia', 'viejo', 'no sabe usar', 'dificil'],
        response: "Barrera tecnológica... 📵 No lo apures. Si puede mandar un audio de WhatsApp, puede usar la App Rosa. Sentate al lado de él, cargale el primer producto y mostrale la magia."
    },

    // ==========================================
    // 7. MATERIALES DE APOYO
    // ==========================================
    {
        keywords: ['videos', 'video 1', 'video 2', 'tutorial', 'capacitacion'],
        response: "🎬 Tenemos el 'Cine Operativo': Videos 1 y 2 para armar la tienda. Video 3 para sacar fotos pro. Video 4 para gestionar pedidos. Mandaselos por WhatsApp, son cortitos y al pie."
    },
    {
        keywords: ['folleto', 'flyer', 'qr', 'sticker', 'material'],
        response: "¡Folletería al poder! 📄 El código QR en el mostrador es obligatorio. Sin QR, los clientes físicos no se enteran de la app. Si podés, pegale vos mismo el sticker en la vidriera."
    },

    // ==========================================
    // 8. FUNCIONALIDADES TÉCNICAS DEL CRM
    // ==========================================
    {
        keywords: ['offline', 'sin internet', 'no hay señal'],
        response: "Si te quedás sin señal en la calle, el CRM guarda los cambios localmente en tu celu. 📶 Cuando vuelvas a agarrar 4G o WiFi, se sincroniza todo solo. ¡No dejes de cargar info!"
    },
    {
        keywords: ['modo oscuro', 'tema oscuro', 'luna', 'sol'],
        response: "Podés cambiar a Modo Oscuro desde el iconito de la luna en la barra lateral (abajo). 🌙 Ideal para ahorrar batería en la calle y que no te encandile la pantalla."
    },
    {
        keywords: ['notificaciones', 'push', 'campanita'],
        response: "Asegurate de activar las notificaciones en la campanita del menú lateral. 🔔 Así te avisa cuando te asignan una ruta, una tarea o si te habla un compañero por el chat."
    },
    {
        keywords: ['chat', 'mensajes', 'compañeros', 'hablar'],
        response: "Tenés un Chat interno para hablar con otros activadores o con los coordinadores. 💬 Está en el menú lateral. Usalo para pedir ayuda o coordinar zonas."
    },

    // ==========================================
    // 9. COQUEBOT PERSONALIDAD
    // ==========================================
    {
        keywords: ['hola', 'quien sos', 'quien eres', 'que haces', 'buenas'],
        response: "¡Buenas, buenas! Acá CoqueBot al habla. 🦾 Tu copiloto de ventas, enciclopedia del CRM y el que nunca duerme. ¿A qué local vamos a digitalizar hoy? Preguntame lo que necesites."
    },
    {
        keywords: ['chiste', 'broma', 'humor', 'reir'],
        response: "Un preventista le dice a un local cerrado: 'Vuelvo mañana'. Y el local le responde: 'Mañana es domingo, genio'. 😂 ¡Revisá los horarios de atención en la ficha del cliente antes de ir!"
    },
    {
        keywords: ['gracias', 'capo', 'genio', 'idolo', 'gracias coque'],
        response: "¡De nada, fiera! Andá, caminá la calle y cerrá ese local que hoy la rompemos. 🚀 ¡A vender!"
    },
    {
        keywords: ['consejo', 'tip', 'ayuda', 'recomendacion', 'motivacion'],
        response: "Tip de Coque: El éxito está en el seguimiento. No sirve de nada bajar la app si el cliente no la usa. Volvé a los 'Estado 3' y 'Estado 4' y pasalos a 'En Funcionamiento'. ¡Ahí está la plata! 💸"
    },
    // ==========================================
    // 10. CONOCIMIENTO APRENDIDO (v1.0)
    // ==========================================
    {
        keywords: ['conseguir', 'mas clientes', 'prospectar', 'buscar locales'],
        response: "Para conseguir más clientes: 1. Mirá el Mapa de la zona y buscá huecos donde no tengamos a nadie. 2. Caminá las calles principales. 3. Usá el 'Swipe Prospecting' (Tinder de Clientes) para filtrar rápido. ¡La calle no miente! 🏃‍♂️"
    },
    {
        keywords: ['crear cliente', 'creo cliente', 'alta de cliente', 'nuevo local', 'cargar cliente', 'como creo', 'como cargo'],
        response: "¡Nuevo cliente, nueva victoria! 🏆 Para crearlo: 1. Andá a la sección 'Clientes'. 2. Hacé clic en el botón flotante '+' (abajo a la derecha). 3. Cargá los datos, pineá la ubicación exacta y ¡listo! Ya lo tenés en tu ruta.",
        tutorialId: 'crear_cliente'
    },
    {
        keywords: ['preguntar', 'que sabes', 'que puedo preguntarte', 'capacidades'],
        response: "¡Soy una enciclopedia de PickingUp! 🧠 Me podés preguntar por: \n- Información de clientes específicos (ej: '¿Quién es Bianca?').\n- Estados del negocio (1 al 6).\n- Cómo usar el mapa y las rutas.\n- Consejos para vender y manejar objeciones (precios, PedidosYa).\n- Cómo usar el CRM (tareas, tickets, modo offline).\n¡Probame, fiera!"
    },
    {
        keywords: ['test', 'probando'],
        response: "¡Test recibido! 🦾 Sistema operativo, motor de IA con chispa y base de datos conectada. ¿Qué local vamos a digitalizar hoy?"
    }
];

export const findBestCoqueResponse = (message: string): { response: string, tutorialId?: string } | null => {
    const msg = message.toLowerCase();
    
    // Buscar la primera categoría donde coincida alguna palabra clave
    for (const item of COQUE_KNOWLEDGE) {
        if (item.keywords.some(kw => {
            // Si la keyword tiene espacios (ej: 'crear cliente'), 
            // intentamos ver si ambas palabras están en el mensaje aunque no estén juntas
            const words = kw.split(' ');
            if (words.length > 1) {
                return words.every(word => msg.includes(word));
            }
            // Si es una sola palabra, usamos el includes normal
            return msg.includes(kw);
        })) {
            return { response: item.response, tutorialId: item.tutorialId };
        }
    }
    
    return null; // Si no encuentra nada
};
