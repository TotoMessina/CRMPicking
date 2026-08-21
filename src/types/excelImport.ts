export interface ImportRowResult {
    rowIndex: number;
    name: string;
    phone?: string;
    status: 'success' | 'updated' | 'error' | 'skipped';
    reason?: string;
}

export interface ImportProgressState {
    isOpen: boolean;
    status: 'idle' | 'reading' | 'processing' | 'completed' | 'error';
    title: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    remainingRows: number;
    successCount: number;
    updatedCount: number;
    errorCount: number;
    currentRowName: string;
    items: ImportRowResult[];
    errorMessage?: string;
}

export const INITIAL_IMPORT_PROGRESS_STATE: ImportProgressState = {
    isOpen: false,
    status: 'idle',
    title: 'Importación Excel',
    fileName: '',
    totalRows: 0,
    processedRows: 0,
    remainingRows: 0,
    successCount: 0,
    updatedCount: 0,
    errorCount: 0,
    currentRowName: '',
    items: [],
};
