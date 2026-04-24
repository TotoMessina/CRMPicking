/**
 * SentimentAnalyzer - Motor de Lexicon Propietario (Ultra-Rápido)
 * Diseñado para analizar el tono de notas de CRM sin dependencias externas.
 */

const LEXICON = {
    // Términos Negativos (Aumentan Riesgo de Churn)
    negativos: [
        'enojado', 'molesto', 'queja', 'reclamo', 'caro', 'competencia', 'perder', 'malo',
        'pésimo', 'tarde', 'demora', 'incumplimiento', 'no quiere', 'dejar', 'baja',
        'problema', 'fallo', 'error', 'sucio', 'roto', 'carisimo', 'abusivo', 'discusión',
        'pelea', 'insatisfecho', 'nunca más', 'borrar', 'cancelar', 'devolver'
    ],
    // Términos Positivos (Disminuyen Riesgo de Churn)
    positivos: [
        'gracias', 'excelente', 'bueno', 'contento', 'feliz', 'recomendado', 'barato',
        'rápido', 'cumplido', 'perfecto', 'mejorar', 'comprar', 'pedir', 'visitar',
        'lindo', 'genial', 'positivo', 'fiel', 'siempre', 'recomienda', 'felicitaciones',
        'agradecido', 'impecable', 'bien', 'buena'
    ]
};

class SentimentAnalyzer {
    constructor() {
        this.isTrained = true; // Siempre listo
    }

    async warmup() {
        console.log('[AI-NLP] Motor Léxico optimizado listo.');
    }

    async analyze(text) {
        if (!text || text.trim().length < 3) {
            return { label: 'NEUTRAL', score: 0.5 };
        }

        const words = text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            .split(/\s+/);

        let score = 0;
        let posMatches = 0;
        let negMatches = 0;

        words.forEach(word => {
            if (LEXICON.positivos.includes(word)) {
                score += 1;
                posMatches++;
            }
            if (LEXICON.negativos.includes(word)) {
                score -= 1;
                negMatches++;
            }
        });

        let sentiment = 'NEUTRAL';
        // Normalizamos el score a algo entre 0 y 1
        const finalScore = 0.5 + (score * 0.1);
        const normalized = Math.max(0, Math.min(1, finalScore));

        if (score <= -1) sentiment = 'NEGATIVO';
        else if (score >= 1) sentiment = 'POSITIVO';

        // Si hay una palabra clave muy fuerte de fuga, forzar negativo
        const keywordsFuga = ['baja', 'competencia', 'caro', 'enojado', 'cancelar'];
        if (words.some(w => keywordsFuga.includes(w))) {
            sentiment = 'NEGATIVO';
        }

        return { 
            label: sentiment, 
            score: normalized,
            details: { pos: posMatches, neg: negMatches }
        };
    }
}

export const sentimentAnalyzer = new SentimentAnalyzer();
