import conect from "../config/database.js";

// quantos veículos estão dentro agora (saída ainda em aberto)
async function contarDentro() {
  try {
    const sql = `
      SELECT COUNT(*) AS total
      FROM movimentacoes
      WHERE data_saida IS NULL;
    `;
    const [dados] = await conect.query(sql);
    return dados[0].total;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// entradas de um dia (0 = hoje, 1 = ontem)
async function contarEntradasDia(diasAtras) {
  try {
    const sql = `
      SELECT COUNT(*) AS total
      FROM movimentacoes
      WHERE DATE(data_entrada) = CURDATE() - INTERVAL ? DAY;
    `;
    const [dados] = await conect.query(sql, [diasAtras]);
    return dados[0].total;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// saídas de um dia (0 = hoje, 1 = ontem)
async function contarSaidasDia(diasAtras) {
  try {
    const sql = `
      SELECT COUNT(*) AS total
      FROM movimentacoes
      WHERE DATE(data_saida) = CURDATE() - INTERVAL ? DAY;
    `;
    const [dados] = await conect.query(sql, [diasAtras]);
    return dados[0].total;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// entradas de hoje por faixa de 2 horas (0 = 00h-02h ... 11 = 22h-24h)
async function entradasPorFaixa() {
  try {
    const sql = `
      SELECT HOUR(data_entrada) DIV 2 AS faixa, COUNT(*) AS total
      FROM movimentacoes
      WHERE DATE(data_entrada) = CURDATE()
      GROUP BY faixa;
    `;
    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// saídas de hoje por faixa de 2 horas
async function saidasPorFaixa() {
  try {
    const sql = `
      SELECT HOUR(data_saida) DIV 2 AS faixa, COUNT(*) AS total
      FROM movimentacoes
      WHERE DATE(data_saida) = CURDATE()
      GROUP BY faixa;
    `;
    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export default {
  contarDentro,
  contarEntradasDia,
  contarSaidasDia,
  entradasPorFaixa,
  saidasPorFaixa,
};
