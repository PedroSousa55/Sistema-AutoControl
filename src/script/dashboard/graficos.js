let graficoMovimento = null;
let graficoPizza = null;

// Cores do padrão visual antigo
const CORES = {
  entradas: "#16a77b",
  saidas: "#ed3861",
  ocupadas: "#F64468",
  disponiveis: "#16a77b",
};

// Gráfico de entradas e saídas por horário
export function carregarGraficoMovimento(resumo) {
  const canvas = document.getElementById("Grafico_Movimento");

  if (!canvas || !resumo?.grafico) return;

  const labels = [
    "02h",
    "04h",
    "06h",
    "08h",
    "10h",
    "12h",
    "14h",
    "16h",
    "18h",
    "20h",
    "22h",
    "24h",
  ];

  const entradas = resumo.grafico.entradas;
  const saidas = resumo.grafico.saidas;

  if (graficoMovimento) {
    graficoMovimento.destroy();
  }

  graficoMovimento = new Chart(canvas, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Entradas",
          data: entradas,
          borderColor: CORES.entradas,
          backgroundColor: CORES.entradas,
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: "Saídas",
          data: saidas,
          borderColor: CORES.saidas,
          backgroundColor: CORES.saidas,
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: "index",
      },

      plugins: {
        legend: {
          position: "top",
          align: "end",
        },
      },

      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
}

// Gráfico de ocupação do estacionamento
export function carregarGraficoPizza(resumo) {
  const canvas = document.getElementById("Grafico_Pizza");

  if (!canvas) return;

  const dentro = Number(resumo.dentro) || 0;
  const disponiveis = Number(resumo.vagas_disponiveis) || 0;

  if (graficoPizza) {
    graficoPizza.destroy();
  }

  graficoPizza = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels: ["Livre", "Ocupado"],

      datasets: [
        {
          data: [disponiveis, dentro],
          backgroundColor: [CORES.disponiveis, CORES.ocupadas],
          borderWidth: 0,
          hoverOffset: 5,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",

      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });

  // Atualiza o total exibido no centro da rosca
  const total = document.querySelector(".total-veiculos");

  if (total) {
    total.textContent = dentro;
  }

  // Atualiza os valores da legenda existente no HTML
  const valoresLegenda = document.querySelectorAll(".legenda-status strong");

  if (valoresLegenda.length >= 2) {
    valoresLegenda[0].textContent = dentro;
    valoresLegenda[1].textContent = disponiveis;
  }
}
