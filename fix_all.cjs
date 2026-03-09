const fs = require('fs');

function replaceSafe(filePath, oldContentRaw, newContentRaw) {
    if (!fs.existsSync(filePath)) {
        console.error("File not found: " + filePath);
        return false;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    const oldContentRN = oldContentRaw.replace(/\n/g, '\r\n');
    const oldContentN = oldContentRaw.replace(/\r\n/g, '\n');
    if (content.includes(oldContentRN)) {
        fs.writeFileSync(filePath, content.replace(oldContentRN, newContentRaw));
        console.log("Updated (RN): " + filePath);
        return true;
    } else if (content.includes(oldContentN)) {
        fs.writeFileSync(filePath, content.replace(oldContentN, newContentRaw));
        console.log("Updated (N): " + filePath);
        return true;
    } else {
        console.error("Target content not found in: " + filePath);
        return false;
    }
}

// ============== HORARIOS.JSX ===============
const horariosFile = 'src/pages/Horarios.jsx';
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

replaceSafe(horariosFile, oldLoadUsers, newLoadUsers);

const oldUseEffect = `    useEffect(() => {
        loadUsers();
    }, []);`;
const newUseEffect = `    useEffect(() => {
        loadUsers();
    }, [empresaActiva]);`;
replaceSafe(horariosFile, oldUseEffect, newUseEffect);

const oldQuery = `                let query = supabase.from("turnos").select("*")
                    .gte("start_time", dateRange.start)
                    .lt("end_time", dateRange.end);`;
const newQuery = `                let query = supabase.from("turnos").select("*")
                    .eq("empresa_id", empresaActiva.id)
                    .gte("start_time", dateRange.start)
                    .lt("end_time", dateRange.end);`;
replaceSafe(horariosFile, oldQuery, newQuery);

// ADD empresaActiva prop to TurnoModal and MasivoModal in Horarios.jsx
const oldTurnoModalProp = `<TurnoModal
                    isOpen={modalTurnoOpen}
                    onClose={() => setModalTurnoOpen(false)}
                    turnoId={editingTurnoId}
                    usersCache={usersCache}
                    initialData={initialTurnoData}
                    onSaved={refetchEvents}
                />`;
const newTurnoModalProp = `<TurnoModal
                    isOpen={modalTurnoOpen}
                    onClose={() => setModalTurnoOpen(false)}
                    turnoId={editingTurnoId}
                    usersCache={usersCache}
                    initialData={initialTurnoData}
                    onSaved={refetchEvents}
                    empresaActiva={empresaActiva}
                />`;
replaceSafe(horariosFile, oldTurnoModalProp, newTurnoModalProp);

const oldMasivoModalProp = `<MasivoModal
                    isOpen={modalMasivoOpen}
                    onClose={() => setModalMasivoOpen(false)}
                    usersCache={usersCache}
                    initialUsuario={filtroEmpleado}
                    onSaved={refetchEvents}
                />`;
const newMasivoModalProp = `<MasivoModal
                    isOpen={modalMasivoOpen}
                    onClose={() => setModalMasivoOpen(false)}
                    usersCache={usersCache}
                    initialUsuario={filtroEmpleado}
                    onSaved={refetchEvents}
                    empresaActiva={empresaActiva}
                />`;
replaceSafe(horariosFile, oldMasivoModalProp, newMasivoModalProp);

// ============== TURNOMODAL.JSX ===============
const turnoFile = 'src/components/ui/TurnoModal.jsx';
const oldTurnoProps = `export function TurnoModal({ isOpen, onClose, turnoId, usersCache, initialData, onSaved }) {`;
const newTurnoProps = `export function TurnoModal({ isOpen, onClose, turnoId, usersCache, initialData, onSaved, empresaActiva }) {`;
replaceSafe(turnoFile, oldTurnoProps, newTurnoProps);

const oldTurnoPayload = `        const payload = {
            usuario_email: formData.usuario_email,
            tipo: formData.tipo,
            start_time: startIso,
            end_time: endIso,
            notas: formData.notas
        };`;
const newTurnoPayload = `        const payload = {
            usuario_email: formData.usuario_email,
            tipo: formData.tipo,
            start_time: startIso,
            end_time: endIso,
            notas: formData.notas,
            empresa_id: empresaActiva?.id
        };`;
replaceSafe(turnoFile, oldTurnoPayload, newTurnoPayload);

// ============== MASIVOMODAL.JSX ===============
const masivoFile = 'src/components/ui/MasivoModal.jsx';
const oldMasivoProps = `export function MasivoModal({ isOpen, onClose, usersCache, initialUsuario, onSaved }) {`;
const newMasivoProps = `export function MasivoModal({ isOpen, onClose, usersCache, initialUsuario, onSaved, empresaActiva }) {`;
replaceSafe(masivoFile, oldMasivoProps, newMasivoProps);

const oldMasivoPayload = `                const payload = {
                    usuario_email: formData.usuario_email,
                    tipo: formData.tipo,
                    start_time: isoStart,
                    end_time: isoEnd,
                    notas: formData.notas,
                    creado_por: metadata?.nombre || "System"
                };`;
const newMasivoPayload = `                const payload = {
                    usuario_email: formData.usuario_email,
                    tipo: formData.tipo,
                    start_time: isoStart,
                    end_time: isoEnd,
                    notas: formData.notas,
                    creado_por: metadata?.nombre || "System",
                    empresa_id: empresaActiva?.id
                };`;
replaceSafe(masivoFile, oldMasivoPayload, newMasivoPayload);
