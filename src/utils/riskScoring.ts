// ─── CHURN RISK SCORING ───────────────────────────────
// Módulo centralizado para calcular el riesgo de fuga
// de un cliente según sus interacciones históricas.

export const CHURN_THRESHOLDS = {
    WARNING: 15, // Días para Amarillo (Riesgo Medio)
    CRITICAL: 30 // Días para Rojo (Riesgo Alto)
};

export const CHURN_COLORS = {
    bajo:  "#22c55e",  // Verde
    medio: "#f59e0b",  // Amarillo/Naranja
    alto:  "#ef4444",  // Rojo
};

export interface RiskProfile {
    score: number;      // 0-10
    level: 'bajo' | 'medio' | 'alto';
    color: string;
    label: string;
    diasSinContacto: number;
}

export function getChurnRisk(rec: any): RiskProfile {
    // Si no es un cliente activo, o recién cargado, por defecto devolvemos sin riesgo especial 
    // a menos que no tenga visitas en mucho tiempo.
    // Asumimos que los estados tienen formato "5 - Local Visitado Activo"
    const isActivo = rec.estado?.includes('5') || rec.activo === true;

    let score = 0;
    const now = new Date();
    
    // Calcular principal métrica: Ultima actividad (historial real) o update
    const lastDate = rec.ultima_actividad || rec.updated_at || rec.created_at;
    let diasSinContacto = 0;
    
    if (lastDate) {
        diasSinContacto = Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86400000);
    } else {
        diasSinContacto = 999; // Nunca
    }

    // Calcular en base a la fecha de agendamiento
    let missingAgenda = false;
    if (rec.fecha_proximo_contacto) {
        const diasDesdeAgenda = (now.getTime() - new Date(rec.fecha_proximo_contacto).getTime()) / 86400000;
        if (diasDesdeAgenda > CHURN_THRESHOLDS.CRITICAL) score += 5;
        else if (diasDesdeAgenda > CHURN_THRESHOLDS.WARNING) score += 2;
    } else {
        // En vez de penalizar con 3 puntos directo, penalizamos suave
        score += 2;
        missingAgenda = true;
    }

    // Sumar peso por inactividad global
    if (diasSinContacto > CHURN_THRESHOLDS.CRITICAL) score += 4;
    else if (diasSinContacto > CHURN_THRESHOLDS.WARNING) score += 2;

    // Contacto difícil
    if (!rec.telefono) score += 1;

    score = Math.min(10, score);

    // Bajar severidad si el cliente está explícitamente en un estado muerto/inactivo
    const estadoMinus = (rec.estado || '').toLowerCase();
    if (estadoMinus.includes('6') || estadoMinus.includes('no interesado') || estadoMinus.includes('no activo')) {
        return { score: 0, level: 'bajo', color: '#94a3b8', label: 'Descartado', diasSinContacto };
    }

    // Si es un cliente recién creado (estado 1) y nunca visitado, el riesgo no es fuga, es "pendiente de relevar"
    if (estadoMinus.includes('1') && !rec.ultima_actividad) {
        return { score: 2, level: 'bajo', color: '#3b82f6', label: 'Solo Relevado', diasSinContacto };
    }

    // Si pasaron más de 30 días, forzamos nivel alto independientemente de los parches
    let level: 'bajo' | 'medio' | 'alto' = 'bajo';
    if (score >= 7 || diasSinContacto >= CHURN_THRESHOLDS.CRITICAL) {
        level = 'alto';
        score = Math.max(score, 7); // Floor a 7 si lo pateó por antigüedad
    } else if (score >= 4 || diasSinContacto >= CHURN_THRESHOLDS.WARNING) {
        level = 'medio';
        score = Math.max(score, 4);
    }

    let color = CHURN_COLORS[level];
    let label = level === 'alto' ? 'Riesgo Alto ⚠️' : level === 'medio' ? 'Riesgo Medio' : 'Al Día';

    return { score, level, color, label, diasSinContacto };
}
