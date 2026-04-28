import { useState, useCallback } from 'react';
import { aiProvider } from '../lib/aiProvider';

export interface ChurnRisk {
    probability: number;
    sentiment: string;
}

/**
 * useInternalAI - Updated to use Consolidated AI Provider (v9)
 */
export function useInternalAI() {
    const [isTrained, setIsTrained] = useState(true); // Always "trained" now as it uses heuristics

    const trainFromHistory = useCallback(async () => {
        // Legacy method for compatibility with Radar UI
        console.log('[AI] Sincronizando heurísticas de negocio...');
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsTrained(true);
    }, []);

    const getAIChurnRisk = useCallback(async (clientData: any, history: any[] = []): Promise<ChurnRisk | null> => {
        const result = await aiProvider.calculateBulkRisk(clientData, history);
        return {
            probability: result.probability,
            sentiment: result.sentiment
        };
    }, []);

    return {
        trainFromHistory,
        getAIChurnRisk,
        isTrained
    };
}
