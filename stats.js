// Misma config de Supabase
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabaseStats = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const THEME_KEY = "crm_theme";

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

// Estados “oficiales” en el orden que queremos mostrar
const ESTADOS_OFICIALES = [
  "1 - Cliente relevado",
  "2 - Local Visitado No Activo",
  "3 - Primer ingreso",
  "4 - Local Visitado Activo",
  "5 - Local completo",
];

// Colores a juego con los tags
const ESTADOS_COLORES = [
  "#b91c1c", // rojo
  "#c2410c", // naranja
  "#a16207", // amarillo amarronado
  "#1d4ed8", // azul
  "#15803d", // verde
];

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

  cargarEstadisticas();
});

async function cargarEstadisticas() {
  const { data: clientes, error } = await supabaseStats
    .from("clientes")
    .select("id, rubro, estado")
    .eq("activo", true);

  if (error) {
    console.error("Error cargando clientes para estadísticas:", error);
    alert("No se pudieron cargar las estadísticas.");
    return;
  }

  const rubrosCount = {};
  const estadosCount = {};

  (clientes || []).forEach((c) => {
    const rubro = c.rubro || "Sin definir";
    rubrosCount[rubro] = (rubrosCount[rubro] || 0) + 1;

    const estado = c.estado || "Sin estado";
    estadosCount[estado] = (estadosCount[estado] || 0) + 1;
  });

  dibujarRubros(rubrosCount, clientes.length);
  dibujarEstados(estadosCount, clientes.length);
}

function dibujarRubros(rubrosCount, totalClientes) {
  const ctx = document.getElementById("chartRubros").getContext("2d");

  const labels = Object.keys(rubrosCount);
  const data = labels.map((l) => rubrosCount[l]);

  const total = totalClientes || 0;

  const resumen = document.getElementById("resumenRubros");
  if (total === 0) {
    resumen.textContent = "No hay clientes activos cargados.";
  } else {
    const partes = labels.map((l) => {
      const cant = rubrosCount[l];
      const pct = ((cant / total) * 100).toFixed(1);
      return `${l}: ${cant} clientes (${pct}%)`;
    });
    resumen.textContent = partes.join(" · ");
  }

  // Colores suaves random-ish
  const colors = labels.map((_, i) => {
    const palette = [
      "#38bdf8",
      "#22c55e",
      "#facc15",
      "#f97316",
      "#a855f7",
      "#f97373",
    ];
    return palette[i % palette.length];
  });

  new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: "#6b7280",
          },
        },
      },
    },
  });
}

function dibujarEstados(estadosCount, totalClientes) {
  const ctx = document.getElementById("chartEstados").getContext("2d");

  // Aseguramos que los estados oficiales salgan en orden fijo
  const labels = [];
  const data = [];
  const bgColors = [];

  ESTADOS_OFICIALES.forEach((estado, idx) => {
    labels.push(estado);
    data.push(estadosCount[estado] || 0);
    bgColors.push(ESTADOS_COLORES[idx]);
  });

  // Si hubiera estados viejos o raros, los sumamos aparte como “Otros”
  const otrosEstados = Object.keys(estadosCount).filter(
    (e) => !ESTADOS_OFICIALES.includes(e)
  );
  let otrosTotal = 0;
  otrosEstados.forEach((e) => {
    otrosTotal += estadosCount[e];
  });
  if (otrosTotal > 0) {
    labels.push("Otros estados");
    data.push(otrosTotal);
    bgColors.push("#6b7280");
  }

  const total = totalClientes || 0;
  const resumen = document.getElementById("resumenEstados");

  if (total === 0) {
    resumen.textContent = "No hay clientes activos cargados.";
  } else {
    const partes = labels.map((l, idx) => {
      const cant = data[idx];
      if (!cant) return null;
      const pct = ((cant / total) * 100).toFixed(1);
      return `${l}: ${cant} clientes (${pct}%)`;
    }).filter(Boolean);

    resumen.textContent = partes.join(" · ");
  }

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: bgColors,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#6b7280",
            font: { size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#6b7280",
            precision: 0,
          },
        },
      },
    },
  });
}
