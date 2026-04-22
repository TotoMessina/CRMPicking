/**
 * NeuralEngine.js - Motor de IA Interno para PickingUp CRM
 * Implementación de una Red Neuronal desde cero (Plain JavaScript).
 * 
 * Este motor permite predecir el riesgo de fuga (Churn) basándose en 
 * el comportamiento histórico de los clientes.
 */

class NeuralNetwork {
    constructor(inputNodes, hiddenNodes, outputNodes) {
        this.inputNodes = inputNodes;
        this.hiddenNodes = hiddenNodes;
        this.outputNodes = outputNodes;

        // Inicialización de pesos con valores aleatorios pequeños
        this.weightsIH = this.createMatrix(this.hiddenNodes, this.inputNodes);
        this.weightsHO = this.createMatrix(this.outputNodes, this.hiddenNodes);

        // Biases (sesgos)
        this.biasH = this.createMatrix(this.hiddenNodes, 1);
        this.biasO = this.createMatrix(this.outputNodes, 1);

        this.learningRate = 0.1;
    }

    /**
     * Exporta los pesos y sesgos actuales para persistencia.
     */
    exportModel() {
        return JSON.stringify({
            weightsIH: this.weightsIH,
            weightsHO: this.weightsHO,
            biasH: this.biasH,
            biasO: this.biasO
        });
    }

    /**
     * Importa pesos y sesgos previos.
     */
    importModel(jsonStr) {
        const model = JSON.parse(jsonStr);
        this.weightsIH = model.weightsIH;
        this.weightsHO = model.weightsHO;
        this.biasH = model.biasH;
        this.biasO = model.biasO;
    }

    /**
     * Predicción (Inferencia): Calcula la probabilidad de churn.
     * @param {Array} inputArr - [diasInactivo, frecuencia, calidadNotas] normalizados (0-1)
     */
    predict(inputArr) {
        // 1. Capa de Entrada a Capa Oculta
        let inputs = this.arrayToMatrix(inputArr);
        let hidden = this.multiply(this.weightsIH, inputs);
        hidden = this.add(hidden, this.biasH);
        hidden = this.map(hidden, this.sigmoid);

        // 2. Capa Oculta a Capa de Salida
        let outputs = this.multiply(this.weightsHO, hidden);
        outputs = this.add(outputs, this.biasO);
        outputs = this.map(outputs, this.sigmoid);

        return this.matrixToArray(outputs);
    }

    /**
     * Entrenamiento: Ajusta los pesos usando Backpropagation
     * @param {Array} inputArr - Datos de entrada
     * @param {Array} targetArr - Resultado real esperado (0 o 1)
     */
    train(inputArr, targetArr) {
        // --- FEEDFORWARD (igual que predict pero guardando estados intermedios) ---
        let inputs = this.arrayToMatrix(inputArr);
        let hidden = this.multiply(this.weightsIH, inputs);
        hidden = this.add(hidden, this.biasH);
        hidden = this.map(hidden, this.sigmoid);

        let outputs = this.multiply(this.weightsHO, hidden);
        outputs = this.add(outputs, this.biasO);
        outputs = this.map(outputs, this.sigmoid);

        // --- BACKPROPAGATION ---
        let targets = this.arrayToMatrix(targetArr);

        // Calcular error de salida (Error = Target - Output)
        let outputErrors = this.subtract(targets, outputs);

        // Calcular gradientes de salida
        let gradients = this.map(outputs, this.dsigmoid);
        gradients = this.hadamardProduct(gradients, outputErrors);
        gradients = this.scale(gradients, this.learningRate);

        // Calcular deltas para Pesos Oculta-Salida
        let hiddenT = this.transpose(hidden);
        let weightsHODeltas = this.multiply(gradients, hiddenT);

        // Ajustar pesos y bias de salida
        this.weightsHO = this.add(this.weightsHO, weightsHODeltas);
        this.biasO = this.add(this.biasO, gradients);

        // Calcular error de capa oculta
        let whoT = this.transpose(this.weightsHO);
        let hiddenErrors = this.multiply(whoT, outputErrors);

        // Calcular gradientes de capa oculta
        let hiddenGradients = this.map(hidden, this.dsigmoid);
        hiddenGradients = this.hadamardProduct(hiddenGradients, hiddenErrors);
        hiddenGradients = this.scale(hiddenGradients, this.learningRate);

        // Calcular deltas para Pesos Entrada-Oculta
        let inputsT = this.transpose(inputs);
        let weightsIHDeltas = this.multiply(hiddenGradients, inputsT);

        // Ajustar pesos y bias ocultos
        this.weightsIH = this.add(this.weightsIH, weightsIHDeltas);
        this.biasH = this.add(this.biasH, hiddenGradients);
    }

    // --- FUNCIONES MATEMÁTICAS DE APOYO ---

    sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
    dsigmoid(y) { return y * (1 - y); } // Derivada de sigmoid para backprop

    createMatrix(rows, cols) {
        let m = [];
        for (let i = 0; i < rows; i++) {
            m[i] = [];
            for (let j = 0; j < cols; j++) {
                m[i][j] = Math.random() * 2 - 1;
            }
        }
        return m;
    }

    multiply(a, b) {
        let result = [];
        for (let i = 0; i < a.length; i++) {
            result[i] = [];
            for (let j = 0; j < b[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < a[0].length; k++) {
                    sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    hadamardProduct(a, b) {
        return a.map((row, i) => row.map((val, j) => val * b[i][j]));
    }

    add(a, b) {
        return a.map((row, i) => row.map((val, j) => val + b[i][j]));
    }

    subtract(a, b) {
        return a.map((row, i) => row.map((val, j) => val - b[i][j]));
    }

    scale(a, n) {
        return a.map(row => row.map(val => val * n));
    }

    transpose(a) {
        return a[0].map((_, colIndex) => a.map(row => row[colIndex]));
    }

    map(m, fn) {
        return m.map(row => row.map(val => fn(val)));
    }

    arrayToMatrix(arr) {
        return arr.map(val => [val]);
    }

    matrixToArray(m) {
        return m.reduce((acc, row) => acc.concat(row), []);
    }
}

/**
 * Helper para normalizar datos del CRM al rango 0-1
 */
export const normalizeData = (data) => {
    return [
        Math.min(data.diasInactivo / 180, 1),      // Max 180 días
        Math.min(data.frecuenciaMensual / 10, 1), // Max 10 visitas/mes
        Math.min(data.largoPromedioNotas / 500, 1) // Max 500 caracteres
    ];
};

export default NeuralNetwork;
