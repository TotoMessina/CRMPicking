const fs = require('fs');
const file = 'src/pages/Horarios.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix loadUsers
const oldLoadUsers = `    const loadUsers = async () => {
        try {
            const { data: users, error } = await supabase.from("usuarios").select("email, nombre, role").order("nombre");
            if (error) throw error;
            setUsersCache(users || []);
        } catch (err) {
            console.warn("No users found or error:", err);
            setUsersCache([]);
        }
    };`;

const newLoadUsers = `    const loadUsers = async () => {
        if (!empresaActiva?.id) return;
        try {
            const { data: rels } = await supabase.from("empresa_usuario").select("usuario_email, role").eq("empresa_id", empresaActiva.id);
            const validEmails = new Set((rels || []).map(r => r.usuario_email));

            const { data: users, error } = await supabase.from("usuarios").select("email, nombre, role").order("nombre");
            if (error) throw error;
            
            const filtered = (users || []).filter(u => validEmails.has(u.email));
            const formatted = filtered.map(u => {
                const rel = (rels || []).find(r => r.usuario_email === u.email);
                return { ...u, role: rel?.role || u.role };
            });

            setUsersCache(formatted);
        } catch (err) {
            console.warn("No users found or error:", err);
            setUsersCache([]);
        }
    };`;

// Normalizing line endings for reliable replacement
content = content.replace(oldLoadUsers.replace(/\n/g, '\r\n'), newLoadUsers);
content = content.replace(oldLoadUsers, newLoadUsers);

// Fix the useEffect dependency
content = content.replace('    useEffect(() => {\r\n        loadUsers();\r\n    }, []);', '    useEffect(() => {\n        loadUsers();\n    }, [empresaActiva]);');
content = content.replace('    useEffect(() => {\n        loadUsers();\n    }, []);', '    useEffect(() => {\n        loadUsers();\n    }, [empresaActiva]);');

// 2. Fix loadTurnos
const oldQuery = `                let query = supabase.from("turnos").select("*")
                    .gte("start_time", dateRange.start)
                    .lt("end_time", dateRange.end);`;

const newQuery = `                let query = supabase.from("turnos").select("*")
                    .eq("empresa_id", empresaActiva.id)
                    .gte("start_time", dateRange.start)
                    .lt("end_time", dateRange.end);`;

content = content.replace(oldQuery.replace(/\n/g, '\r\n'), newQuery);
content = content.replace(oldQuery, newQuery);

fs.writeFileSync(file, content);
console.log('Update successful');
