import { useState, useEffect, useCallback } from 'react';
import NeuralNetwork, { normalizeData } from '../lib/ai/NeuralEngine';
import { sentimentAnalyzer } from '../lib/ai/SentimentAnalyzer';
import { supabase } from '../lib/supabase';

export interface ChurnRisk {
    probability: number;
    sentiment: string;
}

/**
 * useInternalAI
 */
export function useInternalAI() {
    const [brain] = useState(() => new NeuralNetwork(4, 5, 1));
    const [isTrained, setIsTrained] = useState(false);

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

    const trainFromHistory = useCallback(async () => {
        console.log('[AI] Iniciando entrenamiento local...');
        
        const { data: ecData, error: ecError } = await (supabase as any)
            .from('empresa_cliente')
            .select('cliente_id, ultima_actividad, created_at, estado, notas')
            .limit(500);

        if (ecError || !ecData) {
            console.error('[AI] Error cargando clientes:', ecError);
            return;
        }

        const { data: actData, error: actError } = await (supabase as any)
            .from('actividades')
            .select('cliente_id, fecha')
            .order('fecha', { ascending: false })
            .limit(2000);

        if (actError) {
            console.error('[AI] Error cargando actividades:', actError);
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        const actMap: Record<string, Date[]> = {};
        if (actData) {
            (actData as any[]).forEach((a) => {
                if (!actMap[a.cliente_id]) actMap[a.cliente_id] = [];
                actMap[a.cliente_id].push(new Date(a.fecha));
            });
        }

        // Optimization: Perform iterations
        const iterations = 1000;
        const clients = ecData as any[];

        for (let i = 0; i < iterations; i++) {
            clients.forEach((c) => {
                const clientActs = actMap[c.cliente_id] || [];
                
                const lastDate = clientActs.length > 0 ? clientActs[0] : (c.ultima_actividad ? new Date(c.ultima_actividad) : new Date(c.created_at));
                const diasInactivo = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
                
                const freq30 = clientActs.filter(d => d >= thirtyDaysAgo).length;
                
                const notesLength = (c.notas || '').length;

                const sentimentValue = c.estado?.toLowerCase().includes('perdio') ? 0 : 0.5;

                const inputs = normalizeData({
                    diasInactivo: Math.min(diasInactivo, 180),
                    frecuenciaMensual: freq30,
                    largoPromedioNotas: notesLength,
                    sentiment: sentimentValue
                });

                const isLost = c.estado?.toLowerCase().includes('perdio') || c.estado?.toLowerCase().includes('no activo') || diasInactivo > 60;
                const target = [isLost ? 1 : 0];
                
                brain.train(inputs, target);
            });
        }

        setIsTrained(true);
        localStorage.setItem('pu-ai-model', brain.exportModel());
        console.log('[AI] Entrenamiento con datos históricos reales completado.');
    }, [brain]);

    const getAIChurnRisk = useCallback(async (clientData: any, history: any[] = []): Promise<ChurnRisk | null> => {
        if (!isTrained) return null;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const lastDate = history.length > 0 ? new Date(history[0].fecha) : (clientData.ultima_actividad ? new Date(clientData.ultima_actividad) : new Date(clientData.created_at));
        const diasInactivo = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);

        const freq30 = history.filter(a => new Date(a.fecha) >= thirtyDaysAgo).length;

        const sentimentResult = await sentimentAnalyzer.analyze(clientData.notas);
        let sentimentScore = 0.5;
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
