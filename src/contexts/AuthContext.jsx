import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { flushOutbox } from '../lib/offlineManager';

const AuthContext = createContext();

const EMPRESA_KEY = 'pu_empresa_activa';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [userName, setUserName] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    // Multi-empresa
    const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
    const [empresaActiva, setEmpresaActivaState] = useState(null);
    const [paginasPermitidas, setPaginasPermitidas] = useState(null); // null = no loaded yet
    const [sessionId, setSessionId] = useState(null);

    const setEmpresaActiva = (empresa) => {
        setEmpresaActivaState(empresa);
        if (empresa) {
            localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa));
        } else {
            localStorage.removeItem(EMPRESA_KEY);
        }
    };

    const fetchRoleAndName = async (authUser) => {
        if (!authUser) {
            setRole(null);
            setUserName(null);
            setEmpresasDisponibles([]);
            setEmpresaActivaState(null);
            return;
        }

        // Si estamos offline, recuperamos al menos la empresa activa del cache para que el tracking funcione
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
            .select('role, nombre, avatar_url')
            .eq('email', authUser.email)
            .maybeSingle();

        setRole(data?.role?.toLowerCase() || null);
        setUserName(data?.nombre || null);
        setAvatarUrl(data?.avatar_url || null);

        // Load empresas this user belongs to
        const { data: empData } = await supabase
            .from('empresa_usuario')
            .select('role_en_empresa:role, empresas(id, nombre, logo_url)')
            .eq('usuario_email', authUser.email);

        const empresas = (empData || []).map(e => ({
            ...e.empresas,
            role_en_empresa: e.role_en_empresa
        }));

        setEmpresasDisponibles(empresas);

        // Auto-select: restore from localStorage or pick the first one
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
            // Only one empresa — pick it automatically
            setEmpresaActivaState(empresas[0]);
            localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresas[0]));
        } else if (empresas.length > 1) {
            // Multiple empresas — leave null so selector appears
            setEmpresaActivaState(null);
        }
    };

    const fetchPermisosPaginas = async (empresaId, userRole) => {
        // super-admin always sees everything — no restriction
        if (userRole === 'super-admin') {
            setPaginasPermitidas(null);
            return;
        }
        if (!empresaId) {
            setPaginasPermitidas({});
            return;
        }

        // Si estamos offline, no intentamos fetchear permisos
        if (!navigator.onLine) return;

        const { data } = await supabase
            .from('empresa_permisos_pagina')
            .select('pagina, habilitada, roles_permitidos')
            .eq('empresa_id', empresaId)
            .eq('habilitada', true);

        const map = {};
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

        // Sync empresaActiva across tabs
        const handleStorage = (e) => {
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

    // Sincronización Offline periódica y por evento
    useEffect(() => {
        if (!user || !empresaActiva || !navigator.onLine) return;

        // Intentar sincronizar cuando cambia el usuario o empresa
        flushOutbox(supabase);

        // También escuchar cuando vuelve el internet estando ya logueado
        const handleOnline = () => {
            console.log('[AuthContext] Red recuperada. Sincronizando pendientes...');
            flushOutbox(supabase);
        };
        window.addEventListener('online', handleOnline);
        
        return () => window.removeEventListener('online', handleOnline);
    }, [user, empresaActiva]);

    // Session Tracking logic

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        localStorage.removeItem(EMPRESA_KEY);
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    // Reload page permissions when empresaActiva changes or permissions are updated manually
    useEffect(() => {
        fetchPermisosPaginas(empresaActiva?.id, role);

        const handleUpdate = () => {
            fetchPermisosPaginas(empresaActiva?.id, role);
        };
        window.addEventListener('permissions-updated', handleUpdate);
        return () => window.removeEventListener('permissions-updated', handleUpdate);
    }, [empresaActiva, role]);

    const updateProfile = async (metadata) => {
        // 1. Actualizar metadata en Auth (para sesión actual)
        const { error: authError } = await supabase.auth.updateUser({ data: metadata });
        if (authError) throw authError;

        // 2. Sincronizar con tabla 'usuarios' (para el resto de la app y auditoría)
        if (metadata.display_name && user?.email) {
            const { error: dbError } = await supabase
                .from('usuarios')
                .update({ nombre: metadata.display_name })
                .eq('email', user.email);
            
            if (dbError) throw dbError;
            setUserName(metadata.display_name);
        }
    };

    const updateAvatarUrl = async (url) => {
        if (!user?.email) return;
        const { error } = await supabase
            .from('usuarios')
            .update({ avatar_url: url })
            .eq('email', user.email);
        if (error) throw error;
        setAvatarUrl(url);
    };

    const isDemoMode = role === 'demo';

    const value = {
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
    return useContext(AuthContext);
};
