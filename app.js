// ---------------------------------------------------------
// 1) Conexión a Supabase (solo ANON KEY)
// ---------------------------------------------------------
const SUPABASE_URL = "https://eucsnyavekdejiezofri.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3NueWF2ZWtkZWppZXpvZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTI2OTcsImV4cCI6MjA3OTEyODY5N30.PWSBOHTrQF28J_4wtwWCarHh7vDgXAV6XpsH2ek-8uk";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------
// 2) Registrar actividad en historial
// ---------------------------------------------------------
async function agregarActividad(clienteId, descripcion) {
  await supabaseClient.from("actividades").insert([
    {
      cliente_id: clienteId,
      descripcion,
    },
  ]);
}

// ---------------------------------------------------------
// 3) Obtener historial por cliente
// ---------------------------------------------------------
async function obtenerHistorial(clienteId) {
  const { data } = await supabaseClient
    .from("actividades")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false });

  return data || [];
}

// ---------------------------------------------------------
// 4) Cargar clientes
// ---------------------------------------------------------
async function cargarClientes() {
  const lista = document.getElementById("lista");
  const contador = document.getElementById("contador");

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nombre, telefono, rubro, estado, fecha_proximo_contacto, notas")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error cargando clientes:", error);
    return;
  }

  lista.innerHTML = "";
  contador.innerText = `(${data.length})`;

  for (const c of data) {
    const historial = await obtenerHistorial(c.id);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="top">
        <div class="info">
          <h3>${c.nombre}</h3>
          <p><strong>Teléfono:</strong> ${c.telefono || "-"}</p>
          <p><strong>Rubro:</strong> ${c.rubro || "-"}</p>
          <p><strong>Estado:</strong> ${c.estado}</p>
          <p><strong>Próximo contacto:</strong> ${c.fecha_proximo_contacto || "-"}</p>
          <p><strong>Notas:</strong> ${c.notas || "-"}</p>
        </div>

        <div class="actions">
          <button class="edit" data-id="${c.id}">Editar</button>
          <button class="delete" data-id="${c.id}">Eliminar</button>
        </div>
      </div>

      <div class="historial">
        <h4>Historial</h4>
        ${historial
          .map(
            h => `
          <div>${h.fecha.substring(0, 16)} — ${h.descripcion}</div>`
          )
          .join("")}
        <button class="addAct" data-id="${c.id}">Agregar actividad</button>
      </div>
    `;

    lista.appendChild(card);
  }

  activarBotones();
}

// ---------------------------------------------------------
// 5) Guardar cliente (INSERT / UPDATE)
// ---------------------------------------------------------
async function guardarCliente(e) {
  e.preventDefault();

  const id = document.getElementById("clienteId").value;

  const payload = {
    nombre: document.getElementById("nombre").value,
    telefono: document.getElementById("telefono").value,
    rubro: document.getElementById("rubro").value,
    estado: document.getElementById("estado").value,
    fecha_proximo_contacto: document.getElementById("fecha_proximo_contacto").value,
    notas: document.getElementById("notas").value,
  };

  let error;
  let newId = id;

  if (id) {
    const res = await supabaseClient
      .from("clientes")
      .update(payload)
      .eq("id", id);

    error = res.error;
  } else {
    const res = await supabaseClient.from("clientes").insert([payload]).select("id");
    error = res.error;
    newId = res.data?.[0]?.id;
  }

  if (error) {
    console.error("Error guardando cliente:", error);
    alert("No se pudo guardar el cliente");
    return;
  }

  await agregarActividad(newId, id ? "Cliente actualizado" : "Cliente creado");

  document.getElementById("clienteForm").reset();
  document.getElementById("clienteId").value = "";

  cargarClientes();
}

// ---------------------------------------------------------
// 6) Editar cliente
// ---------------------------------------------------------
async function editarCliente(id) {
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return;

  document.getElementById("clienteId").value = data.id;
  document.getElementById("nombre").value = data.nombre;
  document.getElementById("telefono").value = data.telefono || "";
  document.getElementById("rubro").value = data.rubro || "";
  document.getElementById("estado").value = data.estado;
  document.getElementById("fecha_proximo_contacto").value = data.fecha_proximo_contacto || "";
  document.getElementById("notas").value = data.notas || "";
}

// ---------------------------------------------------------
// 7) Eliminar
// ---------------------------------------------------------
async function eliminarCliente(id) {
  if (!confirm("¿Eliminar cliente?")) return;

  const { error } = await supabaseClient.from("clientes").delete().eq("id", id);

  if (error) {
    console.error("Error eliminando:", error);
    alert("No se pudo eliminar");
    return;
  }

  await agregarActividad(id, "Cliente eliminado");

  cargarClientes();
}

// ---------------------------------------------------------
// 8) Activar botones
// ---------------------------------------------------------
function activarBotones() {
  document.querySelectorAll(".edit").forEach(btn =>
    btn.addEventListener("click", () => editarCliente(btn.dataset.id))
  );

  document.querySelectorAll(".delete").forEach(btn =>
    btn.addEventListener("click", () => eliminarCliente(btn.dataset.id))
  );

  document.querySelectorAll(".addAct").forEach(btn =>
    btn.addEventListener("click", async () => {
      const texto = prompt("Descripción de la actividad:");
      if (!texto) return;
      await agregarActividad(btn.dataset.id, texto);
      cargarClientes();
    })
  );
}

// ---------------------------------------------------------
// 9) Descargar modelo Excel
// ---------------------------------------------------------
function descargarModeloExcel() {
  const wb = XLSX.utils.book_new();

  const data = [
    ["nombre", "telefono", "rubro", "estado", "fecha_proximo_contacto", "notas"],
    ["Juan Pérez", "1133445566", "Kiosco", "Nuevo", "2025-01-10", "Cliente potencial"],
    ["María", "1133557799", "Vinoteca", "En seguimiento", "2025-02-01", "Enviar propuesta"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "modelo");

  XLSX.writeFile(wb, "modelo_clientes.xlsx");
}

// ---------------------------------------------------------
// 10) Importar desde Excel
// ---------------------------------------------------------
function importarDesdeExcel(file) {
  const reader = new FileReader();

  reader.onload = async e => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) return alert("El archivo está vacío.");

    const payloads = rows.map(r => ({
      nombre: r.nombre || null,
      telefono: r.telefono || null,
      rubro: r.rubro || "Sin definir",
      estado: r.estado || "Nuevo",
      fecha_proximo_contacto: r.fecha_proximo_contacto || null,
      notas: r.notas || null,
    }));

    const { error } = await supabaseClient.from("clientes").insert(payloads);

    if (error) {
      console.error("Error importando Excel:", error);
      alert("Error importando el archivo.");
      return;
    }

    alert("Clientes importados correctamente.");
    cargarClientes();
  };

  reader.readAsArrayBuffer(file);
}

// ---------------------------------------------------------
// 11) Inicialización
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("clienteForm").addEventListener("submit", guardarCliente);
  document.getElementById("btnCancel").addEventListener("click", () => document.getElementById("clienteForm").reset());
  document.getElementById("btnRefresh").addEventListener("click", cargarClientes);

  document.getElementById("btnDescargarModelo").addEventListener("click", descargarModeloExcel);

  const inputExcel = document.getElementById("inputExcel");
  document.getElementById("btnImportarExcel").addEventListener("click", () => inputExcel.click());
  inputExcel.addEventListener("change", () => {
    if (inputExcel.files.length === 1) {
      importarDesdeExcel(inputExcel.files[0]);
      inputExcel.value = "";
    }
  });

  cargarClientes();
});
