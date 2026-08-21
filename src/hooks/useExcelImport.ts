import { useState, useCallback } from 'react';
import { ImportProgressState, INITIAL_IMPORT_PROGRESS_STATE } from '../types/excelImport';

export function useExcelImport() {
    const [importState, setImportState] = useState<ImportProgressState>(INITIAL_IMPORT_PROGRESS_STATE);

    const updateProgress = useCallback((update: Partial<ImportProgressState>) => {
        setImportState(prev => ({
            ...prev,
            ...update
        }));
    }, []);

    const startImport = useCallback((title: string, fileName: string) => {
        setImportState({
            isOpen: true,
            status: 'reading',
            title,
            fileName,
            totalRows: 0,
            processedRows: 0,
            remainingRows: 0,
            successCount: 0,
            updatedCount: 0,
            errorCount: 0,
            currentRowName: '',
            items: [],
        });
    }, []);

    const closeImportModal = useCallback(() => {
        setImportState(prev => ({ ...prev, isOpen: false, status: 'idle' }));
    }, []);

    return {
        importState,
        startImport,
        updateProgress,
        closeImportModal
    };
}
