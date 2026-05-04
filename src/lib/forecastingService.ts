import { supabase } from './supabase';
import { ESTADO_ACTIVO } from '../constants/estados';

export interface ForecastResult {
    monthlyEstimates: number;
    weightedValue: number;
    stageProbabilities: Record<string, number>;
    avgVelocityDays: number;
}

/**
 * forecastingService
 * Motor de predicción basado en probabilidades históricas del Pipeline.
 */
export const forecastingService = {
    /**
     * Calcula las probabilidades de cierre basándose en el historial de actividades
     */
    async calculateProbabilities(empresaId: string): Promise<Record<string, number>> {
        try {
            // 1. Obtener todas las actividades de cambio de estado de la empresa
            const { data: activities } = await supabase
                .from('actividades')
                .select('descripcion')
                .eq('empresa_id', empresaId)
                .ilike('descripcion', '%Cambio de estado (Pipeline)%');

            if (!activities || activities.length === 0) {
                // Fallback a probabilidades estándar de la industria si no hay data
                return {
                    'Relevado': 0.10,
                    'Visitado (No Act)': 0.25,
                    'Primer Ingreso': 0.50,
                    'Creado': 0.85,
                    'Visitado (Activo)': 1.0
                };
            }

            // 2. Analizar transiciones
            // Estructura: Stage -> Count de los que llegaron al final vs los que estuvieron en ese stage
            const stageReach: Record<string, number> = {};
            const stageConversion: Record<string, number> = {};

            activities.forEach(act => {
                const match = act.descripcion.match(/:\s*(.*?)\s*➔\s*(.*)/);
                if (match) {
                    const fromStage = match[1].trim();
                    const toStage = match[2].trim();
                    
                    stageReach[fromStage] = (stageReach[fromStage] || 0) + 1;
                    if (toStage === ESTADO_ACTIVO || toStage.toLowerCase().includes('activo')) {
                        stageConversion[fromStage] = (stageConversion[fromStage] || 0) + 1;
                    }
                }
            });

            // 3. Generar porcentajes
            const probabilities: Record<string, number> = {};
            Object.keys(stageReach).forEach(stage => {
                const reach = stageReach[stage];
                const conv = stageConversion[stage] || 0;
                // Heurística: Si hay poca data, suavizamos hacia el 10% base
                probabilities[stage] = reach > 5 ? (conv / reach) : 0.15;
            });

            // Asegurar que el estado activo es 100%
            probabilities[ESTADO_ACTIVO] = 1.0;

            return probabilities;
        } catch (err) {
            console.error('Error calculating forecasting probabilities:', err);
            return {};
        }
    },

    /**
     * Ejecuta la proyección completa basada en el Pipeline actual
     */
    async getForecast(empresaId: string, currentClients: any[]): Promise<ForecastResult> {
        const probs = await this.calculateProbabilities(empresaId);
        
        let totalWeightedValue = 0;
        let estimatedClosings = 0;

        currentClients.forEach(client => {
            const stage = client.estado || 'Relevado';
            const prob = probs[stage] || 0.10;
            
            // Asumimos un "valor" de 1 unidad por cierre si no hay presupuesto definido
            totalWeightedValue += prob;
            
            // Si la probabilidad es alta (> 70%), lo contamos como cierre probable para el mes
            if (prob > 0.7) estimatedClosings += 1;
            else if (prob > 0.4) estimatedClosings += 0.5; // Mitad de probabilidad
        });

        return {
            monthlyEstimates: Math.round(estimatedClosings),
            weightedValue: Number(totalWeightedValue.toFixed(2)),
            stageProbabilities: probs,
            avgVelocityDays: 14 // Placeholder hasta implementar cálculo de tiempo
        };
    }
};
