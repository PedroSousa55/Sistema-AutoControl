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

// fazer edit veiculo e delete veiculo
async function veiculoEdit(id) {}

async function veiculoDelete(id) {}

export default {
  listVeiculos,
  veiculoRegister,
  findVeiculoPlaca,
  veiculoEdit,
  veiculoDelete,
  //essas consultas de transição é para garanti que varias operações no banco de dados
  //sejam concluidas juntas.
  /* 
  Se tudo der certo: o MySQL confirma todas as alterações (COMMIT).
  Se alguma etapa der erro: o MySQL desfaz as alterações realizadas (ROLLBACK).
  */
  findVeiculoPlacaTransacao,
  veiculoRegisterTransacao,
  veiculoDeleteTransacao,
};
