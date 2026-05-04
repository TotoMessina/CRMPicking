import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TenantStore, TenantConfig, defaultTenantConfig } from '../config/tenant';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface TenantContextType {
    tenantConfig: TenantConfig;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
    const { empresaActiva } = useAuth();
    const [tenantConfig, setTenantConfig] = useState<TenantConfig>(TenantStore.getConfig());

    useEffect(() => {
        // Suscribirse a cambios manuales o de otros lugares
        const unsubscribe = TenantStore.subscribe((newConfig) => {
            setTenantConfig(newConfig);
        });
        return unsubscribe;
    }, []);

    return (
        <TenantContext.Provider value={{ tenantConfig }}>
            {children}
        </TenantContext.Provider>
    );
}

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
