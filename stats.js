// =========================================================
// 1) Conexión a Supabase
// =========================================================
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tema consistente con el CRM
const THEME_KEY = "crm_theme";

// Config de estados (mismo texto que usás en el CRM / BD)
const ESTADOS_CONFIG = [
  {
    value: "1 - Cliente relevado",
    label: "1 - Cliente relevado",
    color: "#ef4444", // rojo
  },
  {
    value: "2 - Local Visitado No Activo",
    label: "2 - Local Visitado No Activo",
    color: "#f97316", // naranja
  },
  {
    value: "3 - Primer Ingreso",
    label: "3 - Primer Ingreso",
    color: "#eab308", // amarillo
  },
  {
    value: "4 - Local Creado",
    label: "4 - Local Creado",
    color: "#3b82f6", // azul medio
  },
  {
    value: "5 - Local Visitado Activo",
    label: "5 - Local Visitado Activo",
    color: "#0ea5e9", // celeste
  },
  {
    value: "6 - Local No Interesado",
    label: "6 - Local No Interesado",
    color: "#6b7280", // gris
  },
];

// =========================================================
// 2) Utilidades de tema
// =========================================================
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);

  const btn = document.getElementById("btnToggleTheme");
  if (btn) {
    btn.textContent = theme === "dark" ? "Modo día ☀️" : "Modo noche 🌙";
  }
}

// =========================================================
// 3) Carga de estadísticas
// =========================================================
async function cargarEstadisticas() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr = hoy.toISOString().split("T")[0];

  // Rango para actividad reciente
  const hace7 = new Date(hoy);
  hace7.setDate(hoy.getDate() - 7);
  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 30);

  // ==========================
  // 3.1 Clientes activos
  // ==========================
  const { data: clientes, error } = await supabaseClient
    .from("clientes")
    .select(
      "id, rubro, estado, fecha_proximo_contacto, responsable, ultima_actividad"
    )
    .eq("activo", true);

  if (error) {
    console.error("Error cargando estadísticas de clientes:", error);
    alert("No se pudieron cargar las estadísticas.");
    return;
  }

  const lista = clientes || [];
  const totalClientes = lista.length;

  // Mapas de conteo
  const rubrosCount = new Map();
  const estadosCount = new Map();
  const responsablesCount = new Map();

  // Agenda
  let conFecha = 0;
  let vencidos = 0;
  let sinFecha = 0;
  let proxHoy = 0;
  let prox7 = 0;
  let proxFuturo = 0;

  // Actividad por cliente (según ultima_actividad)
  let clientesActivos30 = 0;
  let clientesDormidos30 = 0;
  let clientesSinHistorial = 0;

  // Para comparar fechas de próximo contacto
  const dentro7 = new Date(hoy);
  dentro7.setDate(hoy.getDate() + 7);
  const dentro7Str = dentro7.toISOString().split("T")[0];

  for (const c of lista) {
    // ---------- Rubro ----------
    const rubroKey = (c.rubro || "Sin definir").trim() || "Sin definir";
    rubrosCount.set(rubroKey, (rubrosCount.get(rubroKey) || 0) + 1);

    // ---------- Estado ----------
    const estadoKey = c.estado || "Sin estado";
    estadosCount.set(estadoKey, (estadosCount.get(estadoKey) || 0) + 1);

    // ---------- Responsable ----------
    const respKey = c.responsable || "Sin responsable";
    responsablesCount.set(
      respKey,
      (responsablesCount.get(respKey) || 0) + 1
    );

    // ---------- Agenda ----------
    const fProx = c.fecha_proximo_contacto;
    if (fProx) {
      conFecha++;
      if (fProx < hoyStr) {
        vencidos++;
      } else {
        if (fProx === hoyStr) {
          proxHoy++;
        } else if (fProx <= dentro7Str) {
          // entre mañana y los próximos 7 días
          prox7++;
        } else {
          proxFuturo++;
        }
      }
    } else {
      sinFecha++;
    }

    // ---------- Actividad (dormidos / sin historial) ----------
    if (!c.ultima_actividad) {
      clientesSinHistorial++;
      clientesDormidos30++;
    } else {
      const ua = new Date(c.ultima_actividad);
      if (!Number.isNaN(ua.getTime()) && ua >= hace30) {
        clientesActivos30++;
      } else {
        clientesDormidos30++;
      }
    }
  }

  // ==========================
  // 3.2 Actividades (últimos 30 días)
  // ==========================
  let actividades7 = 0;
  let actividades30 = 0;
  const actividadesPorUsuario = new Map();

  const { data: actividades, error: errorAct } = await supabaseClient
    .from("actividades")
    .select("id, fecha, usuario, cliente_id")
    .gte("fecha", hace30.toISOString());

  if (errorAct) {
    console.error("Error cargando estadísticas de actividades:", errorAct);
    // No cortamos: simplemente dejamos las métricas de actividad en 0
  } else {
    for (const a of actividades || []) {
      const f = new Date(a.fecha);
      if (Number.isNaN(f.getTime())) continue;

      actividades30++;
      if (f >= hace7) {
        actividades7++;
      }

      const userKey = a.usuario || "Sin usuario";
      actividadesPorUsuario.set(
        userKey,
        (actividadesPorUsuario.get(userKey) || 0) + 1
      );
    }
  }

  // ==========================
  // 3.3 Actualizar tarjetas resumen
  // ==========================
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  // Tarjetas principales
  setText("statTotalClientes", totalClientes);
  setText("statConFecha", conFecha);
  setText("statVencidos", vencidos);
  setText("statSinFecha", sinFecha);

  // Resumen agenda texto
  setText("statConFechaText", conFecha);
  setText("statVencidosText", vencidos);
  setText("statSinFechaText", sinFecha);

  // Detalle de agenda por plazo
  setText("statProxHoy", proxHoy);
  setText("statProx7", prox7);
  setText("statProxFuturo", proxFuturo);

  // Actividad reciente
  setText("statAct7", actividades7);
  setText("statAct30", actividades30);
  setText("statClientesActivos30", clientesActivos30);
  setText("statClientesDormidos30", clientesDormidos30);
  setText("statSinHistorial", clientesSinHistorial);

  // ==========================
  // 3.4 Dibujar gráficos / listas
  // ==========================
  dibujarChartRubros(rubrosCount);
  dibujarChartEstados(estadosCount);
  dibujarChartResponsables(responsablesCount);
  renderListaActividadUsuarios(actividadesPorUsuario);
}

// =========================================================
// 4) Gráfico de Rubros (torta)
// =========================================================
function dibujarChartRubros(rubrosCount) {
  const canvas = document.getElementById("chartRubros");
  if (!canvas) return;

  const labels = Array.from(rubrosCount.keys());
  const data = Array.from(rubrosCount.values());

  // Paleta simple, se repite si hay muchos rubros
  const baseColors = [
    "#3b82f6",
    "#22c55e",
    "#f97316",
    "#eab308",
    "#a855f7",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#f43f5e",
    "#6b7280",
  ];
  const backgroundColor = labels.map((_, i) => baseColors[i % baseColors.length]);

  new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || "";
              const value = ctx.raw || 0;
              const total = data.reduce((acc, n) => acc + n, 0) || 1;
              const perc = ((value * 100) / total).toFixed(1);
              return `${label}: ${value} (${perc}%)`;
            },
          },
        },
      },
    },
  });

  // Lista textual
  const listaRubros = document.getElementById("listaRubros");
  if (listaRubros) {
    listaRubros.innerHTML = "";
    const total = data.reduce((acc, n) => acc + n, 0) || 1;

    labels.forEach((label, idx) => {
      const value = data[idx];
      const perc = ((value * 100) / total).toFixed(1);

      const li = document.createElement("li");
      li.innerHTML = `<span class="stats-list-label">${label}</span>
        <span class="stats-list-value">${value} (${perc}%)</span>`;
      listaRubros.appendChild(li);
    });
  }
}

// =========================================================
// 5) Gráfico de Estados (barras horizontales)
// =========================================================
function dibujarChartEstados(estadosCount) {
  const canvas = document.getElementById("chartEstados");
  if (!canvas) return;

  // Respetar el orden configurado de estados
  const labels = ESTADOS_CONFIG.map((e) => e.label);
  const data = ESTADOS_CONFIG.map((e) => estadosCount.get(e.value) || 0);
  const backgroundColor = ESTADOS_CONFIG.map((e) => e.color);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
        },
      ],
    },
    options: {
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.raw || 0;
              return `${value} cliente${value === 1 ? "" : "s"}`;
            },
          },
        },
      },
    },
  });

  // Lista textual
  const listaEstados = document.getElementById("listaEstados");
  if (listaEstados) {
    listaEstados.innerHTML = "";
    const total = data.reduce((acc, n) => acc + n, 0) || 1;

    labels.forEach((label, idx) => {
      const value = data[idx];
      const perc = ((value * 100) / total).toFixed(1);

      const li = document.createElement("li");
      li.innerHTML = `<span class="stats-list-label">${label}</span>
        <span class="stats-list-value">${value} (${perc}%)</span>`;
      listaEstados.appendChild(li);
    });
  }
}

// =========================================================
// 6) Gráfico de Responsables (barras verticales)
// =========================================================
function dibujarChartResponsables(responsablesCount) {
  const canvas = document.getElementById("chartResponsables");
  if (!canvas) return;

  const labels = Array.from(responsablesCount.keys());
  const data = Array.from(responsablesCount.values());

  if (!labels.length) {
    // Nada asignado todavía
    const listaResp = document.getElementById("listaResponsables");
    if (listaResp) {
      listaResp.innerHTML =
        "<li>No hay responsables asignados a clientes todavía.</li>";
    }
    return;
  }

  const baseColors = [
    "#6366f1",
    "#22c55e",
    "#f97316",
    "#eab308",
    "#a855f7",
    "#ec4899",
    "#0ea5e9",
    "#f43f5e",
    "#6b7280",
  ];
  const backgroundColor = labels.map((_, i) => baseColors[i % baseColors.length]);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.raw || 0;
              return `${value} cliente${value === 1 ? "" : "s"}`;
            },
          },
        },
      },
    },
  });

  // Lista textual
  const listaResp = document.getElementById("listaResponsables");
  if (listaResp) {
    listaResp.innerHTML = "";
    const total = data.reduce((acc, n) => acc + n, 0) || 1;

    labels.forEach((label, idx) => {
      const value = data[idx];
      const perc = ((value * 100) / total).toFixed(1);

      const li = document.createElement("li");
      li.innerHTML = `<span class="stats-list-label">${label}</span>
        <span class="stats-list-value">${value} (${perc}%)</span>`;
      listaResp.appendChild(li);
    });
  }
}

// =========================================================
// 7) Lista de actividades por usuario (últimos 30 días)
// =========================================================
function renderListaActividadUsuarios(actividadesPorUsuario) {
  const lista = document.getElementById("listaActividadUsuarios");
  if (!lista) return;

  lista.innerHTML = "";

  if (!actividadesPorUsuario || actividadesPorUsuario.size === 0) {
    const li = document.createElement("li");
    li.textContent = "No hay actividades registradas en los últimos 30 días.";
    lista.appendChild(li);
    return;
  }

  // Ordenar por cantidad desc
  const entries = Array.from(actividadesPorUsuario.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const totalActs = entries.reduce((acc, [, n]) => acc + n, 0) || 1;

  entries.forEach(([usuario, cant]) => {
    const perc = ((cant * 100) / totalActs).toFixed(1);
    const li = document.createElement("li");
    li.innerHTML = `<span class="stats-list-label">${usuario}</span>
      <span class="stats-list-value">${cant} (${perc}%)</span>`;
    lista.appendChild(li);
  });
}

// =========================================================
// 8) DOMContentLoaded
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  // Tema inicial
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

  // Cargar estadísticas
  cargarEstadisticas();
});
