import { useState, useEffect, useCallback } from 'react';
import NeuralNetwork, { normalizeData } from '../lib/ai/NeuralEngine';
import { sentimentAnalyzer } from '../lib/ai/SentimentAnalyzer';
import { supabase } from '../lib/supabase';

/**
 * useInternalAI
 * Hook para gestionar el entrenamiento y predicción de la IA local.
 */
export function useInternalAI() {
    // 4 entradas: diasInactivo, frecuencia, largoNotas, sentimiento
    const [brain] = useState(() => new NeuralNetwork(4, 5, 1));
    const [isTrained, setIsTrained] = useState(false);

    // Cargar modelo guardado al iniciar
    useEffect(() => {
        const savedModel = localStorage.getItem('pu-ai-model');
        if (savedModel) {
            try {
                brain.importModel(savedModel);
                setIsTrained(true);
                console.log('[AI] Modelo cargado desde almacenamiento local.');
            } catch (e) {
                console.error('[AI] Error cargando modelo persistente:', e);
            }
        }
    }, [brain]);

    // Función para entrenar la red con datos históricos reales
    const trainFromHistory = useCallback(async () => {
        console.log('[AI] Iniciando entrenamiento local...');
        
        // 1. Obtenemos los clientes
        const { data: ecData, error: ecError } = await supabase
            .from('empresa_cliente')
            .select('cliente_id, ultima_actividad, created_at, estado, notas')
            .limit(500);

        if (ecError || !ecError && !ecData) {
            console.error('[AI] Error cargando clientes:', ecError);
            return;
        }

        // 2. Obtenemos el historial de actividades para calcular frecuencias REALES
        const { data: actData, error: actError } = await supabase
            .from('actividades')
            .select('cliente_id, fecha')
            .order('fecha', { ascending: false })
            .limit(2000);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        // Mapear actividades por cliente
        const actMap = {};
        if (actData) {
            actData.forEach(a => {
                if (!actMap[a.cliente_id]) actMap[a.cliente_id] = [];
                actMap[a.cliente_id].push(new Date(a.fecha));
            });
        }

        // 3. Entrenamiento (1000 epochs)
        for (let i = 0; i < 1000; i++) {
            ecData.forEach(async c => {
                const clientActs = actMap[c.cliente_id] || [];
                
                // Métrica 1: Días de inactividad real
                const lastDate = clientActs.length > 0 ? clientActs[0] : (c.ultima_actividad ? new Date(c.ultima_actividad) : new Date(c.created_at));
                const diasInactivo = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
                
                // Métrica 2: Frecuencia Real
                const freq30 = clientActs.filter(d => d >= thirtyDaysAgo).length;
                
                // Métrica 3: Calidad de historial (basado en notas)
                const notesLength = (c.notas || '').length;

                // Métrica 4: Sentimiento (Análisis local NLP)
                // En el entrenamiento masivo usamos una aproximación rápida o lo pre-procesamos
                // Para simplificar aquí, si el estado es 'perdio' asumimos sentimiento negativo
                const sentimentValue = c.estado?.toLowerCase().includes('perdio') ? 0 : 0.5;

                const inputs = normalizeData({
                    diasInactivo: Math.min(diasInactivo, 180),
                    frecuenciaMensual: freq30,
                    largoPromedioNotas: notesLength,
                    sentiment: sentimentValue
                });

                // Target: 1 si el cliente está perdido o no tiene actividad en > 60 días
                const isLost = c.estado?.toLowerCase().includes('perdio') || c.estado?.toLowerCase().includes('no activo') || diasInactivo > 60;
                const target = [isLost ? 1 : 0];
                
                brain.train(inputs, target);
            });
        }

        setIsTrained(true);
        localStorage.setItem('pu-ai-model', brain.exportModel());
        console.log('[AI] Entrenamiento con datos históricos reales completado.');
    }, [brain]);

    // Función para obtener una predicción de riesgo basada en historial REAL y SENTIMIENTO
    const getAIChurnRisk = useCallback(async (clientData, history = []) => {
        if (!isTrained) return null;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        // Métrica 1: Días de inactividad real
        const lastDate = history.length > 0 ? new Date(history[0].fecha) : (clientData.ultima_actividad ? new Date(clientData.ultima_actividad) : new Date(clientData.created_at));
        const diasInactivo = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);

        // Métrica 2: Frecuencia Real
        const freq30 = history.filter(a => new Date(a.fecha) >= thirtyDaysAgo).length;

        // Métrica 3: Análisis de Sentimiento Real (Transformers.js)
        const sentimentResult = await sentimentAnalyzer.analyze(clientData.notas);
        let sentimentScore = 0.5; // Neutral
        if (sentimentResult.label === 'NEGATIVO') sentimentScore = 0;
        else if (sentimentResult.label === 'POSITIVO') sentimentScore = 1;

        const inputs = normalizeData({
            diasInactivo: Math.min(diasInactivo, 180),
            frecuenciaMensual: freq30,
            largoPromedioNotas: (clientData.notas || '').length,
            sentiment: sentimentScore
        });

        const [probability] = brain.predict(inputs);
        return {
            probability,
            sentiment: sentimentResult.label
        };
    }, [brain, isTrained]);

    return {
        trainFromHistory,
        getAIChurnRisk,
        isTrained
    };
}
