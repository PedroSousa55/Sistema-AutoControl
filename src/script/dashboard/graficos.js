let graficoMovimento = null;
let graficoPizza = null;

// Gráfico de entradas e saídas por horário
export function carregarGraficoMovimento(resumo) {
  const canvas = document.getElementById("Grafico_Movimento");

  if (!canvas) return;

  const labels = [
    "00h - 02h",
    "02h - 04h",
    "04h - 06h",
    "06h - 08h",
    "08h - 10h",
    "10h - 12h",
    "12h - 14h",
    "14h - 16h",
    "16h - 18h",
    "18h - 20h",
    "20h - 22h",
    "22h - 00h",
  ];

  const entradas = resumo.grafico.entradas;
  const saidas = resumo.grafico.saidas;

  if (graficoMovimento) {
    graficoMovimento.destroy();
  }

  graficoMovimento = new Chart(canvas, {
    type: "bar",

    data: {
      labels,

      datasets: [
        {
          label: "Entradas",
          data: entradas,
          backgroundColor: "#397BFF",
        },
        {
          label: "Saídas",
          data: saidas,
          backgroundColor: "#F45B69",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

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

  const dentro = Number(resumo.dentro);
  const disponiveis = Number(resumo.vagas_disponiveis);

  if (graficoPizza) {
    graficoPizza.destroy();
  }

  graficoPizza = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels: ["Ocupadas", "Disponíveis"],

      datasets: [
        {
          data: [dentro, disponiveis],
          backgroundColor: ["#397BFF", "#D9DDE5"],
          borderWidth: 0,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}
