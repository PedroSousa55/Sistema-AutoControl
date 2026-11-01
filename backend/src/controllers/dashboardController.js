import modelDashboard from "../models/dashboardModel.js";

function montarFaixas(linhas) {
  const faixas = new Array(12).fill(0);

  linhas.forEach((linha) => {
    faixas[Number(linha.faixa)] = Number(linha.total);
  });

  return faixas;
}

class DashboardController {
  static async resumo(req, res) {
    try {
      const capacidade = Number(process.env.CAPACIDADE_TOTAL);

      const dentro = await modelDashboard.contarDentro();
      const entradasHoje = await modelDashboard.contarEntradasDia(0);
      const entradasOntem = await modelDashboard.contarEntradasDia(1);
      const saidasHoje = await modelDashboard.contarSaidasDia(0);
      const saidasOntem = await modelDashboard.contarSaidasDia(1);
      const faixasEntradas = await modelDashboard.entradasPorFaixa();
      const faixasSaidas = await modelDashboard.saidasPorFaixa();

      return res.status(200).json({
        dentro,
        capacidade,
        vagas_disponiveis: Math.max(capacidade - dentro, 0),
        entradas_hoje: entradasHoje,
        entradas_ontem: entradasOntem,
        saidas_hoje: saidasHoje,
        saidas_ontem: saidasOntem,
        grafico: {
          entradas: montarFaixas(faixasEntradas),
          saidas: montarFaixas(faixasSaidas),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro de servidor!" });
    }
  }
}

export default DashboardController;
