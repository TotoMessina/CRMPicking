import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface ConfirmDiscardModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const ConfirmDiscardModal: React.FC<ConfirmDiscardModalProps> = ({
    isOpen,
    onCancel,
    onConfirm
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="modal active" 
            style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(5px)' }}
        >
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }} 
                className="modal-content" 
                style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '32px 24px', position: 'relative' }}
            >
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <AlertCircle size={32} />
                </div>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>{t('clients.modal.discard_changes')}</h3>
                <p className="muted" style={{ margin: '0 0 24px', fontSize: '1rem', lineHeight: 1.5 }}>{t('clients.modal.discard_msg')}</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Button variant="secondary" onClick={onCancel} style={{ flex: 1, padding: '12px' }}>
                        {t('clients.modal.discard_cancel')}
                    </Button>
                    <button
                        type="button"
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600, fontSize: '0.95rem',
                            background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                        }}
                        onClick={onConfirm}
                    >
                        {t('clients.modal.discard_confirm')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
