// =========================================================
// 1) Conexión a Supabase (solo ANON KEY)
// =========================================================
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"; // solo la anon key

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Cache local de clientes para editar rápido
let clientesCache = [];

// Usuario que está usando la app (se toma del select y se guarda en localStorage)
let usuarioActual = localStorage.getItem("usuarioActual") || "";

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

// =========================================================
// 3) ACTIVIDADES (historial)
// =========================================================
async function agregarActividad(clienteId, descripcion) {
  if (!clienteId) return;

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
// 4) CARGA DE CLIENTES + HISTORIAL (optimizado)
// =========================================================
async function cargarClientes() {
  const listaDiv = document.getElementById("lista");
  listaDiv.innerHTML = "<p>Cargando...</p>";

  // Filtros
  const filtroNombre = document.getElementById("filtroNombre").value.trim();
  const filtroTelefono = document.getElementById("filtroTelefono").value.trim();
  const filtroRubro = document.getElementById("filtroRubro").value.trim();
  const filtroEstado = document.getElementById("filtroEstado").value;

  let query = supabaseClient
    .from("clientes")
    .select("id, nombre, telefono, rubro, estado, fecha_proximo_contacto, notas")
    .eq("activo", true)
    .order("id", { ascending: true });

  if (filtroEstado && filtroEstado !== "Todos") {
    query = query.eq("estado", filtroEstado);
  }

  if (filtroNombre) {
    query = query.ilike("nombre", `%${filtroNombre}%`);
  }

  if (filtroTelefono) {
    // búsqueda parcial por teléfono
    query = query.ilike("telefono", `%${filtroTelefono}%`);
  }

  if (filtroRubro) {
    query = query.ilike("rubro", `%${filtroRubro}%`);
  }

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
  (actividades || []).forEach((a) => {
    if (!actividadesPorCliente[a.cliente_id]) {
      actividadesPorCliente[a.cliente_id] = [];
    }
    actividadesPorCliente[a.cliente_id].push(a);
  });

  // Render de tarjetas
  listaDiv.innerHTML = "";
  clientesCache.forEach((cliente) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = cliente.id;

    const actividadesCliente = actividadesPorCliente[cliente.id] || [];

    // Tags de estado y rubro
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
    // UPDATE
    const { error: errUpdate } = await supabaseClient
      .from("clientes")
      .update(payload)
      .eq("id", id);

    error = errUpdate;
    if (!error) {
      await agregarActividad(id, "Cliente actualizado");
    }
  } else {
    // INSERT
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
  document.getElementById("estado").value = cliente.estado || "Nuevo";
  document.getElementById("fecha_proximo_contacto").value =
    cliente.fecha_proximo_contacto || "";
  document.getElementById("notas").value = cliente.notas || "";

  document.getElementById("tituloForm").textContent = "Editar cliente";
  document.getElementById("btnGuardar").textContent = "Actualizar";
}

// =========================================================
// 8) AGREGAR ACTIVIDAD MANUAL DESDE LA TARJETA
// =========================================================
async function agregarActividadDesdeCard(id) {
  if (!usuarioActual) {
    alert("Seleccioná un usuario arriba antes de registrar actividades.");
    return;
  }

  const texto = prompt("Descripción de la actividad:");
  if (!texto || !texto.trim()) return;

  await agregarActividad(id, texto.trim());
  cargarClientes();
}

// =========================================================
// 9) EXCEL: DESCARGAR MODELO
// =========================================================
function descargarModeloExcel() {
  const wb = XLSX.utils.book_new();

  // Estructura de columnas
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
// 10) EXCEL: IMPORTAR CLIENTES (corregido rubro/estado)
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
      if (!estado) estado = "Nuevo";

      const fecha_proximo_contacto =
        row["fecha_proximo_contacto (YYYY-MM-DD)"] || null;

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

    const { error } = await supabaseClient
      .from("clientes")
      .insert(registrosValidos);

    if (error) {
      console.error("Error importando desde Excel:", error);
      alert("Hubo un error al importar los clientes.\n\n" + error.message);
      return;
    }

    alert(`Se importaron ${registrosValidos.length} clientes.`);
    cargarClientes();
  };

  reader.readAsArrayBuffer(file);
}

// =========================================================
// 11) EVENTOS DOM
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
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

  // Buscar al presionar Enter
  ["filtroNombre", "filtroTelefono", "filtroRubro"].forEach((id) => {
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

  // Delegación de eventos para las tarjetas (editar / eliminar / actividad / toggle historial)
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

  // Selector de usuario actual
  const selUsuario = document.getElementById("usuarioActual");
  if (selUsuario) {
    if (usuarioActual) {
      selUsuario.value = usuarioActual;
    }

    selUsuario.addEventListener("change", () => {
      usuarioActual = selUsuario.value || "";
      localStorage.setItem("usuarioActual", usuarioActual);
    });
  }

  // Carga inicial
  cargarClientes();
});
