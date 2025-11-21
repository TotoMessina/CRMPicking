// =========================================================
// 1) Conexión a Supabase (solo ANON KEY)
// =========================================================
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Cache local de clientes
let clientesCache = [];

// Usuario actual y tema
let usuarioActual = localStorage.getItem("usuarioActual") || "";
const THEME_KEY = "crm_theme";

// Solo estos usuarios pueden guardar / registrar historial
const allowedUsers = [
  "Toto",
  "Ruben",
  "Tincho(B)",
  "Fran",
  "Ari",
  "Nati",
  "Dani",
  "Otro",
];

// Modal actividad
let clienteActividadID = null;

// Agenda de próximos contactos (filtro por fecha)
let agendaMode = "todos";      // 'todos' | 'vencidos' | 'fecha'
let agendaDate = null;         // 'YYYY-MM-DD' cuando mode === 'fecha'

// =========================================================
// 2) Utilidades
// =========================================================
function formatearFecha(fechaISO) {
  if (!fechaISO) return "";
  const d = new Date(fechaISO);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFechaSoloDia(fechaISO) {
  if (!fechaISO) return "";
  const d = new Date(fechaISO);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR");
}

function resetFormulario() {
  document.getElementById("formCliente").reset();
  document.getElementById("clienteId").value = "";
  document.getElementById("tituloForm").textContent = "Nuevo cliente";
  document.getElementById("btnGuardar").textContent = "Guardar";
}

// Tema
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);

  const btn = document.getElementById("btnToggleTheme");
  if (btn) {
    btn.textContent =
      theme === "dark" ? "Modo día ☀️" : "Modo noche 🌙";
  }
}

// Usuario válido
function isUsuarioValido() {
  return !!usuarioActual && allowedUsers.includes(usuarioActual);
}

function asegurarUsuarioValido() {
  if (!isUsuarioValido()) {
    alert(
      "Para poder guardar clientes o registrar historial tenés que seleccionar un usuario válido (Toto, Ruben, Tincho(B), Fran, Ari, Nati, Dani u Otro) en el selector de arriba."
    );
    return false;
  }
  return true;
}

// Convierte cualquier formato de fecha Excel → YYYY-MM-DD
function excelDateToYMD(value) {
  if (!value && value !== 0) return null;

  // Caso 1: número de fecha de Excel (por ejemplo 45231)
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }

  // Caso 2: objeto Date real
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }

  // Caso 3: string
  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return null;

    // Ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // Intentar parseo estándar
    const d = new Date(clean);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  }

  return null;
}

// =========================================================
// Agenda / calendario de próximos contactos
// =========================================================
function setAgendaMode(mode, date = null) {
  agendaMode = mode;
  agendaDate = date;

  const chips = document.querySelectorAll(".agenda-chip");
  chips.forEach((chip) => {
    const chipMode = chip.dataset.mode;
    const chipDate = chip.dataset.date || null;
    const isActive =
      chipMode === mode && (mode !== "fecha" || chipDate === date);
    chip.classList.toggle("agenda-chip--active", isActive);
  });

  cargarClientes();
}

function renderAgendaCalendario() {
  const cont = document.getElementById("agendaCalendario");
  if (!cont) return;

  cont.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyYMD = hoy.toISOString().split("T")[0];

  // Chip "Todos"
  const btnTodos = document.createElement("button");
  btnTodos.textContent = "Todos";
  btnTodos.className = "agenda-chip";
  btnTodos.dataset.mode = "todos";
  btnTodos.addEventListener("click", () => setAgendaMode("todos", null));
  cont.appendChild(btnTodos);

  // Chip "Vencidos"
  const btnVencidos = document.createElement("button");
  btnVencidos.textContent = "Vencidos";
  btnVencidos.className = "agenda-chip";
  btnVencidos.dataset.mode = "vencidos";
  btnVencidos.addEventListener("click", () => setAgendaMode("vencidos", null));
  cont.appendChild(btnVencidos);

  // Chips "Hoy" + próximos 6 días
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);

    const ymd = d.toISOString().split("T")[0];
    const labelDate = d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
    });

    const btn = document.createElement("button");
    btn.className = "agenda-chip";
    btn.dataset.mode = "fecha";
    btn.dataset.date = ymd;
    btn.innerHTML = (i === 0 ? "Hoy<br>" : "") + labelDate;

    btn.addEventListener("click", () => setAgendaMode("fecha", ymd));
    cont.appendChild(btn);
  }

  // Arrancar viendo todos
  setAgendaMode("todos", null);
}

// =========================================================
// 3) ACTIVIDADES (historial)
// =========================================================
async function agregarActividad(clienteId, descripcion) {
  if (!clienteId) return;

  // Por seguridad, no registramos historial si no hay usuario válido
  if (!isUsuarioValido()) {
    return;
  }

  const { error } = await supabaseClient.from("actividades").insert([
    {
      cliente_id: clienteId,
      descripcion,
      usuario: usuarioActual || null,
    },
  ]);

  if (error) {
    console.error("Error agregando actividad:", error);
    alert("No se pudo registrar la actividad.");
  }
}

// =========================================================
// 4) CARGA DE CLIENTES + HISTORIAL + RUBROS PARA FILTRO
// =========================================================
async function cargarClientes() {
  const listaDiv = document.getElementById("lista");
  listaDiv.innerHTML = "<p>Cargando...</p>";

  // Filtros
  const filtroNombre = document.getElementById("filtroNombre").value.trim();
  const filtroTelefono = document.getElementById("filtroTelefono").value.trim();
  const filtroRubro = document.getElementById("filtroRubro").value; // select
  const filtroEstado = document.getElementById("filtroEstado").value;

  // Fechas para aplicar filtros de agenda
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr = hoy.toISOString().split("T")[0];

  // --- Actualizar opciones del filtro de rubro desde TODOS los clientes activos ---
  try {
    const { data: rubrosData, error: errRubros } = await supabaseClient
      .from("clientes")
      .select("rubro")
      .eq("activo", true);

    if (!errRubros) {
      const selectRubro = document.getElementById("filtroRubro");
      if (selectRubro) {
        const prev = selectRubro.value;
        const rubrosSet = new Set(
          (rubrosData || [])
            .map((c) => c.rubro)
            .filter((r) => r && r.toString().trim() !== "")
        );

        selectRubro.innerHTML = "";
        const optTodos = document.createElement("option");
        optTodos.value = "";
        optTodos.textContent = "Todos los rubros";
        selectRubro.appendChild(optTodos);

        const rubrosOrdenados = Array.from(rubrosSet).sort((a, b) =>
          a.localeCompare(b, "es", { sensitivity: "base" })
        );

        rubrosOrdenados.forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          selectRubro.appendChild(opt);
        });

        // restaurar selección si sigue existiendo
        if (prev && rubrosSet.has(prev)) {
          selectRubro.value = prev;
        }
      }
    } else {
      console.error("Error cargando rubros para filtro:", errRubros);
    }
  } catch (e) {
    console.error("Error inesperado cargando rubros:", e);
  }

  // --- Cargar clientes según filtros ---
  let query = supabaseClient
    .from("clientes")
    .select("id, nombre, telefono, rubro, estado, fecha_proximo_contacto, notas")
    .eq("activo", true);

  // Filtro de agenda según calendario
  if (agendaMode === "fecha" && agendaDate) {
    query = query.eq("fecha_proximo_contacto", agendaDate);
  } else if (agendaMode === "vencidos") {
    query = query.lt("fecha_proximo_contacto", hoyStr);
  }

  if (filtroEstado && filtroEstado !== "Todos") {
    query = query.eq("estado", filtroEstado);
  }

  if (filtroNombre) {
    query = query.ilike("nombre", `%${filtroNombre}%`);
  }

  if (filtroTelefono) {
    query = query.ilike("telefono", `%${filtroTelefono}%`);
  }

  if (filtroRubro) {
    query = query.eq("rubro", filtroRubro);
  }

  // Orden base por id (luego reordenamos por historial en el front)
  query = query.order("id", { ascending: true });

  const { data: clientes, error } = await query;

  if (error) {
    console.error("Error cargando clientes:", error);
    listaDiv.innerHTML = "<p>Error al cargar clientes.</p>";
    return;
  }

  clientesCache = clientes || [];
  document.getElementById("contador").textContent = `(${clientesCache.length})`;

  if (!clientesCache.length) {
    listaDiv.innerHTML = "<p>No hay clientes cargados.</p>";
    return;
  }

  // Cargar actividades para TODOS los clientes en una sola consulta
  const ids = clientesCache.map((c) => c.id);
  const { data: actividades, error: errorAct } = await supabaseClient
    .from("actividades")
    .select("id, cliente_id, fecha, descripcion, usuario")
    .in("cliente_id", ids)
    .order("fecha", { ascending: false });

  if (errorAct) {
    console.error("Error cargando actividades:", errorAct);
  }

  const actividadesPorCliente = {};
  const lastActivityMap = {}; // para ordenar por última modificación

  (actividades || []).forEach((a) => {
    if (!actividadesPorCliente[a.cliente_id]) {
      actividadesPorCliente[a.cliente_id] = [];
    }
    actividadesPorCliente[a.cliente_id].push(a);

    const d = new Date(a.fecha);
    if (!Number.isNaN(d.getTime())) {
      const prev = lastActivityMap[a.cliente_id];
      if (!prev || d > prev) {
        lastActivityMap[a.cliente_id] = d;
      }
    }
  });

  // 🔽 Ordenar clientes por última actividad de historial (más reciente primero)
  clientesCache.sort((a, b) => {
    const da = lastActivityMap[a.id];
    const db = lastActivityMap[b.id];

    if (da && db) return db - da; // más reciente primero
    if (da && !db) return -1;     // con actividad va antes
    if (!da && db) return 1;
    // si ninguno tiene historial, ordenar por id asc
    return a.id - b.id;
  });

  // Render de tarjetas
  listaDiv.innerHTML = "";
  clientesCache.forEach((cliente) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = cliente.id;

    const actividadesCliente = actividadesPorCliente[cliente.id] || [];
    const claseEstado = `tag-estado-${cliente.estado.replace(/\s+/g, "")}`;

    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-main-title">${cliente.nombre || "(Sin nombre)"}</div>
          <div class="card-meta">
            ${cliente.telefono ? `📞 ${cliente.telefono} · ` : ""}
            ${
              cliente.fecha_proximo_contacto
                ? `📅 Próximo contacto: ${formatearFechaSoloDia(
                    cliente.fecha_proximo_contacto
                  )}`
                : ""
            }
          </div>
          <div class="card-tags">
            <span class="tag ${claseEstado}">Estado: ${cliente.estado}</span>
            ${
              cliente.rubro
                ? `<span class="tag">Rubro: ${cliente.rubro}</span>`
                : ""
            }
          </div>
          ${
            cliente.notas
              ? `<div class="card-notas"><strong>Notas:</strong> ${cliente.notas}</div>`
              : ""
          }
        </div>
        <div class="card-buttons">
          <button class="btn-actividad" data-action="actividad" data-id="${
            cliente.id
          }">+ Actividad</button>
          <button class="btn-edit" data-action="editar" data-id="${
            cliente.id
          }">Editar</button>
          <button class="btn-delete" data-action="eliminar" data-id="${
            cliente.id
          }">Eliminar</button>
        </div>
      </div>

      <div class="historial">
        <div class="historial-header">
          <strong>Historial (${actividadesCliente.length})</strong>
          <button class="btn-toggle-historial" data-action="toggle-historial" data-id="${
            cliente.id
          }">Ver historial</button>
        </div>
        <div class="historial-list" style="display:none">
          ${
            actividadesCliente.length
              ? actividadesCliente
                  .map(
                    (a) => `
            <div>
              <div>${a.descripcion}</div>
              <div class="historial-fecha">
                ${formatearFecha(a.fecha)}
                ${
                  a.usuario
                    ? ` · <strong>${a.usuario}</strong>`
                    : ""
                }
              </div>
            </div>`
                  )
                  .join("")
              : "<div>No hay actividades registradas.</div>"
          }
        </div>
      </div>
    `;

    listaDiv.appendChild(card);
  });
}

// =========================================================
// 5) GUARDAR / EDITAR CLIENTE
// =========================================================
async function guardarCliente(e) {
  e.preventDefault();

  if (!asegurarUsuarioValido()) return;

  const id = document.getElementById("clienteId").value || null;
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const rubro = document.getElementById("rubro").value.trim();
  const estado = document.getElementById("estado").value;
  const fechaProx = document.getElementById("fecha_proximo_contacto").value;
  const notas = document.getElementById("notas").value.trim();

  if (!nombre) {
    alert("El nombre es obligatorio.");
    return;
  }

  const payload = {
    nombre,
    telefono: telefono || null,
    rubro: rubro || "Sin definir",
    estado,
    fecha_proximo_contacto: fechaProx || null,
    notas: notas || null,
  };

  let error;
  let newId = id;

  if (id) {
    const { error: errUpdate } = await supabaseClient
      .from("clientes")
      .update(payload)
      .eq("id", id);

    error = errUpdate;
    if (!error) {
      await agregarActividad(id, "Cliente actualizado");
    }
  } else {
    const { data, error: errInsert } = await supabaseClient
      .from("clientes")
      .insert([payload])
      .select("id")
      .single();

    error = errInsert;
    if (!error && data && data.id) {
      newId = data.id;
      await agregarActividad(newId, "Cliente creado");
    }
  }

  if (error) {
    console.error("Error guardando cliente:", error);
    alert("No se pudo guardar el cliente.\n\n" + error.message);
    return;
  }

  resetFormulario();
  cargarClientes();
}

// =========================================================
// 6) ELIMINAR CLIENTE (borrado lógico)
// =========================================================
async function eliminarCliente(id) {
  if (!asegurarUsuarioValido()) return;

  if (!confirm("¿Seguro que querés marcar como eliminado este cliente?")) return;

  const { error } = await supabaseClient
    .from("clientes")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    console.error("Error eliminando cliente:", error);
    alert("No se pudo eliminar el cliente.");
    return;
  }

  await agregarActividad(id, "Cliente eliminado");
  cargarClientes();
}

// =========================================================
// 7) EDITAR CLIENTE (rellenar formulario)
// =========================================================
function editarCliente(id) {
  const cliente = clientesCache.find((c) => String(c.id) === String(id));
  if (!cliente) return;

  document.getElementById("clienteId").value = cliente.id;
  document.getElementById("nombre").value = cliente.nombre || "";
  document.getElementById("telefono").value = cliente.telefono || "";
  document.getElementById("rubro").value = cliente.rubro || "";
  document.getElementById("estado").value =
    cliente.estado || "1 - Cliente relevado";
  document.getElementById("fecha_proximo_contacto").value =
    cliente.fecha_proximo_contacto || "";
  document.getElementById("notas").value = cliente.notas || "";

  document.getElementById("tituloForm").textContent = "Editar cliente";
  document.getElementById("btnGuardar").textContent = "Actualizar";
}

// =========================================================
// 8) MODAL DE ACTIVIDAD
// =========================================================
function abrirModalActividad(clienteId) {
  clienteActividadID = clienteId;
  document.getElementById("actividadTexto").value = "";
  document.getElementById("actividadModal").style.display = "flex";
}

function cerrarModalActividad() {
  document.getElementById("actividadModal").style.display = "none";
  clienteActividadID = null;
}

async function guardarActividadDesdeModal() {
  if (!asegurarUsuarioValido()) return;

  const texto = document.getElementById("actividadTexto").value.trim();

  if (!texto) {
    alert("La actividad no puede estar vacía.");
    return;
  }

  await agregarActividad(clienteActividadID, texto);
  cerrarModalActividad();
  cargarClientes();
}

async function agregarActividadDesdeCard(id) {
  if (!asegurarUsuarioValido()) return;
  abrirModalActividad(id);
}

// =========================================================
// 9) EXCEL: DESCARGAR MODELO
// =========================================================
function descargarModeloExcel() {
  const wb = XLSX.utils.book_new();

  const data = [
    [
      "nombre",
      "telefono",
      "rubro",
      "estado",
      "fecha_proximo_contacto (YYYY-MM-DD)",
      "notas",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");

  XLSX.writeFile(wb, "modelo_clientes.xlsx");
}

// =========================================================
// 9 bis) EXCEL: EXPORTAR CLIENTES + HISTORIAL
// =========================================================
async function exportarExcel() {
  const { data: clientes, error: errCli } = await supabaseClient
    .from("clientes")
    .select(
      "id, nombre, telefono, rubro, estado, fecha_proximo_contacto, notas"
    )
    .eq("activo", true)
    .order("id", { ascending: true });

  if (errCli) {
    console.error("Error obteniendo clientes para exportar:", errCli);
    alert("No se pudieron obtener los clientes para exportar.");
    return;
  }

  const ids = (clientes || []).map((c) => c.id);
  let actividades = [];

  if (ids.length) {
    const { data: acts, error: errAct } = await supabaseClient
      .from("actividades")
      .select("cliente_id, fecha, descripcion, usuario")
      .in("cliente_id", ids)
      .order("fecha", { ascending: true });

    if (errAct) {
      console.error("Error obteniendo actividades:", errAct);
    }

    actividades = acts || [];
  }

  const wb = XLSX.utils.book_new();

  // Hoja Clientes
  const dataClientes = [
    [
      "id",
      "nombre",
      "telefono",
      "rubro",
      "estado",
      "fecha_proximo_contacto",
      "notas",
    ],
  ];

  (clientes || []).forEach((c) => {
    dataClientes.push([
      c.id,
      c.nombre || "",
      c.telefono || "",
      c.rubro || "",
      c.estado || "",
      c.fecha_proximo_contacto || "",
      c.notas || "",
    ]);
  });

  const wsClientes = XLSX.utils.aoa_to_sheet(dataClientes);
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

  // Hoja Historial
  const clientePorId = {};
  (clientes || []).forEach((c) => {
    clientePorId[c.id] = c;
  });

  const dataHist = [
    [
      "cliente_id",
      "nombre_cliente",
      "telefono_cliente",
      "fecha",
      "usuario",
      "descripcion",
    ],
  ];

  actividades.forEach((a) => {
    const cli = clientePorId[a.cliente_id] || {};
    dataHist.push([
      a.cliente_id,
      cli.nombre || "",
      cli.telefono || "",
      a.fecha || "",
      a.usuario || "",
      a.descripcion || "",
    ]);
  });

  const wsHist = XLSX.utils.aoa_to_sheet(dataHist);
  XLSX.utils.book_append_sheet(wb, wsHist, "Historial");

  XLSX.writeFile(wb, "crm_clientes_historial.xlsx");
}

// =========================================================
// 10) EXCEL: IMPORTAR CLIENTES (maneja duplicados por teléfono)
// =========================================================
async function importarDesdeExcel(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (!json.length) {
      alert("El archivo no tiene datos.");
      return;
    }

    const registros = json.map((row) => {
      const nombre = (row.nombre || "").toString().trim();

      const telefono = row.telefono
        ? row.telefono.toString().trim()
        : null;

      let rubro = row.rubro ? row.rubro.toString().trim() : "";
      if (!rubro) rubro = "Sin definir";

      let estado = row.estado ? row.estado.toString().trim() : "";
      if (!estado) estado = "1 - Cliente relevado";

      // Conversión robusta de fecha
      const fecha_proximo_contacto = excelDateToYMD(
        row["fecha_proximo_contacto (YYYY-MM-DD)"]
      );

      const notas = row.notas ? row.notas.toString().trim() : null;

      return {
        nombre,
        telefono,
        rubro,
        estado,
        fecha_proximo_contacto,
        notas,
      };
    });

    const registrosValidos = registros.filter((r) => r.nombre);

    if (!registrosValidos.length) {
      alert("No se encontraron filas válidas (con nombre).");
      return;
    }

    const gruposPorTelefono = new Map();
    const sinTelefono = [];

    for (const r of registrosValidos) {
      if (!r.telefono) {
        sinTelefono.push(r);
      } else {
        if (!gruposPorTelefono.has(r.telefono)) {
          gruposPorTelefono.set(r.telefono, []);
        }
        gruposPorTelefono.get(r.telefono).push(r);
      }
    }

    const telefonos = Array.from(gruposPorTelefono.keys());

    let existentes = [];
    if (telefonos.length) {
      const { data: existentesData, error: errorExist } = await supabaseClient
        .from("clientes")
        .select("id, telefono, notas")
        .in("telefono", telefonos);

      if (errorExist) {
        console.error("Error leyendo clientes existentes:", errorExist);
        alert(
          "No se pudo verificar teléfonos existentes.\n\n" +
            errorExist.message
        );
        return;
      }

      existentes = existentesData || [];
    }

    const existentesMap = new Map();
    for (const c of existentes) {
      existentesMap.set(c.telefono, c);
    }

    const nuevosParaInsertar = [];
    const duplicadosEnExistentes = [];
    const fusionadosDesdeExcel = [];

    for (const [telefono, rows] of gruposPorTelefono.entries()) {
      const existente = existentesMap.get(telefono);

      if (existente) {
        duplicadosEnExistentes.push({ telefono, rows, existente });
      } else {
        const base = { ...rows[0] };

        if (rows.length > 1) {
          let extraNotas = "";
          rows.forEach((r, idx) => {
            const detalle =
              `Registro ${idx + 1} del Excel: ` +
              `${r.nombre || "Sin nombre"} · Rubro: ${r.rubro || "-"} · Estado: ${
                r.estado || "-"
              }` +
              (r.fecha_proximo_contacto
                ? ` · Próx. contacto: ${r.fecha_proximo_contacto}`
                : "") +
              (r.notas ? ` · Notas: ${r.notas}` : "");
            extraNotas += `\n• ${detalle}`;
          });

          if (extraNotas) {
            base.notas = (base.notas || "") + "\n\n" + extraNotas;
          }

          fusionadosDesdeExcel.push({
            telefono,
            cantidad: rows.length,
          });
        }

        nuevosParaInsertar.push(base);
      }
    }

    nuevosParaInsertar.push(...sinTelefono);

    let insertError = null;
    let insertCount = 0;

    if (nuevosParaInsertar.length) {
      const { error, count } = await supabaseClient
        .from("clientes")
        .insert(nuevosParaInsertar, { count: "exact" });

      insertError = error;
      if (!error) {
        insertCount = count ?? nuevosParaInsertar.length;
      }
    }

    let updatedCount = 0;
    const hoy = new Date().toLocaleDateString("es-AR");

    for (const dup of duplicadosEnExistentes) {
      const { existente, rows, telefono } = dup;

      let textoExtra = existente.notas ? existente.notas + "\n\n" : "";
      textoExtra += `Importación Excel (${hoy}) para teléfono ${telefono}:\n`;

      rows.forEach((r, idx) => {
        textoExtra += `• ${idx + 1}) ${r.nombre || "Sin nombre"} · Rubro: ${
          r.rubro || "-"
        } · Estado: ${r.estado || "-"}`;
        if (r.fecha_proximo_contacto) {
          textoExtra += ` · Próx. contacto: ${r.fecha_proximo_contacto}`;
        }
        if (r.notas) {
          textoExtra += ` · Notas: ${r.notas}`;
        }
        textoExtra += "\n";
      });

      const { error: updErr } = await supabaseClient
        .from("clientes")
        .update({ notas: textoExtra })
        .eq("id", existente.id);

      if (!updErr) {
        updatedCount++;
      } else {
        console.error("Error actualizando notas por duplicado:", updErr);
      }
    }

    if (insertError) {
      console.error("Error importando desde Excel:", insertError);
      alert(
        "Ocurrió un error al importar algunos clientes.\n\n" +
          insertError.message
      );
    }

    const totalDuplicados = duplicadosEnExistentes.reduce(
      (acc, d) => acc + d.rows.length,
      0
    );

    let msg = `Importación completada.\n\nClientes nuevos cargados: ${insertCount}`;

    if (totalDuplicados) {
      msg += `\nRegistros con teléfono ya existente en la BD: ${totalDuplicados}.\nSe agregaron como notas al cliente correspondiente.`;
    }

    if (fusionadosDesdeExcel.length) {
      msg += `\n\nTeléfonos repetidos dentro del mismo Excel (fusionados en 1 cliente): ${fusionadosDesdeExcel.length}.`;
    }

    alert(msg);
    cargarClientes();
  };

  reader.readAsArrayBuffer(file);
}

// =========================================================
// 11) EVENTOS DOM
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  // Tema
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);

  const btnTheme = document.getElementById("btnToggleTheme");
  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      applyTheme(next);
    });
  }

  // Selector de usuario actual
  const selUsuario = document.getElementById("usuarioActual");
  if (selUsuario) {
    if (usuarioActual && allowedUsers.includes(usuarioActual)) {
      selUsuario.value = usuarioActual;
    } else {
      usuarioActual = "";
      localStorage.removeItem("usuarioActual");
      selUsuario.value = "";
    }

    selUsuario.addEventListener("change", () => {
      const value = selUsuario.value || "";
      if (value && !allowedUsers.includes(value)) {
        alert("Seleccioná uno de los usuarios habilitados.");
        selUsuario.value = "";
        usuarioActual = "";
        localStorage.removeItem("usuarioActual");
      } else {
        usuarioActual = value;
        localStorage.setItem("usuarioActual", usuarioActual);
      }
    });
  }

  // Guardar / editar
  document
    .getElementById("formCliente")
    .addEventListener("submit", guardarCliente);

  // Cancelar edición
  document
    .getElementById("btnCancelarEdicion")
    .addEventListener("click", resetFormulario);

  // Filtros
  document
    .getElementById("btnAplicarFiltros")
    .addEventListener("click", cargarClientes);

  ["filtroNombre", "filtroTelefono"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        cargarClientes();
      }
    });
  });

  // Excel: descargar modelo
  document
    .getElementById("btnDescargarModelo")
    .addEventListener("click", descargarModeloExcel);

  // Excel: exportar
  const btnExportar = document.getElementById("btnExportarExcel");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarExcel);
  }

  // Excel: importar
  const inputExcel = document.getElementById("inputExcel");
  document
    .getElementById("btnImportarExcel")
    .addEventListener("click", () => inputExcel.click());

  inputExcel.addEventListener("change", () => {
    if (inputExcel.files.length === 1) {
      importarDesdeExcel(inputExcel.files[0]);
      inputExcel.value = "";
    }
  });

  // Delegación de eventos para tarjetas
  document.getElementById("lista").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "editar") {
      editarCliente(id);
    } else if (action === "eliminar") {
      eliminarCliente(id);
    } else if (action === "actividad") {
      agregarActividadDesdeCard(id);
    } else if (action === "toggle-historial") {
      const card = btn.closest(".card");
      if (!card) return;
      const listaHist = card.querySelector(".historial-list");
      if (!listaHist) return;
      const visible = listaHist.style.display !== "none";
      listaHist.style.display = visible ? "none" : "block";
      btn.textContent = visible ? "Ver historial" : "Ocultar historial";
    }
  });

  // Modal actividades
  document
    .getElementById("btnGuardarActividad")
    .addEventListener("click", guardarActividadDesdeModal);

  document
    .getElementById("btnCerrarActividad")
    .addEventListener("click", cerrarModalActividad);

  document
    .getElementById("actividadModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "actividadModal") cerrarModalActividad();
    });

  // Render agenda y carga inicial
  renderAgendaCalendario();
  cargarClientes();
});
