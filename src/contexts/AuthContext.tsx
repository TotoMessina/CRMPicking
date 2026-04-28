import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { flushOutbox } from '../lib/offlineManager';

export interface Empresa {
    id: string;
    nombre: string;
    logo_url?: string | null;
    role_en_empresa?: string;
}

export interface PaginasPermitidas {
    [key: string]: string[];
}

interface AuthContextType {
    user: User | null;
    role: string | null;
    userName: string | null;
    avatarUrl: string | null;
    loading: boolean;
    isDemoMode: boolean;
    empresasDisponibles: Empresa[];
    empresaActiva: Empresa | null;
    setEmpresaActiva: (empresa: Empresa | null) => void;
    paginasPermitidas: PaginasPermitidas | null;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    updateProfile: (metadata: { display_name?: string }) => Promise<void>;
    updateAvatarUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPRESA_KEY = 'pu_empresa_activa';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Multi-empresa
    const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);
    const [empresaActiva, setEmpresaActivaState] = useState<Empresa | null>(null);
    const [paginasPermitidas, setPaginasPermitidas] = useState<PaginasPermitidas | null>(null);

    const setEmpresaActiva = (empresa: Empresa | null) => {
        setEmpresaActivaState(empresa);
        if (empresa) {
            localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa));
        } else {
            localStorage.removeItem(EMPRESA_KEY);
        }
    };

    const fetchRoleAndName = async (authUser: User | null) => {
        if (!authUser) {
            setRole(null);
            setUserName(null);
            setAvatarUrl(null);
            setEmpresasDisponibles([]);
            setEmpresaActivaState(null);
            return;
        }

        // Si estamos offline, recuperamos al menos la empresa activa del cache
        if (!navigator.onLine) {
            const stored = localStorage.getItem(EMPRESA_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setEmpresaActivaState(parsed);
                } catch { /* ignore */ }
            }
            return;
        }

        const { data } = await supabase
            .from('usuarios')
            .select('role, nombre, avatar_emoji')
            .eq('email', authUser.email as string)
            .maybeSingle();

        setRole(data?.role?.toLowerCase() || null);
        setUserName(data?.nombre || null);
        // Note: usage of avatar_url was in old code, but DB says avatar_emoji.
        // Assuming avatar_url might be a legacy field or emoji.
        // Keeping name as avatarUrl for consistency with UI.
        setAvatarUrl((data as any)?.avatar_url || null);

        // Load empresas this user belongs to
        const { data: empData } = await supabase
            .from('empresa_usuario')
            .select('role_en_empresa:role, empresas(id, nombre, logo_url)')
            .eq('usuario_email', authUser.email as string);

        const empresas: Empresa[] = (empData || []).map((e: any) => ({
            ...e.empresas,
            role_en_empresa: e.role_en_empresa
        }));

        setEmpresasDisponibles(empresas);

        // Auto-select
        const stored = localStorage.getItem(EMPRESA_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const stillValid = empresas.find(e => e.id === parsed.id);
                setEmpresaActivaState(stillValid || empresas[0] || null);
            } catch {
                setEmpresaActivaState(empresas[0] || null);
            }
        } else if (empresas.length === 1) {
            setEmpresaActivaState(empresas[0]);
            localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresas[0]));
        } else if (empresas.length > 1) {
            setEmpresaActivaState(null);
        }
    };

    const fetchPermisosPaginas = async (empresaId: string | undefined, userRole: string | null) => {
        if (userRole === 'super-admin') {
            setPaginasPermitidas(null);
            return;
        }
        if (!empresaId) {
            setPaginasPermitidas({});
            return;
        }

        if (!navigator.onLine) return;

        const { data } = await supabase
            .from('empresa_permisos_pagina')
            .select('pagina, habilitada, roles_permitidos')
            .eq('empresa_id', empresaId)
            .eq('habilitada', true);

        const map: PaginasPermitidas = {};
        (data || []).forEach(row => {
            map[row.pagina] = row.roles_permitidos || [];
        });
        setPaginasPermitidas(map);
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const u = session?.user ?? null;
            setUser(u);
            fetchRoleAndName(u).finally(() => setLoading(false));
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            fetchRoleAndName(u);
        });

        const handleStorage = (e: StorageEvent) => {
            if (e.key === EMPRESA_KEY && e.newValue) {
                try {
                    const newEmpresa = JSON.parse(e.newValue);
                    setEmpresaActivaState(newEmpresa);
                } catch (err) { console.error('Error syncing company across tabs:', err); }
            } else if (e.key === EMPRESA_KEY && !e.newValue) {
                setEmpresaActivaState(null);
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    useEffect(() => {
        if (!user || !empresaActiva || !navigator.onLine) return;
        flushOutbox(supabase);
        const handleOnline = () => {
            flushOutbox(supabase);
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [user, empresaActiva]);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        localStorage.removeItem(EMPRESA_KEY);
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    useEffect(() => {
        fetchPermisosPaginas(empresaActiva?.id, role);
        const handleUpdate = () => {
            fetchPermisosPaginas(empresaActiva?.id, role);
        };
        window.addEventListener('permissions-updated', handleUpdate);
        return () => window.removeEventListener('permissions-updated', handleUpdate);
    }, [empresaActiva, role]);

    const updateProfile = async (metadata: { display_name?: string }) => {
        const { error: authError } = await supabase.auth.updateUser({ data: metadata });
        if (authError) throw authError;

        if (metadata.display_name && user?.email) {
            const { error: dbError } = await supabase
                .from('usuarios')
                .update({ nombre: metadata.display_name })
                .eq('email', user.email);
            
            if (dbError) throw dbError;
            setUserName(metadata.display_name);
        }
    };

    const updateAvatarUrl = async (url: string) => {
        if (!user?.email) return;
        const { error } = await supabase
            .from('usuarios')
            .update({ avatar_url: url } as any)
            .eq('email', user.email);
        if (error) throw error;
        setAvatarUrl(url);
    };

    const isDemoMode = role === 'demo';

    const value: AuthContextType = {
        signIn, signOut, user, role, userName, avatarUrl, loading,
        isDemoMode,
        empresasDisponibles, empresaActiva, setEmpresaActiva,
        paginasPermitidas,
        updateProfile, updateAvatarUrl
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
