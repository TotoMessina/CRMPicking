/* =========================================================
   dashboard.js — Lógica del Nuevo Inicio
   ========================================================= */

const supabaseClient = window.supabaseClient;

/* ============================
   INIT
   ============================ */
document.addEventListener("DOMContentLoaded", async () => {
    await requireAuthOrRedirect();

    // Bienvenida
    const user = getUsuarioActual();
    const welcomeEl = document.getElementById("welcomeMsg");
    if (welcomeEl) welcomeEl.textContent = `Hola, ${user}`;

    // Cargar KPIs
    await loadDashboardKPIs();

    // Iniciar Supabase Realtime
    initRealtimeDashboard();
});

async function requireAuthOrRedirect() {
    // Reutilizar lógica de auth.js o similar si existe, 
    // por ahora stub simple basado en localStorage/common
    if (window.CRM_GUARD_READY) await window.CRM_GUARD_READY;
    // Si no hay user, login redirigirá
}

function getUsuarioActual() {
    // Reutilizar de common.js o localStorage
    const u = localStorage.getItem("usuarioActual");
    return u || "Usuario";
}

/* ============================
   KPIs
   ============================ */
async function loadDashboardKPIs() {
    try {
        // Consultas Paralelas para velocidad
        const [
            { count: countCli },
            { count: countCons },
            { count: countRep },
            agendaHoy // fetchAgendaHoy devuelve el array directo
        ] = await Promise.all([
            supabaseClient.from("clientes").select("*", { count: "exact", head: true }).eq("activo", true),
            supabaseClient.from("consumidores").select("*", { count: "exact", head: true }).eq("activo", true),
            supabaseClient.from("repartidores").select("*", { count: "exact", head: true }),
            // Agenda Hoy: Clientes con actividad agendada hoy
            fetchAgendaHoy()
        ]);

        // Render
        setText("dashTotalClientes", countCli || 0);
        setText("dashTotalConsumidores", countCons || 0);
        setText("dashTotalRepartidores", countRep || 0);

        // Agenda
        setText("dashAgendaCount", agendaHoy ? agendaHoy.length : 0);

        // Visitas Hoy
        // Consultamos actividades de hoy con descripcion "Visita realizada"
        const today = new Date().toISOString().split("T")[0];
        const { count: countVisitas } = await supabaseClient
            .from("actividades")
            .select("*", { count: "exact", head: true })
            .eq("descripcion", "Visita realizada")
            .gte("fecha", today);

        setText("dashVisitasHoy", countVisitas || 0);

        // Intelligence Stub (Podría venir de stats logic real)
        setText("dashInsight", "Martes - Mañana");

    } catch (e) {
        console.error("Error loading dashboard:", e);
    }
}

async function fetchAgendaHoy() {
    const today = new Date().toISOString().split("T")[0];
    // Buscar clientes con fecha_proximo_contacto = hoy
    // Usamos 'fecha_proximo_contacto' que es la columna real en DB
    const { data } = await supabaseClient
        .from("clientes")
        .select("id")
        .eq("fecha_proximo_contacto", today)
        .eq("activo", true);
    return data;
}

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

/* ============================
   SUPABASE REALTIME
   ============================ */
function initRealtimeDashboard() {
    if (!supabaseClient) return;

    // Suscribirse a cambios en clientes y actividades
    const dashboardChannel = supabaseClient.channel('dashboard-kpis')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'clientes' },
            (payload) => {
                console.log('Realtime Update (Clientes):', payload);
                loadDashboardKPIs(); // Recargar KPIs silenciosamente
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'actividades' },
            (payload) => {
                console.log('Realtime Update (Actividades):', payload);
                loadDashboardKPIs(); // Recargar KPIs silenciosamente
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Dashboard Realtime: Escuchando cambios en vivo 🟢');
            }
        });
}
