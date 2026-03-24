import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

const EMPRESA_KEY = 'pu_empresa_activa';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [userName, setUserName] = useState(null);
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

        const { data } = await supabase
            .from('usuarios')
            .select('role, nombre')
            .eq('email', authUser.email)
            .maybeSingle();

        setRole(data?.role?.toLowerCase() || null);
        setUserName(data?.nombre || null);

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

        return () => subscription.unsubscribe();
    }, []);

    // Session Tracking logic
    useEffect(() => {
        // Feature disabled temporarily to avoid 404 network errors 
        // since 'sesiones_usuario' table does not exist in the database.
    }, [user]);

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

    // Reload page permissions when empresaActiva changes
    useEffect(() => {
        fetchPermisosPaginas(empresaActiva?.id, role);
    }, [empresaActiva, role]);

    const value = {
        signIn, signOut, user, role, userName, loading,
        empresasDisponibles, empresaActiva, setEmpresaActiva,
        paginasPermitidas
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
