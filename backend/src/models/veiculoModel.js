import conect from "../config/database.js";

async function listVeiculos() {
  try {
    const sql = `
        SELECT * FROM veiculos;
        `;
    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function veiculoRegister(placa, tipo) {
  try {
    const sql = `
        INSERT INTO veiculos (placa, tipo) VALUES
        (?, ?);
        `;
    const [dados] = await conect.query(sql, [placa, tipo]);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function findVeiculoPlaca(placa) {
  try {
    const sql = `
        SELECT * FROM veiculos
        WHERE placa = ?;
        `;
    const [dados] = await conect.query(sql, [placa]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Busca veículo pelo ID
async function findVeiculoId(id) {
  try {
    const sql = `
      SELECT *
      FROM veiculos
      WHERE id = ?;
    `;

    const [dados] = await conect.query(sql, [id]);

    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Busca veículo usando a conexão da transação
async function findVeiculoPlacaTransacao(conexao, placa) {
  const sql = `
    SELECT *
    FROM veiculos
    WHERE placa = ?;
  `;

  const [dados] = await conexao.query(sql, [placa]);
  return dados[0];
}

// Cadastra veículo usando a conexão da transação
async function veiculoRegisterTransacao(conexao, placa, tipo) {
  const sql = `
    INSERT INTO veiculos (placa, tipo)
    VALUES (?, ?);
  `;

  const [dados] = await conexao.query(sql, [placa, tipo]);
  return dados;
}

// Exclui veículo usando a conexão da transação
async function veiculoDeleteTransacao(conexao, id) {
  const sql = `
    DELETE FROM veiculos
    WHERE id = ?;
  `;

  const [dados] = await conexao.query(sql, [id]);
  return dados;
}

// Edita veículo
async function veiculoEdit(id, placa, tipo) {
  try {
    const sql = `
      UPDATE veiculos
      SET placa = ?, tipo = ?
      WHERE id = ?;
    `;

    const [dados] = await conect.query(sql, [placa, tipo, id]);

    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Exclui veículo
async function veiculoDelete(id) {
  try {
    // Verifica se existem movimentações vinculadas
    const sqlVerificar = `
      SELECT COUNT(*) AS total
      FROM movimentacoes
      WHERE veiculo_id = ?;
    `;

    const [resultado] = await conect.query(sqlVerificar, [id]);

    if (resultado[0].total > 0) {
      return {
        bloqueado: true,
      };
    }

    const sqlExcluir = `
      DELETE FROM veiculos
      WHERE id = ?;
    `;

    const [dados] = await conect.query(sqlExcluir, [id]);
    
    return {
      bloqueado: false,
      excluido: dados.affectedRows > 0,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export default {
  listVeiculos,
  veiculoRegister,
  findVeiculoPlaca,
  findVeiculoId,
  veiculoEdit,
  veiculoDelete,
  findVeiculoPlacaTransacao,
  veiculoRegisterTransacao,
  veiculoDeleteTransacao,
};
