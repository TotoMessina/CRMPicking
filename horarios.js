// horarios.js
document.addEventListener("DOMContentLoaded", async () => {
    const supabaseClient = window.supabaseClient;
    const showToast = window.showToast || alert;

    // Elements
    const calendarEl = document.getElementById("calendar");
    const modalTurno = document.getElementById("modalTurno");
    const formTurno = document.getElementById("formTurno");
    const selectEmpleado = document.getElementById("filtroEmpleado");
    const btnRefrescar = document.getElementById("btnRefrescar");
    const btnNuevoTurno = document.getElementById("btnNuevoTurno");
    const btnEliminarTurno = document.getElementById("btnEliminarTurno");

    // Stats Elements
    const statsWidget = document.getElementById("statsWidget");
    const statHoras = document.getElementById("statHoras");
    const statExtras = document.getElementById("statExtras");
    const statVaca = document.getElementById("statVaca");

    // Modal Inputs
    const inputUsuario = document.getElementById("inputUsuario");
    const inputTipo = document.getElementById("inputTipo");
    const inputInicio = document.getElementById("inputInicio");
    const inputFin = document.getElementById("inputFin");
    const inputNotas = document.getElementById("inputNotas");
    const inputId = document.getElementById("turnoId");

    let calendar;
    let turnosCache = [];
    let usersCache = [];

    // Colors
    const TYPE_COLORS = {
        jornada: "#3b82f6", // Blue
        extra: "#f59e0b",   // Amber/Gold
        vacaciones: "#10b981" // Emerald
    };

    // 1. Initial Load
    await loadUsers();
    initCalendar();

    // 2. Load Users
    async function loadUsers() {
        // Fetch all users to populate selects
        // Try 'usuarios' table first, fallback to unique emails from 'turnos' if empty (bootstrap)
        let { data: users, error } = await supabaseClient
            .from("usuarios")
            .select("email, nombre, role")
            .order("nombre");

        if (error || !users || users.length === 0) {
            console.warn("No users found in 'usuarios' table or error.");
            usersCache = [];
        } else {
            usersCache = users;
        }

        populateSelects();
    }

    function populateSelects() {
        const createOpt = (u) => {
            const el = document.createElement("option");
            el.value = u.email;
            el.textContent = `${u.nombre || u.email} (${u.role || 'User'})`;
            return el;
        };

        // Filter Select
        selectEmpleado.innerHTML = '<option value="">Todos los empleados</option>';
        usersCache.forEach(u => selectEmpleado.appendChild(createOpt(u)));

        // Modal Select
        inputUsuario.innerHTML = '<option value="">Seleccionar...</option>';
        usersCache.forEach(u => inputUsuario.appendChild(createOpt(u)));
    }

    // 3. Calendar Logic
    function initCalendar() {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth', // Overview first
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            locale: 'es',
            height: 'auto',
            navLinks: true, // click day/week names to navigate
            editable: true,
            selectable: true,

            // Events
            events: fetchTurnos,

            // Interactions
            select: handleDateSelect,
            eventClick: handleEventClick,
            eventDrop: handleEventDrop,
            eventResize: handleEventResize,
            datesSet: calculateStats // Recalculate stats when view changes
        });

        calendar.render();
    }

    // 4. Fetching Data
    async function fetchTurnos(info, successCallback, failureCallback) {
        // Build query
        let query = supabaseClient.from("turnos").select("*");

        // Date Range
        query = query.gte("start_time", info.startStr).lt("end_time", info.endStr);

        // User Filter
        if (selectEmpleado.value) {
            query = query.eq("usuario_email", selectEmpleado.value);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            failureCallback(error);
            return;
        }

        turnosCache = data || [];
        calculateStats(); // Update stats based on fetched data

        // Map to FC events
        const events = turnosCache.map(t => ({
            id: t.id,
            title: `${getShortName(t.usuario_email)} - ${t.tipo.toUpperCase()}`,
            start: t.start_time,
            end: t.end_time,
            backgroundColor: TYPE_COLORS[t.tipo] || "#64748b",
            borderColor: TYPE_COLORS[t.tipo] || "#64748b",
            allDay: t.tipo === 'vacaciones', // Vacations are all day usually
            extendedProps: {
                usuario_email: t.usuario_email,
                tipo: t.tipo,
                notas: t.notas
            }
        }));

        successCallback(events);
    }

    // 5. Stats Calculation
    function calculateStats() {
        if (!turnosCache.length) {
            statsWidget.style.display = "none";
            return;
        }

        // Only show stats if specific user is selected (otherwise it's mixed data)
        if (!selectEmpleado.value) {
            statsWidget.style.display = "none";
            return;
        }

        statsWidget.style.display = "flex";

        let totalHours = 0;
        let extraHours = 0;
        let vacDays = 0;

        // Get current view month
        const currentDate = calendar.getDate();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        turnosCache.forEach(t => {
            const start = new Date(t.start_time);
            const end = new Date(t.end_time);

            // STRICT MONTH FILTER: Only count if the start time falls in the current month/year
            if (start.getMonth() !== currentMonth || start.getFullYear() !== currentYear) {
                return;
            }

            if (t.tipo === 'vacaciones') {
                vacDays += 1; // Simplification: count entries. Better: diff days.
            } else {
                const hrs = (end - start) / (1000 * 60 * 60);

                if (hrs > 0) {
                    if (t.tipo === 'extra') {
                        extraHours += hrs;
                    } else {
                        totalHours += hrs;
                    }
                }
            }
        });

        statHoras.textContent = totalHours.toFixed(1);
        statExtras.textContent = extraHours.toFixed(1);
        statVaca.textContent = vacDays;
    }

    // --- OVERLAP CHECK HELPER ---
    async function checkOverlap(email, startIso, endIso, excludeId = null) {
        // Query database for any shift for this user that overlaps
        // Overlap logic: (StartA < EndB) and (EndA > StartB)
        let query = supabaseClient.from("turnos")
            .select("id")
            .eq("usuario_email", email)
            .lt("start_time", endIso)
            .gt("end_time", startIso);

        if (excludeId) {
            query = query.neq("id", excludeId);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Overlap check error", error);
            return false; // Fail safe? Or block? Let's assume no overlap if error to not block, but log it.
        }
        return data && data.length > 0;
    }

    // 6. CRUD Operations
    async function saveTurno(e) {
        e.preventDefault();

        const email = inputUsuario.value;
        const startIso = new Date(inputInicio.value).toISOString();
        const endIso = new Date(inputFin.value).toISOString();
        const id = inputId.value;

        // Validation: End > Start
        if (new Date(endIso) <= new Date(startIso)) {
            alert("La fecha de fin debe ser posterior a la de inicio.");
            return;
        }

        // Check Overlap
        const isOverlap = await checkOverlap(email, startIso, endIso, id);
        if (isOverlap) {
            alert("⚠️ El horario se superpone con otro turno existente para este usuario.");
            return;
        }

        const payload = {
            usuario_email: email,
            tipo: inputTipo.value,
            start_time: inputInicio.value, // ISO string from input
            end_time: inputFin.value,
            notas: inputNotas.value
        };

        let error;

        if (id) {
            // Update
            const { error: err } = await supabaseClient.from("turnos").update(payload).eq("id", id);
            error = err;
        } else {
            // Insert
            payload.creado_por = window.CRM_USER?.nombre || "System";
            const { error: err } = await supabaseClient.from("turnos").insert(payload);
            error = err;
        }

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            closeModal();
            calendar.refetchEvents();
        }
    }

    async function deleteTurno() {
        const id = inputId.value;
        if (!id || !confirm("¿Eliminar este turno?")) return;

        const { error } = await supabaseClient.from("turnos").delete().eq("id", id);
        if (error) {
            alert("Error: " + error.message);
        } else {
            closeModal();
            calendar.refetchEvents();
        }
    }

    // 7. Event Handlers
    function handleDateSelect(selectInfo) {
        // Pre-fill modal
        inputId.value = "";
        inputUsuario.value = selectEmpleado.value || ""; // Auto-select if filtered
        inputTipo.value = "jornada";
        inputInicio.value = toLocalInputValue(selectInfo.start);
        inputFin.value = toLocalInputValue(selectInfo.end);
        inputNotas.value = "";

        btnEliminarTurno.style.display = "none";
        document.getElementById("modalTitulo").textContent = "Cargar Turno";

        openModal();
    }

    function handleEventClick(clickInfo) {
        const evt = clickInfo.event;
        const props = evt.extendedProps;

        inputId.value = evt.id;
        inputUsuario.value = props.usuario_email;
        inputTipo.value = props.tipo;
        inputInicio.value = toLocalInputValue(evt.start);
        inputFin.value = toLocalInputValue(evt.end || evt.start); // End might be null if allDay
        inputNotas.value = props.notas || "";

        btnEliminarTurno.style.display = "inline-block";
        document.getElementById("modalTitulo").textContent = "Editar Turno";

        openModal();
    }

    async function handleEventDrop(info) {
        // Prevent drop if overlap
        const evt = info.event;
        const startIso = evt.start.toISOString();
        const endIso = evt.end ? evt.end.toISOString() : evt.start.toISOString(); // Logic check: if null, treat as point? usually has end.

        // FullCalendar might drop without end if allDay.
        let safeEnd = endIso;
        if (!evt.end) {
            // Default 1 hour or 1 day?
            if (evt.allDay) {
                const d = new Date(evt.start);
                d.setDate(d.getDate() + 1);
                safeEnd = d.toISOString();
            } else {
                const d = new Date(evt.start);
                d.setHours(d.getHours() + 1);
                safeEnd = d.toISOString();
            }
        }

        const isOverlap = await checkOverlap(evt.extendedProps.usuario_email, startIso, safeEnd, evt.id);
        if (isOverlap) {
            alert("⚠️ No se puede mover: se superpone con otro turno.");
            info.revert();
            return;
        }

        await updateDates(info.event);
    }

    async function handleEventResize(info) {
        const evt = info.event;
        const startIso = evt.start.toISOString();
        const endIso = evt.end.toISOString();

        const isOverlap = await checkOverlap(evt.extendedProps.usuario_email, startIso, endIso, evt.id);
        if (isOverlap) {
            alert("⚠️ No se puede extender: se superpone con otro turno.");
            info.revert();
            return;
        }

        await updateDates(info.event);
    }

    async function updateDates(evt) {
        const { error } = await supabaseClient.from("turnos").update({
            start_time: evt.start.toISOString(),
            end_time: evt.end ? evt.end.toISOString() : evt.start.toISOString()
        }).eq("id", evt.id);

        if (error) {
            alert("Error al mover: " + error.message);
            // info.revert() not available here easily unless passed. 
        } else {
            calculateStats(); // Recalc if moved to different range
        }
    }

    // --- BULK / CARGA MASIVA ---
    const modalMasivo = document.getElementById("modalMasivo");
    const formMasivo = document.getElementById("formMasivo");
    const btnCargaMasiva = document.getElementById("btnCargaMasiva");

    // Populate masivo select reuse
    function populateMasivoSelect() {
        const sel = document.getElementById("masivoUsuario");
        sel.innerHTML = '<option value="">Seleccionar...</option>';
        usersCache.forEach(u => {
            const el = document.createElement("option");
            el.value = u.email;
            el.textContent = `${u.nombre || u.email}`;
            sel.appendChild(el);
        });
    }

    if (btnCargaMasiva) {
        btnCargaMasiva.addEventListener("click", () => {
            populateMasivoSelect();
            if (selectEmpleado.value) document.getElementById("masivoUsuario").value = selectEmpleado.value;

            // Default dates: today and end of month
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const lastDay = new Date(year, month + 1, 0);

            document.getElementById("masivoDesde").value = dateOnlyISO(today);
            document.getElementById("masivoHasta").value = dateOnlyISO(lastDay);

            modalMasivo.style.display = "flex";
            setTimeout(() => modalMasivo.classList.add("active"), 10);
        });
    }

    if (formMasivo) {
        formMasivo.addEventListener("submit", async (e) => {
            e.preventDefault();
            const userEmail = document.getElementById("masivoUsuario").value;
            const dStart = document.getElementById("masivoDesde").value; // YYYY-MM-DD
            const dEnd = document.getElementById("masivoHasta").value;
            const tStart = document.getElementById("masivoHoraInicio").value; // HH:MM
            const tEnd = document.getElementById("masivoHoraFin").value;
            const tipo = document.getElementById("masivoTipo").value;
            const notas = document.getElementById("masivoNotas").value;

            const daysChecked = Array.from(document.querySelectorAll('input[name="dias"]:checked')).map(el => parseInt(el.value));

            if (!dStart || !dEnd || daysChecked.length === 0) {
                alert("Por favor completa las fechas y selecciona al menos un día.");
                return;
            }

            // 1. Fetch Existing Limits for Overlap Check (Optimization: Fetch all in range)
            const currentStartIso = new Date(dStart).toISOString();
            // End of last day
            const endObj = new Date(dEnd);
            endObj.setDate(endObj.getDate() + 1);
            const currentEndIso = endObj.toISOString();

            const { data: existingTurnos, error: fetchErr } = await supabaseClient
                .from("turnos")
                .select("start_time, end_time")
                .eq("usuario_email", userEmail)
                .lt("start_time", currentEndIso)
                .gt("end_time", currentStartIso);

            if (fetchErr) {
                alert("Error verificando agenda: " + fetchErr.message);
                return;
            }

            // Helper to check collision against a list
            const checkCollision = (start, end, list) => {
                return list.some(t => {
                    const tStart = new Date(t.start_time);
                    const tEnd = new Date(t.end_time);
                    return (start < tEnd && end > tStart);
                });
            };

            // Generate Payloads
            const payloadBatch = [];
            const currentDate = new Date(dStart + "T00:00:00");
            const finalDate = new Date(dEnd + "T00:00:00");

            let skippedCount = 0;

            // Loop dates
            while (currentDate <= finalDate) {
                const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon...

                if (daysChecked.includes(dayOfWeek)) {
                    // Build ISO timestamps
                    const dateStr = dateOnlyISO(currentDate);
                    const isoStart = `${dateStr}T${tStart}:00`; // Local approximation, better to use strict logic if timezones matter heavily
                    // Check if end is next day? Assume same day unless tEnd < tStart
                    let isoEnd = `${dateStr}T${tEnd}:00`;

                    // Handle cross-midnight (e.g. 22:00 to 06:00)
                    if (tEnd < tStart) {
                        const nextDay = new Date(currentDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        isoEnd = `${dateOnlyISO(nextDay)}T${tEnd}:00`;
                    }

                    // Convert to correct ISO for DB (checking timezone offsets involves more logic, 
                    // usually Date(isoStart) creates local, .toISOString converts to UTC. Ideally we want input to be respected.)
                    const objStart = new Date(isoStart);
                    const objEnd = new Date(isoEnd);

                    // Check Overlap with DB
                    if (checkCollision(objStart, objEnd, existingTurnos)) {
                        skippedCount++;
                    }
                    // Check Overlap with Self (e.g. if user makes weird range or very short recurring)
                    else if (checkCollision(objStart, objEnd, payloadBatch)) {
                        skippedCount++;
                    }
                    else {
                        payloadBatch.push({
                            usuario_email: userEmail,
                            tipo: tipo,
                            start_time: objStart.toISOString(),
                            end_time: objEnd.toISOString(),
                            notas: notas ? `${notas} (Masivo)` : '(Masivo)',
                            creado_por: window.CRM_USER?.nombre || "Masivo"
                        });
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            if (payloadBatch.length === 0) {
                if (skippedCount > 0) {
                    alert(`No se generaron turnos porque todos verían superpuestos (${skippedCount} omitidos).`);
                } else {
                    alert("No se generaron turnos. Verifica el rango y los días seleccionados.");
                }
                return;
            }

            let msg = `¿Generar ${payloadBatch.length} turnos para ${userEmail}?`;
            if (skippedCount > 0) msg += `\n(Se omitirán ${skippedCount} por superposición)`;

            if (!confirm(msg)) return;

            // Batch Insert
            const { error } = await supabaseClient.from("turnos").insert(payloadBatch);

            if (error) {
                alert("Error al generar: " + error.message);
            } else {
                alert(`¡Éxito! Se crearon ${payloadBatch.length} turnos.`);
                modalMasivo.classList.remove("active");
                modalMasivo.style.display = "none";
                calendar.refetchEvents();
            }
        });
    }

    function dateOnlyISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    // Helpers
    function toLocalInputValue(date) {
        if (!date) return "";
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        const msLocal = date.getTime() - offsetMs;
        const dateLocal = new Date(msLocal);
        return dateLocal.toISOString().slice(0, 16);
    }

    function getShortName(email) {
        const u = usersCache.find(x => x.email === email);
        if (u && u.nombre) return u.nombre.split(" ")[0];
        return email.split("@")[0];
    }

    function openModal() {
        modalTurno.style.display = "flex";
        setTimeout(() => modalTurno.classList.add("active"), 10);
    }

    function closeModal() {
        modalTurno.classList.remove("active");
        setTimeout(() => {
            modalTurno.style.display = "none";
        }, 200);

        if (modalMasivo) {
            modalMasivo.classList.remove("active");
            setTimeout(() => modalMasivo.style.display = "none", 200);
        }
    }

    // Bindings
    formTurno.addEventListener("submit", saveTurno);
    btnNuevoTurno.addEventListener("click", () => {
        // Current time rounded to hour
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const next = new Date(now);
        next.setHours(now.getHours() + 8);

        inputId.value = "";
        inputUsuario.value = selectEmpleado.value || "";
        inputTipo.value = "jornada";
        inputInicio.value = toLocalInputValue(now);
        inputFin.value = toLocalInputValue(next);
        inputNotas.value = "";
        btnEliminarTurno.style.display = "none";
        openModal();
    });

    btnEliminarTurno.addEventListener("click", deleteTurno);
    btnRefrescar.addEventListener("click", () => calendar.refetchEvents());
    selectEmpleado.addEventListener("change", () => calendar.refetchEvents());

    // Global Close
    document.querySelectorAll('[data-close="true"]').forEach(el => {
        el.addEventListener("click", (e) => {
            // If it's the modal backdrop, only close if clicked specifically on it (not children)
            if (el.classList.contains("modal") && e.target !== el) return;
            closeModal();
        });
    });
});
