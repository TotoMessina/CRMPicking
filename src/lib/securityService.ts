import { supabase } from './supabase';

export type SecurityAction = 'export_excel' | 'export_pdf' | 'bulk_view' | 'suspicious_activity' | 'auth_attempt';
export type RiskLevel = 'bajo' | 'medio' | 'alto';

export const securityService = {
    /**
     * Registra una acción sensible en el log de auditoría
     */
    async logAction(
        email: string, 
        empresaId: string | undefined, 
        accion: SecurityAction, 
        detalles: any = {}, 
        nivelRiesgo: RiskLevel = 'bajo'
    ) {
        try {
            const { error } = await (supabase as any)
                .from('security_logs')
                .insert({
                    usuario_email: email,
                    empresa_id: empresaId,
                    accion,
                    detalles,
                    nivel_riesgo: nivelRiesgo,
                    user_agent: navigator.userAgent
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error recording security log:', err);
        }
    },

    /**
     * Genera una alerta inmediata al SuperAdmin (vía Supabase Edge Function o similar en el futuro)
     * Por ahora solo registra con nivel 'alto'
     */
    async alertHighRisk(email: string, empresaId: string | undefined, accion: SecurityAction, detalles: any) {
        return this.logAction(email, empresaId, accion, detalles, 'alto');
    }
};
